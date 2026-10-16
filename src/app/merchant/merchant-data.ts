import { z } from "zod";

export const STORAGE_KEY = "moodfood-merchant-preview";
export const dishSchema = z.object({
  id: z.string().default(""),
  name: z.string(),
  previousNames: z.array(z.string()).default([]),
  price: z.number().nonnegative(),
  category: z.string().default("Bowls"),
  available: z.boolean(),
  photo: z.number().int().min(0).max(3).default(0),
  trackQuantity: z.boolean().default(false),
  quantity: z.number().int().nonnegative().default(0),
  schedule: z.boolean().default(false),
  from: z.string().default("09:00"),
  until: z.string().default("21:00"),
  modifiers: z.string().default(""),
  attributes: z.string().default(""),
});
export type MenuDish = z.infer<typeof dishSchema>;
const orderSchema = z.object({
  id: z.string(),
  customer: z.string(),
  dish: z.string(),
  total: z.number(),
  status: z.enum([
    "New",
    "Needs Attention",
    "Preparing",
    "Ready",
    "Completed",
    "Cancelled",
  ]),
  time: z.string(),
  minutes: z.number().default(20),
  problem: z.string().default(""),
});
export type Order = z.infer<typeof orderSchema>;
const notificationSchema = z.object({
  orders: z.boolean().default(true),
  attention: z.boolean().default(true),
  stock: z.boolean().default(true),
  delivery: z.boolean().default(false),
  sound: z.boolean().default(true),
  volume: z.number().min(0).max(100).default(60),
  muted: z.boolean().default(false),
});
export type Notifications = z.infer<typeof notificationSchema>;
const settingsSchema = z.object({
  name: z.string(),
  email: z.string(),
  open: z.boolean(),
  mode: z.enum(["Open", "Busy", "Paused"]).optional(),
  busyMinutes: z.number().int().min(5).max(60).default(10),
  notifications: notificationSchema.default(() => notificationSchema.parse({})),
  onboardingStep: z.number().int().min(0).max(3).default(0),
  onboardingDone: z.boolean().default(false),
});
export type MerchantSettings = z.infer<typeof settingsSchema>;
const stateSchema = z.object({
  menu: z.array(dishSchema),
  orders: z.array(orderSchema),
  settings: settingsSchema,
});
export type MerchantState = z.infer<typeof stateSchema>;
export const initialState: MerchantState = stateSchema.parse({
  menu: [
    {
      id: "harvest",
      name: "Harvest bowl",
      price: 14.5,
      category: "Bowls",
      available: true,
      photo: 0,
    },
    {
      id: "salmon",
      name: "Miso salmon bowl",
      price: 19,
      category: "Bowls",
      available: true,
      photo: 1,
    },
    {
      id: "glow",
      name: "Green glow",
      price: 8.5,
      category: "Drinks",
      available: true,
      photo: 2,
    },
    {
      id: "toast",
      name: "Avocado toast",
      price: 12,
      category: "Small plates",
      available: false,
      photo: 3,
    },
  ],
  orders: [
    {
      id: "1048",
      customer: "Olivia M.",
      dish: "2 × Harvest bowl",
      total: 29,
      status: "New",
      time: "Just now",
    },
    {
      id: "1047",
      customer: "James K.",
      dish: "1 × Miso salmon bowl",
      total: 19,
      status: "Preparing",
      time: "4 min ago",
    },
    {
      id: "1046",
      customer: "Sophie L.",
      dish: "1 × Harvest bowl · 1 × Green glow",
      total: 23,
      status: "Ready",
      time: "12 min ago",
    },
  ],
  settings: {
    name: "The Green Table",
    email: "hello@greentable.example",
    open: true,
    mode: "Open",
  },
});
export function restoreState(raw: string): MerchantState {
  const original = JSON.parse(raw);
  const saved = stateSchema.parse(original);
  return {
    ...saved,
    menu: saved.menu.map((dish, i) => ({
      ...dish,
      id: dish.id || `dish-${i}`,
      photo: Object.hasOwn(original.menu[i], "photo") ? dish.photo : i % 4,
    })),
    settings: {
      ...saved.settings,
      mode: saved.settings.mode ?? (saved.settings.open ? "Open" : "Paused"),
    },
  };
}
export function isAvailable(dish: MenuDish, now = new Date()) {
  if (!dish.available || (dish.trackQuantity && dish.quantity === 0))
    return false;
  if (!dish.schedule) return true;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return dish.from <= dish.until
    ? time >= dish.from && time < dish.until
    : time >= dish.from || time < dish.until;
}
function demand(order: Order, menu: MenuDish[]) {
  const quantities = new Map<string, number>();
  for (const line of order.dish.split(" · ")) {
    const match = line.match(/^(\d+)\s*×\s*(.+)$/);
    if (!match || Number(match[1]) < 1)
      return {
        quantities,
        error: "Check the dishes in this order before accepting.",
      };
    const item = menu.find((d) =>
      [d.name, ...d.previousNames].some(
        (name) => name.toLowerCase() === match[2].toLowerCase(),
      ),
    );
    if (!item)
      return { quantities, error: `${match[2]} is no longer on your menu.` };
    quantities.set(item.id, (quantities.get(item.id) ?? 0) + Number(match[1]));
  }
  return { quantities, error: "" };
}
export function stockProblem(order: Order, menu: MenuDish[]) {
  const { quantities, error } = demand(order, menu);
  if (error) return error;
  for (const [id, count] of quantities) {
    const item = menu.find((d) => d.id === id)!;
    if (item.trackQuantity && item.quantity < count)
      return `Only ${item.quantity} ${item.name.toLowerCase()} left. Customer ordered ${count}.`;
    if (!isAvailable(item)) return `${item.name} is currently unavailable.`;
  }
  return "";
}
export function acceptOrder(
  state: MerchantState,
  id: string,
): { state: MerchantState; error: string } {
  const order = state.orders.find((o) => o.id === id);
  if (!order || !["New", "Needs Attention"].includes(order.status))
    return { state, error: "This order has already been updated." };
  const error = stockProblem(order, state.menu);
  if (error) return { state, error };
  const { quantities } = demand(order, state.menu);
  return {
    error: "",
    state: {
      ...state,
      orders: state.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              status: "Preparing",
              problem: "",
              minutes:
                o.minutes +
                (state.settings.mode === "Busy"
                  ? state.settings.busyMinutes
                  : 0),
            }
          : o,
      ),
      menu: state.menu.map((d) =>
        d.trackQuantity
          ? {
              ...d,
              quantity: Math.max(0, d.quantity - (quantities.get(d.id) ?? 0)),
            }
          : d,
      ),
    },
  };
}
export function importMenu(text: string): MenuDish[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2 || !/^name,price$/i.test(lines[0].trim()))
    throw new Error("Use a CSV with name,price as the first line.");
  return lines.slice(1).map((line, i) => {
    const parts = line.match(
      /^(?:"((?:[^"]|"")+)"|([^,]+)),(\d+(?:\.\d{1,2})?)$/,
    );
    if (!parts) throw new Error(`Check the name and price on line ${i + 2}.`);
    return dishSchema.parse({
      id: crypto.randomUUID(),
      name: (parts[1]?.replaceAll('""', '"') ?? parts[2]).trim(),
      price: Number(parts[3]),
      category: "Imported",
      available: true,
      photo: i % 4,
    });
  });
}
