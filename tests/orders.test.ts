import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createOrder, getOrders } from "../src/lib/server/orders";
import {
  defaultAddress,
  defaultPreferences,
  emptyCart,
} from "../src/lib/domain";
import { addItem, quoteCart } from "../src/lib/cart";
import { DemoDeliveryProvider } from "../src/lib/delivery";
let directory: string;
const cart = addItem(emptyCart, {
  dishId: "gochujang",
  quantity: 1,
  modifierIds: [],
  instructions: "",
});
const address = { ...defaultAddress, street: "123 Sample Street" };
const total = quoteCart(cart).total;
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "moodfood-test-"));
  process.env.MOODFOOD_DATA_DIR = directory;
});
afterAll(async () => {
  delete process.env.MOODFOOD_DATA_DIR;
  await rm(directory, { recursive: true, force: true });
});
describe("private idempotent demo orders", () => {
  it("deduplicates simultaneous requests and rejects changed payloads", async () => {
    const orders = await Promise.all(
      Array.from({ length: 5 }, () =>
        createOrder(
          "guest:one",
          "one",
          cart,
          address,
          defaultPreferences,
          "",
          total,
        ),
      ),
    );
    expect(new Set(orders.map((o) => o.id)).size).toBe(1);
    expect(await getOrders("guest:one")).toHaveLength(1);
    await expect(
      createOrder(
        "guest:one",
        "one",
        cart,
        address,
        defaultPreferences,
        "changed",
        total,
      ),
    ).rejects.toThrow(/different details/);
  });
  it("never returns another guest or account’s private orders", async () => {
    expect(await getOrders("guest:two")).toEqual([]);
    expect(await getOrders("user:account")).toEqual([]);
    await createOrder(
      "user:account",
      "one",
      cart,
      address,
      defaultPreferences,
      "",
      total,
    );
    expect(await getOrders("user:account")).toHaveLength(1);
    expect(await getOrders("guest:one")).toHaveLength(1);
  });
  it("rejects stale price confirmations without creating an order", async () => {
    await expect(
      createOrder(
        "guest:three",
        "stale",
        cart,
        address,
        defaultPreferences,
        "",
        1,
      ),
    ).rejects.toThrow(/Prices changed/);
    expect(await getOrders("guest:three")).toHaveLength(0);
  });
  it("simulates independent preparation and delivery states", async () => {
    const order = (await getOrders("guest:one"))[0];
    const provider = new DemoDeliveryProvider();
    const start = Date.parse(order.createdAt);
    expect(provider.status(order, start + 30000).kitchenStatus).toBe(
      "preparing",
    );
    expect(provider.status(order, start + 30000).deliveryStatus).toBe(
      "unassigned",
    );
    expect(provider.status(order, start + 90000).deliveryStatus).toBe(
      "on_the_way",
    );
    expect(provider.status(order, start + 120000).deliveryStatus).toBe(
      "delivered",
    );
    expect(
      provider.status({ ...order, deliveryStatus: "failed" }, start + 120000)
        .deliveryStatus,
    ).toBe("failed");
  });
});
