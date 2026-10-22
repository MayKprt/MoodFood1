import { describe, expect, it } from "vitest";
import {
  acceptOrder,
  advanceOrder,
  reopenOrder,
  importMenu,
  initialState,
  isAvailable,
  restoreState,
  stockProblem,
} from "../src/app/merchant/merchant-data";

const state = () => structuredClone(initialState);
describe("reopening local Merchant orders", () => {
  it("records completion status, restores it after persistence, and never duplicates an order", () => {
    const original = state();
    const ready = original.orders.find((order) => order.status === "Ready")!;
    const completed = advanceOrder(original, ready.id);
    expect(completed.orders.find((order) => order.id === ready.id)).toEqual({ ...ready, status: "Completed", previousActiveStatus: "Ready" });
    const restored = restoreState(JSON.stringify(completed));
    const reopened = reopenOrder(restored, ready.id);
    expect(reopened.orders.find((order) => order.id === ready.id)).toEqual({ ...ready, previousActiveStatus: "Ready" });
    expect(reopened.menu).toBe(restored.menu);
    expect(reopened.settings).toBe(restored.settings);
    expect(reopened.orders).toHaveLength(original.orders.length);
    expect(reopenOrder(reopened, ready.id)).toEqual(reopened);
    expect(advanceOrder(reopened, ready.id).orders.find((order) => order.id === ready.id)?.status).toBe("Completed");
    expect(original.orders.find((order) => order.id === ready.id)).toEqual(ready);
  });
  it("restores a recorded Preparing status and falls back to Ready for legacy completed orders", () => {
    for (const previousActiveStatus of ["Preparing", undefined] as const) {
      const original = state();
      original.orders[0] = { ...original.orders[0], status: "Completed", previousActiveStatus };
      const reopened = reopenOrder(original, original.orders[0].id);
      expect(reopened.orders[0]).toEqual({ ...original.orders[0], status: previousActiveStatus ?? "Ready" });
    }
  });
  it("does not reopen cancelled or active orders, or change stock, money or other orders", () => {
    const original = state();
    original.orders[0].status = "Cancelled";
    for (const order of original.orders) expect(reopenOrder(original, order.id)).toEqual(original);
    expect(reopenOrder(original, "missing")).toEqual(original);
    const completed = advanceOrder(original, original.orders.find((order) => order.status === "Ready")!.id);
    const target = completed.orders.find((order) => order.status === "Completed")!;
    const reopened = reopenOrder(completed, target.id);
    expect(reopened.orders.filter((order) => order.id !== target.id)).toEqual(completed.orders.filter((order) => order.id !== target.id));
    expect(reopened.orders.find((order) => order.id === target.id)?.total).toBe(target.total);
    expect(reopened.menu).toBe(completed.menu);
  });
});
describe("merchant preview compatibility", () => {
  it("restores the original preview without losing dishes, prices, orders or paused status", () => {
    const restored = restoreState(
      JSON.stringify({
        menu: [
          {
            name: "Special bowl",
            price: 13.25,
            category: "Specials",
            available: false,
          },
        ],
        orders: [
          {
            id: "1",
            customer: "Guest",
            dish: "1 × Special bowl",
            total: 13.25,
            status: "Ready",
            time: "now",
          },
        ],
        settings: {
          name: "Original kitchen",
          email: "owner@example.com",
          open: false,
        },
      }),
    );
    expect(restored.menu[0]).toMatchObject({
      name: "Special bowl",
      price: 13.25,
      available: false,
      id: "dish-0",
    });
    expect(restored.orders[0].status).toBe("Ready");
    expect(restored.settings).toMatchObject({
      name: "Original kitchen",
      mode: "Paused",
    });
    expect(restored.settings.notifications.orders).toBe(true);
  });
  it("rejects corrupt saved data instead of replacing it silently", () => {
    expect(() => restoreState('{"menu":null}')).toThrow();
  });
});
describe("merchant order stock checks", () => {
  it("uses the saved Busy Mode preparation setting for newly accepted orders", () => {
    const sample = state();
    sample.settings.mode = "Busy";
    sample.settings.busyMinutes = 25;
    const accepted = acceptOrder(sample, "1048");
    expect(accepted.error).toBe("");
    expect(accepted.state.orders[0].minutes).toBe(45);
    expect(sample.orders[0].minutes).toBe(20);
  });
  it("blocks insufficient stock with a readable explanation", () => {
    const sample = state();
    sample.menu[0].trackQuantity = true;
    sample.menu[0].quantity = 1;
    const result = acceptOrder(sample, "1048");
    expect(result.error).toBe("Only 1 harvest bowl left. Customer ordered 2.");
    expect(result.state).toBe(sample);
    expect(result.state.orders[0].status).toBe("New");
  });
  it("decrements tracked stock once, without changing customer order snapshots", () => {
    const sample = state();
    sample.menu[0].trackQuantity = true;
    sample.menu[0].quantity = 2;
    const accepted = acceptOrder(sample, "1048");
    expect(accepted.error).toBe("");
    expect(accepted.state.menu[0].quantity).toBe(0);
    expect(accepted.state.orders[0]).toMatchObject({
      status: "Preparing",
      total: 29,
      dish: "2 × Harvest bowl",
    });
    expect(acceptOrder(accepted.state, "1048").state.menu[0].quantity).toBe(0);
  });
  it("combines repeated lines before stock checks", () => {
    const sample = state();
    sample.menu[0].trackQuantity = true;
    sample.menu[0].quantity = 3;
    sample.orders[0].dish = "2 × Harvest bowl · 2 × Harvest bowl";
    expect(acceptOrder(sample, "1048").error).toContain("Customer ordered 4");
  });
  it("recognizes a renamed dish for an existing order", () => {
    const sample = state();
    sample.menu[0].previousNames = ["Harvest bowl"];
    sample.menu[0].name = "Seasonal bowl";
    expect(stockProblem(sample.orders[0], sample.menu)).toBe("");
  });
  it("blocks sold out dishes and applies extra prep time in busy mode", () => {
    const sample = state();
    sample.menu[0].available = false;
    expect(acceptOrder(sample, "1048").error).toContain("unavailable");
    sample.menu[0].available = true;
    sample.settings.mode = "Busy";
    expect(acceptOrder(sample, "1048").state.orders[0].minutes).toBe(30);
  });
  it("handles overnight schedules using device local time", () => {
    const dish = {
      ...state().menu[0],
      schedule: true,
      from: "20:00",
      until: "02:00",
    };
    expect(isAvailable(dish, new Date(2026, 9, 15, 23))).toBe(true);
    expect(isAvailable(dish, new Date(2026, 9, 16, 1))).toBe(true);
    expect(isAvailable(dish, new Date(2026, 9, 16, 2))).toBe(false);
    expect(isAvailable(dish, new Date(2026, 9, 16, 12))).toBe(false);
  });
});
describe("menu import", () => {
  it("reads quoted dish names with commas", () => {
    const imported = importMenu(
      'name,price\n"Bowl, extra greens",14.50\nToast,9',
    );
    expect(imported.map((d) => [d.name, d.price])).toEqual([
      ["Bowl, extra greens", 14.5],
      ["Toast", 9],
    ]);
    expect(imported[0].id).not.toBe(imported[1].id);
  });
  it("rejects malformed prices with a line number", () => {
    expect(() => importMenu("name,price\nBowl,-2")).toThrow("line 2");
  });
});
