"use client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ArrowUpRight,
  Clock3,
  Bookmark,
  Plus,
  Sparkles,
} from "lucide-react";
import { Dish, money } from "@/lib/domain";
import { restaurantById } from "@/lib/data";
import type { CSSProperties, ReactNode } from "react";
export function FoodPhoto({
  dish,
  className = "",
  priority = false,
}: {
  dish: Dish;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={dish.name}
      className={`food-photo ${className}`}
      style={
        {
          "--photo-x": `${((dish.image % 4) * 100) / 3}%`,
          "--photo-y": `${[0, 30.76, 62.67, 94.89][Math.floor(dish.image / 4)]}%`,
          backgroundImage: "url(/food-editorial.png)",
          contentVisibility: priority ? "visible" : "auto",
        } as CSSProperties
      }
    />
  );
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        ✳︎
      </span>
      moodfood<span className="brand-dot">.</span>
    </span>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${className}`}
          aria-describedby={description ? "modal-description" : undefined}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description id="modal-description">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={21} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function DishTile({
  dish,
  onOpen,
  onSave,
  saved,
  showRestaurant = true,
}: {
  dish: Dish;
  onOpen: () => void;
  onSave: () => void;
  saved: boolean;
  showRestaurant?: boolean;
}) {
  return (
    <article className="dish-tile">
      <div className="tile-photo">
        <button
          className="photo-open"
          onClick={onOpen}
          aria-label={`View ${dish.name}`}
        >
          <FoodPhoto dish={dish} />
        </button>
        <button
          className={`bookmark-float ${saved ? "is-saved" : ""}`}
          onClick={onSave}
          aria-label={`${saved ? "Unsave" : "Save"} ${dish.name}`}
          aria-pressed={saved}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="photo-pill">
          <Clock3 size={12} />
          {dish.minutes.join("–")} min
        </span>
      </div>
      <div className="tile-content">
        <div className="tile-title">
          <button onClick={onOpen}>{dish.name}</button>
          <span>{money(dish.price)}</span>
        </div>
        {showRestaurant && (
          <p className="restaurant-name">
            {restaurantById(dish.restaurantId).name}
          </p>
        )}
        <p className="tile-description">{dish.description}</p>
        <div className="tile-bottom">
          <span>{dish.tags.slice(0, 2).join(" · ")}</span>
          <button
            onClick={onOpen}
            className="tile-plus"
            aria-label={`Choose ${dish.name}`}
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="primary-button" onClick={onAction}>
        {action}
        <ArrowUpRight size={18} />
      </button>
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && (
          <span className="eyebrow">
            <Sparkles size={13} />
            {eyebrow}
          </span>
        )}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
