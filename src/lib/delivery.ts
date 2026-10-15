import { Order } from "./domain";
export interface DeliveryProvider {
  readonly name: string;
  status(order: Order, now?: number): Order;
}
export class DemoDeliveryProvider implements DeliveryProvider {
  readonly name = "Simulated delivery";
  status(order: Order, now = Date.now()): Order {
    if (
      ["cancelled", "needs_attention"].includes(order.kitchenStatus) ||
      ["failed", "support_pending"].includes(order.deliveryStatus)
    )
      return order;
    const elapsed = Math.max(
      0,
      (now - new Date(order.createdAt).getTime()) / 1000,
    );
    return {
      ...order,
      kitchenStatus:
        elapsed < 12
          ? "awaiting_confirmation"
          : elapsed < 25
            ? "accepted"
            : elapsed < 50
              ? "preparing"
              : "ready",
      deliveryStatus:
        elapsed < 50
          ? "unassigned"
          : elapsed < 65
            ? "assigned"
            : elapsed < 80
              ? "picked_up"
              : elapsed < 110
                ? "on_the_way"
                : "delivered",
    };
  }
}
export const kitchenLabels: Record<Order["kitchenStatus"], string> = {
  awaiting_confirmation: "Awaiting confirmation",
  accepted: "Accepted",
  preparing: "Preparing your food",
  ready: "Ready for pickup",
  needs_attention: "Needs attention",
  cancelled: "Cancelled",
};
export const deliveryLabels: Record<Order["deliveryStatus"], string> = {
  unassigned: "Courier not assigned",
  assigned: "Courier assigned",
  picked_up: "Picked up",
  on_the_way: "On the way",
  delivered: "Delivered",
  failed: "Delivery failed",
  support_pending: "Refund or support pending",
};
