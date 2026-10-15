import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
let db: PGlite;
const alice = "00000000-0000-0000-0000-000000000001",
  bob = "00000000-0000-0000-0000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;insert into auth.users values('${alice}'),('${bob}');`,
  );
  for (const file of [
    "supabase/migrations/001_moodfood.sql",
    "supabase/migrations/002_customer_state.sql",
    "supabase/seed.sql",
  ])
    await db.exec(await readFile(file, "utf8"));
});
afterAll(async () => {
  await db.close();
});
async function login(id: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
describe("PostgreSQL schema and authorization", () => {
  it("applies the migrations and seeds all 16 dishes idempotently", async () => {
    await db.exec(await readFile("supabase/seed.sql", "utf8"));
    const result = await db.query<{ count: number }>(
      "select count(*)::int count from public.dishes",
    );
    expect(result.rows[0].count).toBe(16);
  });
  it("keeps customer profiles, addresses, and saved dishes private", async () => {
    await login(alice);
    await db.exec(
      `insert into customer_profiles(customer_id) values('${alice}');insert into addresses(customer_id,street,city,postal_code) values('${alice}','123 Sample','Brooklyn','11201');insert into saved_dishes(customer_id,dish_id) values('${alice}','ramen');`,
    );
    await login(bob);
    expect((await db.query("select * from customer_profiles")).rows).toEqual(
      [],
    );
    expect((await db.query("select * from addresses")).rows).toEqual([]);
    expect((await db.query("select * from saved_dishes")).rows).toEqual([]);
    await expect(
      db.exec(`insert into saved_dishes values('${alice}','burger',now())`),
    ).rejects.toThrow(/row-level security/);
    await login(alice);
    expect((await db.query("select * from saved_dishes")).rows).toHaveLength(1);
  });
  it("syncs only the authenticated customer’s state in one transaction", async () => {
    await login(bob);
    const state = {
      preferences: {
        diets: ["Vegetarian"],
        allergies: ["sesame"],
        disliked: "mushroom",
        cuisines: ["Italian"],
        budget: 20,
        notifications: false,
      },
      address: {
        street: "456 Demo Lane",
        apartment: "2",
        city: "Brooklyn",
        zip: "11201",
      },
      saved: ["rigatoni", "burger"],
    };
    await db.query("select save_customer_state($1::jsonb)", [
      JSON.stringify(state),
    ]);
    expect((await db.query("select * from saved_dishes")).rows).toHaveLength(2);
    const profile = (
      await db.query<{ customer_id: string; budget_cents: number }>(
        "select * from customer_profiles",
      )
    ).rows[0];
    expect(profile.customer_id).toBe(bob);
    expect(profile.budget_cents).toBe(2000);
    await login(alice);
    expect((await db.query("select * from saved_dishes")).rows).toHaveLength(1);
  });
  it("enforces cart ownership and the single-kitchen rule at the database boundary", async () => {
    await login(alice);
    const cart = (
      await db.query<{ id: string }>(
        `insert into carts(customer_id,restaurant_id) values('${alice}','seoul') returning id`,
      )
    ).rows[0];
    await db.exec(
      `insert into cart_items(cart_id,dish_id,quantity) values('${cart.id}','gochujang',1)`,
    );
    await expect(
      db.exec(
        `insert into cart_items(cart_id,dish_id,quantity) values('${cart.id}','ramen',1)`,
      ),
    ).rejects.toThrow(/row-level security/);
    await login(bob);
    expect((await db.query("select * from cart_items")).rows).toEqual([]);
  });
  it("hides merchant internals and prevents customer financial writes", async () => {
    await login(alice);
    await expect(db.query("select * from dish_inventory")).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query("select * from restaurant_members")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.exec(`select reserve_order_inventory(gen_random_uuid())`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec(`insert into orders(customer_id) values('${alice}')`),
    ).rejects.toThrow(/permission denied/);
  });
});
describe("future merchant inventory and order privacy", () => {
  it("isolates orders and atomically reserves stock only once for duplicate processing", async () => {
    await db.exec("reset role");
    const first = (
      await db.query<{ id: string }>(
        `insert into orders(customer_id,restaurant_id,idempotency_key,request_fingerprint,address_snapshot,subtotal_cents,delivery_fee_cents,service_fee_cents,tax_cents,total_cents) values('${alice}','seoul',gen_random_uuid(),'a','{}',1600,0,0,0,1600) returning id`,
      )
    ).rows[0].id;
    const second = (
      await db.query<{ id: string }>(
        `insert into orders(customer_id,restaurant_id,idempotency_key,request_fingerprint,address_snapshot,subtotal_cents,delivery_fee_cents,service_fee_cents,tax_cents,total_cents) values('${bob}','seoul',gen_random_uuid(),'b','{}',1600,0,0,0,1600) returning id`,
      )
    ).rows[0].id;
    for (const id of [first, second])
      await db.exec(
        `insert into order_items(order_id,dish_id,dish_name_snapshot,unit_price_cents,quantity,ingredients_snapshot) values('${id}','gochujang','Chicken',1600,1,'[]');`,
      );
    await db.exec(
      `update dish_inventory set tracked=true,remaining=1,reserved=0 where dish_id='gochujang';`,
    );
    const result = await db.query<{ result: string }>(
      "select reserve_order_inventory($1) result",
      [first],
    );
    expect(result.rows[0].result).toBe("accepted");
    await db.query("select reserve_order_inventory($1)", [first]);
    expect(
      (
        await db.query<{ reserved: number }>(
          "select reserved from dish_inventory where dish_id='gochujang'",
        )
      ).rows[0].reserved,
    ).toBe(1);
    expect(
      (
        await db.query<{ result: string }>(
          "select reserve_order_inventory($1) result",
          [second],
        )
      ).rows[0].result,
    ).toBe("needs_attention");
    await login(alice);
    expect((await db.query("select * from orders")).rows).toHaveLength(1);
    expect((await db.query("select * from order_items")).rows).toHaveLength(1);
    await login(bob);
    expect((await db.query("select * from orders")).rows).toHaveLength(1);
  });
});
