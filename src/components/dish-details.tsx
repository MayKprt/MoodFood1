"use client";
import { useState } from "react";
import {
  Bookmark,
  Check,
  Clock3,
  Leaf,
  Minus,
  Plus,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import type { Dish, CartItem } from "@/lib/domain";
import { money } from "@/lib/domain";
import { restaurantById } from "@/lib/data";
import { eligible } from "@/lib/recommendations";
import type { MoodFoodApp } from "@/lib/use-moodfood";
import { FoodPhoto } from "./ui";
export function DishDetails({
  dish,
  app,
  onAdd,
}: {
  dish: Dish;
  app: MoodFoodApp;
  onAdd: (item: CartItem) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [modifierIds, setModifierIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const restaurant = restaurantById(dish.restaurantId);
  const valid = eligible(
    dish,
    { ...app.preferences, budget: Infinity },
    app.address.zip,
  );
  const price =
    (dish.price +
      modifierIds.reduce(
        (s, id) => s + (dish.modifiers.find((m) => m.id === id)?.price || 0),
        0,
      )) *
    quantity;
  return (
    <div className="dish-detail">
      <div className="detail-photo">
        <FoodPhoto dish={dish} />
        <button
          className={`bookmark-float ${app.saved.includes(dish.id) ? "is-saved" : ""}`}
          onClick={() => app.toggleSave(dish.id)}
          aria-label={
            app.saved.includes(dish.id) ? "Remove bookmark" : "Save for later"
          }
          aria-pressed={app.saved.includes(dish.id)}
        >
          <Bookmark
            size={20}
            fill={app.saved.includes(dish.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="detail-body">
        <span className="eyebrow">{restaurant.name}</span>
        <p className="demo-kitchen">
          Fictional demo kitchen ·{" "}
          {dish.available && restaurant.open
            ? "Available"
            : "Currently unavailable"}
        </p>
        <p className="detail-description">{dish.description}</p>
        <div className="detail-meta">
          <strong>{money(dish.price)}</strong>
          <span>
            <Clock3 size={15} />
            {dish.minutes.join("–")} min delivery
          </span>
          <span>Prep: 10–15 min</span>
        </div>
        <div className="tag-row">
          {dish.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
          {dish.dietary.map((t) => (
            <span className="diet-tag" key={t}>
              <Leaf size={12} />
              {t}
            </span>
          ))}
        </div>
        <section className="detail-section">
          <h3>Good to know</h3>
          <p>
            <strong>Ingredients:</strong> {dish.ingredients.join(", ")}.
          </p>
          <p>
            <strong>Contains:</strong>{" "}
            {dish.allergens.length
              ? dish.allergens.join(", ")
              : "no declared allergens in this sample recipe"}
            .
          </p>
          <div className="safety-note">
            <ShieldCheck size={19} />
            <span>
              Sample recipe information only. In a real order, ingredients,
              allergens, and cross-contact must be verified with the kitchen.
              Never rely on recommendations for allergy safety.
            </span>
          </div>
        </section>
        <section className="detail-section">
          <h3>Make it yours</h3>
          <p className="muted">
            Regular portion included. Options supplied by this demo kitchen.
          </p>
          {dish.modifiers.map((m) => (
            <label className="option-row" key={m.id}>
              <span>
                <input
                  type="checkbox"
                  checked={modifierIds.includes(m.id)}
                  onChange={() =>
                    setModifierIds((old) =>
                      old.includes(m.id)
                        ? old.filter((x) => x !== m.id)
                        : [...old, m.id],
                    )
                  }
                />
                {m.name}
              </span>
              <strong>+{money(m.price)}</strong>
            </label>
          ))}
          <label className="form-label" htmlFor="special-instructions">
            Special instructions <span>(optional)</span>
          </label>
          <textarea
            id="special-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={500}
            placeholder="Anything the kitchen should know? No allergy guarantees."
            rows={2}
          />
        </section>
        <div className="fee-note">
          Delivery {money(restaurant.deliveryFee)} · Service fee 5% · Estimated
          tax 8.875%. Final demo total shown before placing your order.
        </div>
        {!valid && (
          <p className="error-banner">
            This dish is unavailable in your area or doesn’t meet your explicit
            dietary restrictions. Review Profile and delivery location.
          </p>
        )}
        <div className="add-cart-bar">
          <div className="quantity-control">
            <button
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => q - 1)}
              disabled={quantity === 1}
            >
              <Minus size={16} />
            </button>
            <span>{quantity}</span>
            <button
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={quantity === 20}
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            className="primary-button"
            disabled={!valid}
            onClick={() =>
              onAdd({ dishId: dish.id, quantity, modifierIds, instructions })
            }
          >
            <ShoppingBag size={17} />
            Add to cart <strong>{money(price)}</strong>
          </button>
        </div>
      </div>
    </div>
  );
}
