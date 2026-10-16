"use client";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { dishById, restaurantById } from "@/lib/data";
import { money, emptyCart, type Order } from "@/lib/domain";
import { itemPrice, quoteCart, validateCart } from "@/lib/cart";
import { deliveryLabels, kitchenLabels } from "@/lib/delivery";
import type { MoodFoodApp } from "@/lib/use-moodfood";
import { EmptyState, FoodPhoto } from "./ui";
export function CartView({
  app,
  onAddress,
  onHelp,
}: {
  app: MoodFoodApp;
  onAddress: () => void;
  onHelp: () => void;
}) {
  const [instructions, setInstructions] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const key = useRef<string | null>(null);
  const fingerprint = useRef("");
  const inFlight = useRef(false);
  if (!app.cart.items.length)
    return (
      <EmptyState
        icon={<ShoppingBag size={32} />}
        title="A little empty. A lot of possibility."
        description="Find something that speaks to your appetite, then make it yours."
        action="Find my food mood"
        onAction={() => app.setView("discover")}
      />
    );
  const quote = quoteCart(app.cart);
  const restaurant = restaurantById(app.cart.restaurantId!);
  function changeQuantity(index: number, delta: number) {
    app.setCart((c) => {
      const items = c.items
        .map((item, i) =>
          i === index ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0);
      return { restaurantId: items.length ? c.restaurantId : null, items };
    });
  }
  async function checkout() {
    if (inFlight.current) return;
    setCheckoutError("");
    try {
      validateCart(app.cart, app.address, app.preferences);
      if (!acknowledged)
        throw new Error(
          "Please acknowledge the sample allergen information before continuing.",
        );
      const details = JSON.stringify({
        cart: app.cart,
        address: app.address,
        preferences: app.preferences,
        instructions,
        acceptedTotal: quote.total,
      });
      if (fingerprint.current !== details) {
        key.current = crypto.randomUUID();
        fingerprint.current = details;
      }
      inFlight.current = true;
      setPlacing(true);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.current,
          cart: app.cart,
          address: app.address,
          preferences: app.preferences,
          instructions,
          acceptedTotal: quote.total,
          allergenAcknowledged: acknowledged,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      app.setCart(emptyCart);
      app.setNotice(
        `Demo order ${data.order.id} placed. No payment was taken.`,
      );
      app.setView("orders");
    } catch (e) {
      setCheckoutError((e as Error).message);
    } finally {
      inFlight.current = false;
      setPlacing(false);
    }
  }
  return (
    <section className="flow-page">
      <div className="page-intro align-left">
        <span className="eyebrow">YOUR GOOD DECISION, IN A BAG</span>
        <h1>
          Almost <em>on your plate.</em>
        </h1>
        <p>One kitchen. One delicious delivery.</p>
      </div>
      <div className="checkout-grid">
        <div>
          <div className="cart-items panel">
            <div className="panel-title">
              <UtensilsCrossed size={18} />
              <h2>{restaurant.name}</h2>
            </div>
            {app.cart.items.map((item, index) => {
              const d = dishById(item.dishId)!;
              return (
                <article className="cart-item" key={`${item.dishId}-${index}`}>
                  <FoodPhoto dish={d} />
                  <div>
                    <h3>{d.name}</h3>
                    <p>
                      {item.modifierIds
                        .map((id) => d.modifiers.find((m) => m.id === id)?.name)
                        .join(", ") || "Regular portion"}
                    </p>
                    {item.instructions && (
                      <small>Note: {item.instructions}</small>
                    )}
                    <div className="quantity-control">
                      <button
                        onClick={() => changeQuantity(index, -1)}
                        aria-label={`Decrease ${d.name} quantity`}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        disabled={item.quantity >= 20}
                        onClick={() => changeQuantity(index, 1)}
                        aria-label={`Increase ${d.name} quantity`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <strong>{money(itemPrice(item) * item.quantity)}</strong>
                </article>
              );
            })}
            <button
              className="text-link"
              onClick={() => app.setView("discover")}
            >
              Add something else <Plus size={15} />
            </button>
          </div>
          <div className="panel delivery-panel">
            <div className="panel-title">
              <MapPin size={18} />
              <h2>Where should the good food go?</h2>
              <button className="text-link" onClick={onAddress}>
                {app.address.street ? "Edit" : "Add address"}
              </button>
            </div>
            <p>
              {app.address.street
                ? `${app.address.street}${app.address.apartment ? `, ${app.address.apartment}` : ""}`
                : "Add a street address to continue"}
            </p>
            <p className="muted">
              {app.address.city}, NY {app.address.zip}
            </p>
            <label className="form-label" htmlFor="delivery-instructions">
              Delivery instructions <span>(optional)</span>
            </label>
            <textarea
              id="delivery-instructions"
              maxLength={500}
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="A buzzer, a floor, a helpful little detail…"
            />
          </div>
        </div>
        <aside className="panel order-summary">
          <span className="eyebrow">
            <Receipt size={14} />
            THE DELICIOUS DETAILS
          </span>
          <h2>Order summary</h2>
          <div className="summary-lines">
            <div>
              <span>Items</span>
              <span>{money(quote.subtotal)}</span>
            </div>
            <div>
              <span>Delivery fee</span>
              <span>{money(quote.deliveryFee)}</span>
            </div>
            <div>
              <span>Service fee (5%)</span>
              <span>{money(quote.serviceFee)}</span>
            </div>
            <div>
              <span>Estimated tax (8.875%)</span>
              <span>{money(quote.tax)}</span>
            </div>
            <div className="summary-total">
              <strong>Final demo total</strong>
              <strong>{money(quote.total)}</strong>
            </div>
          </div>
          <div className="demo-notice">
            <SparkleIcon />
            <div>
              <strong>A delicious dry run.</strong>
              <p>
                This is a demo order. No payment, real kitchen, or courier is
                involved.
              </p>
            </div>
          </div>
          <label className="acknowledgement">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              I reviewed the sample ingredients and allergens. Real preparation
              and cross-contact require kitchen verification.
            </span>
          </label>
          {checkoutError && (
            <p className="error-banner" role="alert">
              {checkoutError}
            </p>
          )}
          <button
            className="primary-button checkout-button"
            onClick={() => void checkout()}
            disabled={placing || !acknowledged}
          >
            {placing ? "Placing demo order…" : "Place demo order"}
            <ArrowRight size={18} />
          </button>
          <p className="checkout-note">
            No card details needed. No charges, ever, in demo mode.
          </p>
          <button className="text-link" onClick={onHelp}>
            Questions about this demo?
          </button>
        </aside>
      </div>
    </section>
  );
}
function SparkleIcon() {
  return (
    <span aria-hidden="true" className="sparkle-icon">
      ✳︎
    </span>
  );
}
export function OrdersView({
  app,
  onHelp,
}: {
  app: MoodFoodApp;
  onHelp: () => void;
}) {
  if (app.ordersLoading && !app.orders.length)
    return (
      <div className="loading-state" role="status">
        <div className="skeleton" />
        <p>Finding your orders…</p>
      </div>
    );
  if (!app.orders.length)
    return (
      <EmptyState
        icon={<Receipt size={32} />}
        title="Your first good-food story starts here."
        description="When you place a demo order, you can follow its simulated journey right here."
        action="Find something delicious"
        onAction={() => app.setView("discover")}
      />
    );
  return (
    <section className="flow-page">
      <div className="page-intro align-left">
        <span className="eyebrow">FROM CRAVING TO CONTENTMENT</span>
        <h1>
          Your food, <em>on its way.</em>
        </h1>
        <p>
          Simulated progress for your demo orders. No real courier tracking.
        </p>
      </div>
      <div className="orders-list">
        {[...app.orders].reverse().map((order) => (
          <OrderCard key={order.id} order={order} onHelp={onHelp} />
        ))}
      </div>
    </section>
  );
}
function OrderCard({ order, onHelp }: { order: Order; onHelp: () => void }) {
  const delivered = order.deliveryStatus === "delivered";
  const step = delivered
    ? 4
    : order.deliveryStatus === "on_the_way" ||
        order.deliveryStatus === "picked_up"
      ? 3
      : order.kitchenStatus === "ready"
        ? 2
        : order.kitchenStatus === "preparing" ||
            order.kitchenStatus === "accepted"
          ? 1
          : 0;
  return (
    <article className="panel order-card">
      <div className="order-card-heading">
        <div>
          <span className="eyebrow">DEMO ORDER · {order.id}</span>
          <h2>{restaurantById(order.restaurantId).name}</h2>
          <p>
            {new Date(order.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <span className="status-badge">
          {delivered ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{" "}
          {delivered ? "Demo delivered" : "Simulation in progress"}
        </span>
      </div>
      <div className="tracking-banner">
        <span className="tracking-icon">
          {delivered ? <CheckCircle2 size={29} /> : <Truck size={29} />}
        </span>
        <div>
          <h3>
            {delivered
              ? "Your simulated order has arrived."
              : step < 2
                ? kitchenLabels[order.kitchenStatus]
                : deliveryLabels[order.deliveryStatus]}
          </h3>
          <p>
            {delivered
              ? "No real delivery was made. Hope your next meal is this good."
              : "Demo time is sped up: the full journey takes about two minutes."}
          </p>
        </div>
      </div>
      <ol className="tracking-steps">
        {["Placed", "Preparing", "Ready", "On the way", "Delivered"].map(
          (label, i) => (
            <li key={label} className={i <= step ? "active" : ""}>
              <span>{i < step ? <Check size={14} /> : i + 1}</span>
              <small>{label}</small>
            </li>
          ),
        )}
      </ol>
      <div className="order-status-detail">
        <span>Kitchen: {kitchenLabels[order.kitchenStatus]}</span>
        <span>Delivery: {deliveryLabels[order.deliveryStatus]}</span>
      </div>
      <div className="ordered-items">
        {order.items.map((item, i) => {
          const d = dishById(item.dishId)!;
          const snapshot = order.lineSnapshots?.[i];
          return (
            <div key={i}>
              <FoodPhoto dish={d} />
              <span>
                <strong>
                  {item.quantity} × {snapshot?.name || d.name}
                </strong>
                <small>
                  {snapshot
                    ? snapshot.modifierNames.join(", ") || "Regular portion"
                    : item.modifierIds
                        .map((id) => d.modifiers.find((m) => m.id === id)?.name)
                        .join(", ") || "Regular portion"}
                </small>
                {item.instructions && (
                  <small>Kitchen note: {item.instructions}</small>
                )}
              </span>
              <strong>
                {money(
                  (snapshot?.unitPrice ?? itemPrice(item)) * item.quantity,
                )}
              </strong>
            </div>
          );
        })}
      </div>
      <div className="order-bottom">
        <div>
          <MapPin size={16} />
          <span>
            {order.address.street}
            {order.address.apartment
              ? `, ${order.address.apartment}`
              : ""}, {order.address.city} {order.address.zip}
            {order.instructions && (
              <small>Delivery note: {order.instructions}</small>
            )}
          </span>
        </div>
        <strong>Total {money(order.quote.total)}</strong>
      </div>
      <details className="order-receipt">
        <summary>View price breakdown</summary>
        <div className="summary-lines">
          <div>
            <span>Items</span>
            <span>{money(order.quote.subtotal)}</span>
          </div>
          <div>
            <span>Delivery</span>
            <span>{money(order.quote.deliveryFee)}</span>
          </div>
          <div>
            <span>Service fee</span>
            <span>{money(order.quote.serviceFee)}</span>
          </div>
          <div>
            <span>Tax</span>
            <span>{money(order.quote.tax)}</span>
          </div>
        </div>
      </details>
      <button className="text-link" onClick={onHelp}>
        Support / report an issue
      </button>
    </article>
  );
}
