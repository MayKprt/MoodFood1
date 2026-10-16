"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  ChevronRight,
  Clock3,
  PackageCheck,
  Plus,
  Send,
  Sparkles,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import {
  dishSchema,
  importMenu,
  isAvailable,
  stockProblem,
  type MerchantState,
  type MenuDish,
  type MerchantSettings,
  type Notifications,
  type Order,
} from "./merchant-data";
import s from "./merchant.module.css";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const returnFocus = useRef<HTMLElement | null>(
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement),
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          className={s.modal}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
        >
          <div className={s.modalHeading}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className={s.iconButton} aria-label="Close dialog">
              <X size={23} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function DishPhoto({ dish }: { dish: MenuDish }) {
  return (
    <div
      role="img"
      aria-label={dish.name}
      className={s.foodPhoto}
      style={{
        backgroundPosition: `${dish.photo % 2 === 0 ? 0 : 100}% ${dish.photo < 2 ? 0 : 100}%`,
      }}
    />
  );
}
export function OrderList({
  orders,
  menu,
  filter,
  setFilter,
  onAction,
  onReject,
}: {
  orders: Order[];
  menu: MenuDish[];
  filter: string;
  setFilter: (value: string) => void;
  onAction: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [reject, setReject] = useState<string | null>(null);
  const categories = ["Needs Attention", "In Progress", "Completed"];
  const matches = (o: Order, category: string) =>
    category === "Needs Attention"
      ? ["New", "Needs Attention"].includes(o.status)
      : category === "In Progress"
        ? ["Preparing", "Ready"].includes(o.status)
        : ["Completed", "Cancelled"].includes(o.status);
  const visible = orders.filter((o) => matches(o, filter));
  return (
    <>
      <div className={s.tabs} role="group" aria-label="Order categories">
        {categories.map((category) => (
          <button
            key={category}
            aria-pressed={filter === category}
            className={filter === category ? s.selectedTab : ""}
            onClick={() => setFilter(category)}
          >
            {category}
            <span>{orders.filter((o) => matches(o, category)).length}</span>
          </button>
        ))}
      </div>
      <div className={s.orderList}>
        {visible.map((order) => {
          const attention = ["New", "Needs Attention"].includes(order.status);
          const problem = attention
            ? stockProblem(order, menu) || order.problem
            : "";
          return (
            <article key={order.id} className={s.orderCard}>
              <div className={s.row}>
                <h2>Order #{order.id}</h2>
                <span className={attention ? s.amberText : s.muted}>
                  {order.status === "New" ? "New order" : order.status}
                </span>
              </div>
              <div className={s.orderDishes}>
                {order.dish.split(" · ").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <p className={s.orderTime}>
                <Clock3 size={17} />
                {order.status === "Ready"
                  ? "Ready for pickup"
                  : order.status === "Completed"
                    ? "Order completed"
                    : order.status === "Cancelled"
                      ? "Order cancelled"
                      : `${order.status === "Preparing" ? "Preparing" : "Estimated prep"} · ${order.minutes} min`}
              </p>
              {problem && <div className={s.problem}>{problem}</div>}
              {!["Completed", "Cancelled"].includes(order.status) && (
                <div className={s.orderButtons}>
                  <button
                    className={s.primary}
                    onClick={() => onAction(order.id)}
                  >
                    {attention
                      ? problem
                        ? "Confirm Available"
                        : "Accept Order"
                      : order.status === "Preparing"
                        ? "Mark Ready"
                        : "Complete Order"}
                    <ChevronRight size={19} />
                  </button>
                  {attention && (
                    <button
                      className={s.secondary}
                      onClick={() => setReject(order.id)}
                    >
                      Can’t Fulfill
                    </button>
                  )}
                </div>
              )}
              <details className={s.details}>
                <summary>Delivery Details</summary>
                <p>Demo pickup · Delivery provider not connected.</p>
                <p>
                  {order.customer} · ${order.total.toFixed(2)}
                </p>
              </details>
            </article>
          );
        })}
        {visible.length === 0 && (
          <div className={s.empty}>
            <PackageCheck size={38} />
            <h2>
              {filter === "Needs Attention"
                ? "All caught up!"
                : "No orders here yet"}
            </h2>
            <p>
              {filter === "Needs Attention"
                ? "Your kitchen is in good shape."
                : "Orders will appear here as you update them."}
            </p>
          </div>
        )}
      </div>
      {reject && (
        <Modal
          title={`Cancel order #${reject}?`}
          onClose={() => setReject(null)}
        >
          <p>The demo order will be marked cancelled.</p>
          <div className={s.dialogActions}>
            <button className={s.secondary} onClick={() => setReject(null)}>
              Keep Order
            </button>
            <button
              className={s.dangerButton}
              onClick={() => {
                onReject(reject);
                setReject(null);
              }}
            >
              Cancel Order
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function MenuPanel({
  menu,
  onToggle,
  onEdit,
  onAdd,
  onImport,
}: {
  menu: MenuDish[];
  onToggle: (id: string) => void;
  onEdit: (dish: MenuDish) => void;
  onAdd: () => void;
  onImport: (items: MenuDish[]) => void;
}) {
  const [importing, setImporting] = useState(false);
  return (
    <>
      <div className={s.sectionRow}>
        <p className={s.muted}>{menu.length} dishes</p>
        <div className={s.inlineActions}>
          <button className={s.secondary} onClick={() => setImporting(true)}>
            <Upload size={17} /> Import Menu
          </button>
          <button className={s.primary} onClick={onAdd}>
            <Plus size={19} /> Add a Dish
          </button>
        </div>
      </div>
      <div className={s.menuGrid}>
        {menu.map((dish) => (
          <article key={dish.id} className={s.dishCard}>
            <DishPhoto dish={dish} />
            <div className={s.dishBody}>
              <div className={s.row}>
                <h2>{dish.name}</h2>
                <span>${dish.price.toFixed(2)}</span>
              </div>
              <div className={s.dishActions}>
                <button
                  className={`${s.availability} ${isAvailable(dish) ? s.available : s.soldOut}`}
                  aria-label={`${dish.name}: ${isAvailable(dish) ? "Available" : "Sold Out"}`}
                  aria-pressed={isAvailable(dish)}
                  onClick={() => onToggle(dish.id)}
                >
                  <span className={s.switchTrack}>
                    <span />
                  </span>
                  {isAvailable(dish) ? "Available" : "Sold Out"}
                </button>
                <button
                  className={s.editButton}
                  aria-label={`Edit ${dish.name}`}
                  onClick={() => onEdit(dish)}
                >
                  Edit
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {importing && (
        <MenuImport
          onClose={() => setImporting(false)}
          onImport={(items) => {
            onImport(items);
            setImporting(false);
          }}
        />
      )}
    </>
  );
}
function MenuImport({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (items: MenuDish[]) => void;
}) {
  const [error, setError] = useState("");
  const [items, setItems] = useState<MenuDish[]>([]);
  return (
    <Modal title="Import your menu" onClose={onClose}>
      <p>Choose a CSV with two columns: name and price.</p>
      <label className={s.fileInput}>
        Menu file
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            setError("");
            setItems([]);
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setItems(importMenu(await file.text()));
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Could not read that file.",
              );
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {items.length > 0 && (
        <>
          <p>{items.length} dishes ready to add.</p>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                {item.name} · ${item.price.toFixed(2)}
              </li>
            ))}
          </ul>
          <button className={s.primary} onClick={() => onImport(items)}>
            Add {items.length} Dishes
          </button>
        </>
      )}
    </Modal>
  );
}
export function DishEditor({
  dish,
  onSave,
  onClose,
}: {
  dish: MenuDish | null;
  onSave: (dish: MenuDish) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MenuDish>(
    () =>
      dish ??
      dishSchema.parse({
        id: crypto.randomUUID(),
        name: "",
        price: 10,
        category: "Bowls",
        available: true,
      }),
  );
  const [error, setError] = useState("");
  return (
    <Modal title={dish ? "Edit dish" : "Add a dish"} onClose={onClose}>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.name.trim()) {
            setError("Give your dish a name.");
            return;
          }
          onSave({ ...draft, name: draft.name.trim() });
        }}
      >
        <label>
          Dish name
          <input
            autoFocus
            required
            value={draft.name}
            placeholder="e.g. Harvest bowl"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <div className={s.formGrid}>
          <label>
            Price ($)
            <input
              type="number"
              required
              min="0"
              max="9999"
              step="0.01"
              value={draft.price}
              onChange={(e) =>
                setDraft({ ...draft, price: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Category
            <input
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </label>
        </div>
        <label>
          Photo
          <select
            value={draft.photo}
            onChange={(e) =>
              setDraft({ ...draft, photo: Number(e.target.value) })
            }
          >
            <option value={0}>Harvest bowl</option>
            <option value={1}>Salmon bowl</option>
            <option value={2}>Green smoothie</option>
            <option value={3}>Avocado toast</option>
          </select>
        </label>
        <label className={s.checkLabel}>
          <input
            type="checkbox"
            checked={draft.available}
            onChange={(e) =>
              setDraft({ ...draft, available: e.target.checked })
            }
          />{" "}
          Available to order
        </label>
        <details className={s.advanced}>
          <summary>
            More options <span>Stock, schedule & extras</span>
          </summary>
          <label className={s.checkLabel}>
            <input
              type="checkbox"
              checked={draft.trackQuantity}
              onChange={(e) =>
                setDraft({ ...draft, trackQuantity: e.target.checked })
              }
            />{" "}
            Track how many are left
          </label>
          {draft.trackQuantity && (
            <label>
              Quantity left
              <input
                type="number"
                required
                min="0"
                step="1"
                value={draft.quantity}
                onChange={(e) =>
                  setDraft({ ...draft, quantity: Number(e.target.value) })
                }
              />
            </label>
          )}
          <label className={s.checkLabel}>
            <input
              type="checkbox"
              checked={draft.schedule}
              onChange={(e) =>
                setDraft({ ...draft, schedule: e.target.checked })
              }
            />{" "}
            Available at certain times
          </label>
          {draft.schedule && (
            <div className={s.formGrid}>
              <label>
                From
                <input
                  type="time"
                  required
                  value={draft.from}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                />
              </label>
              <label>
                Until
                <input
                  type="time"
                  required
                  value={draft.until}
                  onChange={(e) =>
                    setDraft({ ...draft, until: e.target.value })
                  }
                />
              </label>
              <small>Uses this device’s local time.</small>
            </div>
          )}
          <label>
            Extras / modifiers
            <input
              placeholder="e.g. Extra avocado +$2"
              value={draft.modifiers}
              onChange={(e) =>
                setDraft({ ...draft, modifiers: e.target.value })
              }
            />
          </label>
          <label>
            Food notes
            <textarea
              placeholder="Ingredients, allergens, or dietary notes"
              value={draft.attributes}
              onChange={(e) =>
                setDraft({ ...draft, attributes: e.target.value })
              }
            />
          </label>
          <small>
            Verify ingredients and allergens before publishing. These demo notes
            stay in this browser.
          </small>
        </details>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <div className={s.dialogActions}>
          <button type="button" className={s.secondary} onClick={onClose}>
            Cancel
          </button>
          <button className={s.primary} type="submit">
            {dish ? "Save Changes" : "Add Dish"}
            <Check size={18} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SettingsPanel({
  settings,
  onSave,
  onSetup,
}: {
  settings: MerchantSettings;
  onSave: (settings: MerchantSettings) => void;
  onSetup: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [audioError, setAudioError] = useState("");
  const audio = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  function notification<K extends keyof Notifications>(
    key: K,
    value: Notifications[K],
  ) {
    setDraft({
      ...draft,
      notifications: { ...draft.notifications, [key]: value },
    });
  }
  async function testSound() {
    try {
      setAudioError("");
      audio.current ??= new AudioContext();
      await audio.current.resume();
      const oscillator = audio.current.createOscillator();
      const gain = audio.current.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(
        (draft.notifications.volume / 100) * 0.2,
        audio.current.currentTime,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.current.currentTime + 0.4,
      );
      oscillator.connect(gain);
      gain.connect(audio.current.destination);
      oscillator.start();
      oscillator.stop(audio.current.currentTime + 0.4);
    } catch {
      setAudioError("Sound is unavailable in this browser.");
    }
  }
  return (
    <form
      className={s.settingsForm}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <section className={s.panel}>
        <h2>Your restaurant</h2>
        <div className={s.form}>
          <label>
            Restaurant name
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Contact email
            <input
              required
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </label>
        </div>
      </section>
      <section className={s.panel}>
        <h2>Notifications</h2>
        <p className={s.muted}>Choose what you want to hear about.</p>
        <div className={s.notificationList}>
          {(
            [
              ["orders", "Order alerts"],
              ["attention", "Problems needing attention"],
              ["stock", "Stock alerts"],
              ["delivery", "Delivery updates"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={s.notificationRow}>
              {label}
              <input
                type="checkbox"
                checked={draft.notifications[key]}
                onChange={(e) => notification(key, e.target.checked)}
              />
            </label>
          ))}
        </div>
        <details className={s.advanced}>
          <summary>
            <Volume2 size={19} /> Sound & volume
          </summary>
          <label className={s.checkLabel}>
            <input
              type="checkbox"
              checked={draft.notifications.sound}
              onChange={(e) => notification("sound", e.target.checked)}
            />{" "}
            Play alert sounds
          </label>
          <label className={s.checkLabel}>
            <input
              type="checkbox"
              checked={draft.notifications.muted}
              onChange={(e) => notification("muted", e.target.checked)}
            />{" "}
            Mute all sounds
          </label>
          <label className={s.volumeLabel}>
            Volume <output>{draft.notifications.volume}%</output>
            <input
              type="range"
              min="0"
              max="100"
              value={draft.notifications.volume}
              onChange={(e) => notification("volume", Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className={s.secondary}
            disabled={!draft.notifications.sound || draft.notifications.muted}
            onClick={testSound}
          >
            <Volume2 size={18} /> Test Sound
          </button>
          {audioError && <p role="alert">{audioError}</p>}
        </details>
      </section>
      <div className={s.sectionRow}>
        <button className={s.secondary} type="button" onClick={onSetup}>
          {settings.onboardingDone
            ? "Review Setup"
            : settings.onboardingStep > 0
              ? "Resume Setup"
              : "Restaurant Setup"}
        </button>
        <button className={s.primary} type="submit">
          Save Settings <Check size={18} />
        </button>
      </div>
      <p className={s.demoNote}>
        Preview preferences are saved on this device. Live alerts are not
        connected.
      </p>
    </form>
  );
}

type Message = { role: "assistant" | "user"; text: string };
export function HelpPanel({
  menu,
  onNavigate,
  onAvailability,
}: {
  menu: MenuDish[];
  onNavigate: (tab: string) => void;
  onAvailability: (id: string, available: boolean) => boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{
    id: string;
    name: string;
    available: boolean;
  } | null>(null);
  function ask(text: string) {
    const lower = text.toLowerCase();
    setInput("");
    setPending(null);
    let reply =
      "I can help you find orders, edit a price, or change dish availability. What would you like to do?";
    if (/sold out|unavailable|available/.test(lower)) {
      const exact = menu.filter((d) => lower.includes(d.name.toLowerCase()));
      const candidates = exact.length
        ? exact
        : menu.filter(
            (d) =>
              lower.includes(d.name.toLowerCase()) ||
              d.name
                .toLowerCase()
                .split(" ")
                .some((word) => word.length > 3 && lower.includes(word)),
          );
      if (candidates.length === 1) {
        const d = candidates[0];
        const available = !/sold out|unavailable/.test(lower);
        setPending({ id: d.id, name: d.name, available });
        reply = `Mark ${d.name} ${available ? "available" : "sold out"}? Review the change below.`;
      } else reply = "Which dish? Please use its full name from your menu.";
    } else if (/price|cost/.test(lower))
      reply =
        "Go to Menu, tap Edit on your dish, change the price, then tap Save Changes.";
    else if (/order/.test(lower))
      reply =
        "Open Orders in the sidebar. New orders are under Needs Attention. Preparing orders are under In Progress.";
    else if (/busy|pause|open/.test(lower))
      reply =
        "On Home, tap the restaurant status and choose Open, Busy, or Paused.";
    setMessages((previous) => [
      ...previous,
      { role: "user", text },
      { role: "assistant", text: reply },
    ]);
  }
  return (
    <section className={s.helpPanel}>
      <div className={s.helpIntro}>
        <span className={s.aiIcon}>
          <Sparkles size={29} />
        </span>
        <h2>A little help for your day.</h2>
        <p>What would you like to do?</p>
      </div>
      <div className={s.suggestions}>
        {[
          "How do I change a price?",
          `Mark my ${menu[0]?.name ?? "dish"} sold out.`,
          "Where are my orders?",
        ].map((text) => (
          <button key={text} onClick={() => ask(text)}>
            {text}
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
      {messages.length > 0 && (
        <div className={s.messages} aria-live="polite">
          {messages.slice(-6).map((message, i) => (
            <p
              key={i}
              className={
                message.role === "user" ? s.userMessage : s.assistantMessage
              }
            >
              {message.text}
            </p>
          ))}
        </div>
      )}
      {pending && (
        <div className={s.confirmCard}>
          <strong>
            {pending.name} → {pending.available ? "Available" : "Sold Out"}
          </strong>
          <div className={s.dialogActions}>
            <button className={s.secondary} onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              className={s.primary}
              onClick={() => {
                const changed = onAvailability(pending.id, pending.available);
                setPending(null);
                setMessages((previous) => [
                  ...previous,
                  {
                    role: "assistant",
                    text: changed
                      ? "Done. Your menu has been updated."
                      : "Update the stock or schedule in the dish editor first.",
                  },
                ]);
              }}
            >
              Confirm Change
            </button>
          </div>
        </div>
      )}
      <form
        className={s.askForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) ask(input.trim());
        }}
      >
        <label className={s.srOnly} htmlFor="merchant-question">
          Ask MoodFood
        </label>
        <input
          id="merchant-question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Ask me something…"
        />
        <button
          className={s.primary}
          disabled={!input.trim()}
          aria-label="Send question"
        >
          <Send size={21} />
        </button>
      </form>
      <div className={s.helpLinks}>
        <button onClick={() => onNavigate("Menu")}>Open Menu</button>
        <button onClick={() => onNavigate("Orders")}>Open Orders</button>
      </div>
      <p className={s.demoNote}>
        Preview help · Guided answers for menu and order tasks.
      </p>
    </section>
  );
}
export function Onboarding({
  state,
  onChange,
  onClose,
  onAdd,
  onImport,
}: {
  state: MerchantState;
  onChange: (settings: MerchantSettings) => void;
  onClose: () => void;
  onAdd: () => void;
  onImport: (items: MenuDish[]) => void;
}) {
  const step = state.settings.onboardingStep;
  const [importing, setImporting] = useState(false);
  const names = [
    "Your Restaurant",
    "Your Menu",
    "Quick Review",
    "You’re Ready!",
  ];
  return (
    <Modal title={names[step]} onClose={onClose}>
      <div className={s.setupProgress} aria-label={`Step ${step + 1} of 4`}>
        {names.map((name, i) => (
          <span key={name} className={i <= step ? s.progressDone : ""} />
        ))}
      </div>
      <p className={s.muted}>Step {step + 1} of 4 · Saved automatically</p>
      {step === 0 && (
        <div className={s.form}>
          <label>
            Restaurant name
            <input
              required
              value={state.settings.name}
              onChange={(e) =>
                onChange({ ...state.settings, name: e.target.value })
              }
            />
          </label>
          <label>
            Contact email
            <input
              type="email"
              value={state.settings.email}
              onChange={(e) =>
                onChange({ ...state.settings, email: e.target.value })
              }
            />
          </label>
        </div>
      )}
      {step === 1 && (
        <div className={s.setupTask}>
          <UtensilIntro />
          <h3>{state.menu.length} dishes on your menu</h3>
          <div className={s.dialogActions}>
            <button className={s.secondary} onClick={() => setImporting(true)}>
              <Upload size={18} /> Import Menu
            </button>
            <button className={s.primary} onClick={onAdd}>
              <Plus size={18} /> Add a Dish
            </button>
          </div>
          {importing && (
            <MenuImport
              onClose={() => setImporting(false)}
              onImport={(items) => {
                onImport(items);
                setImporting(false);
              }}
            />
          )}
        </div>
      )}
      {step === 2 && (
        <div className={s.setupReview}>
          <h3>{state.settings.name}</h3>
          <p>{state.settings.email}</p>
          <p>
            {state.menu.length} dishes ·{" "}
            {state.menu.filter((d) => isAvailable(d)).length} available
          </p>
          <p>
            Check prices, ingredients, and allergens before taking real orders.
          </p>
        </div>
      )}
      {step === 3 && (
        <div className={s.setupTask}>
          <PackageCheck size={54} />
          <h3>You’re ready to explore.</h3>
          <p>This preview keeps your changes on this device.</p>
        </div>
      )}
      <div className={s.dialogActions}>
        {step > 0 && (
          <button
            className={s.secondary}
            onClick={() =>
              onChange({ ...state.settings, onboardingStep: step - 1 })
            }
          >
            Back
          </button>
        )}
        <button
          className={s.primary}
          disabled={
            step === 0 &&
            (!state.settings.name.trim() ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.settings.email))
          }
          onClick={() => {
            if (step === 3) {
              onChange({ ...state.settings, onboardingDone: true });
              onClose();
            } else onChange({ ...state.settings, onboardingStep: step + 1 });
          }}
        >
          {step === 3 ? "Go to Home" : "Continue"}
          <ChevronRight size={18} />
        </button>
      </div>
    </Modal>
  );
}
function UtensilIntro() {
  return <PackageCheck size={42} />;
}
