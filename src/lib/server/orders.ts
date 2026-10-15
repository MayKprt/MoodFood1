import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { Address, Cart, Order, Preferences } from "../domain";
import { dishById } from "../data";
import { DemoPaymentProvider } from "../payments";
import { validateCart, itemPrice } from "../cart";
import { DemoDeliveryProvider } from "../delivery";
type Store = {
  orders: Order[];
  keys: Record<string, { id: string; fingerprint: string }>;
};
let queue: Promise<unknown> = Promise.resolve();
const filePath = () =>
  path.join(
    process.env.MOODFOOD_DATA_DIR || path.join(process.cwd(), ".data"),
    "orders.json",
  );
async function read(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(filePath(), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return { orders: [], keys: {} };
    throw e;
  }
}
export async function getOrders(ownerId: string): Promise<Order[]> {
  await queue;
  return (await read()).orders
    .filter((o) => o.ownerId === ownerId)
    .map((o) => new DemoDeliveryProvider().status(o));
}
export async function createOrder(
  ownerId: string,
  key: string,
  cart: Cart,
  address: Address,
  prefs: Preferences,
  instructions: string,
  acceptedTotal: number,
): Promise<Order> {
  const operation = queue.then(async () => {
    const data = await read();
    const scopedKey = `${ownerId}:${key}`;
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({ cart, address, prefs, instructions, acceptedTotal }),
      )
      .digest("hex");
    if (data.keys[scopedKey]) {
      if (data.keys[scopedKey].fingerprint !== fingerprint)
        throw new Error(
          "This checkout was already used with different details. Review the cart and try again.",
        );
      return data.orders.find((o) => o.id === data.keys[scopedKey].id)!;
    }
    const quote = validateCart(cart, address, prefs);
    if (quote.total !== acceptedTotal)
      throw new Error(
        "Prices changed. Refresh your cart and review the current total.",
      );
    await new DemoPaymentProvider().authorize({
      idempotencyKey: scopedKey,
      amountCents: quote.total,
      currency: "USD",
    });
    const lineSnapshots = cart.items.map((item) => {
      const dish = dishById(item.dishId)!;
      return {
        dishId: dish.id,
        name: dish.name,
        quantity: item.quantity,
        unitPrice: itemPrice(item),
        modifierNames: item.modifierIds.map(
          (id) => dish.modifiers.find((m) => m.id === id)!.name,
        ),
        ingredients: dish.ingredients,
        allergens: dish.allergens,
        instructions: item.instructions,
      };
    });
    const order: Order = {
      id: `MF-${randomUUID().slice(0, 8).toUpperCase()}`,
      ownerId,
      createdAt: new Date().toISOString(),
      items: cart.items,
      restaurantId: cart.restaurantId!,
      address,
      instructions,
      quote,
      demo: true,
      paymentStatus: "demo",
      lineSnapshots,
      kitchenStatus: "awaiting_confirmation",
      deliveryStatus: "unassigned",
    };
    data.orders.push(order);
    data.keys[scopedKey] = { id: order.id, fingerprint };
    await fs.mkdir(path.dirname(filePath()), { recursive: true });
    const tmp = `${filePath()}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data), { mode: 0o600 });
    await fs.rename(tmp, filePath());
    return order;
  });
  queue = operation.catch(() => undefined);
  return operation;
}
