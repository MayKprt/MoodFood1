"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  Compass,
  Heart,
  MapPin,
  Menu,
  Receipt,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useMoodFood, type View, type MoodFoodApp } from "@/lib/use-moodfood";
import {
  defaultAddress,
  emptyCart,
  type CartItem,
  type Address,
} from "@/lib/domain";
import { dishById, restaurantById } from "@/lib/data";
import { addItem } from "@/lib/cart";
import { Discover } from "./discover";
import { Deck, FaceOff, Finalists } from "./discovery-flow";
import { DishDetails } from "./dish-details";
import { CartView, OrdersView } from "./ordering";
import { Profile } from "./profile";
import { Brand, DishTile, EmptyState, Modal } from "./ui";
const nav = [
  { view: "discover" as const, label: "Discover", icon: Compass },
  { view: "saved" as const, label: "Saved", icon: Bookmark },
  { view: "orders" as const, label: "Orders", icon: Receipt },
  { view: "profile" as const, label: "Profile", icon: UserRound },
];
type Overlay = "address" | "auth" | "help" | "switch" | null;
export default function MoodFoodApp() {
  const app = useMoodFood();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [dishId, setDishId] = useState<string | null>(null);
  const [pending, setPending] = useState<CartItem | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousView = useRef(app.view);
  const dish = dishId ? dishById(dishId) : undefined;
  const activeView = ["deck", "shortlist", "faceoff"].includes(app.view)
    ? "discover"
    : app.view;
  const itemCount = app.cart.items.reduce((s, i) => s + i.quantity, 0);
  useEffect(() => {
    if (previousView.current !== app.view) {
      mainRef.current?.focus({ preventScroll: true });
      previousView.current = app.view;
    }
  }, [app.view]);
  function openDish(id: string) {
    setOverlay(null);
    setDishId(id);
  }
  function onAdd(item: CartItem) {
    try {
      app.setCart(addItem(app.cart, item));
      setDishId(null);
      app.setNotice("Good choice. Added to your cart.");
    } catch (e) {
      setDishId(null);
      if (app.cart.restaurantId !== dishById(item.dishId)?.restaurantId) {
        setPending(item);
        setOverlay("switch");
      } else app.setError((e as Error).message);
    }
  }
  function go(view: View) {
    setDishId(null);
    setOverlay(null);
    app.setView(view);
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand-button"
            onClick={() => go("discover")}
            aria-label="MoodFood home"
          >
            <Brand />
          </button>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map(({ view, label }) => (
              <button
                key={view}
                onClick={() => go(view)}
                className={activeView === view ? "active" : ""}
                aria-current={activeView === view ? "page" : undefined}
              >
                {label}
                {view === "saved" && app.saved.length > 0 && (
                  <span className="nav-count">{app.saved.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="location-button"
              onClick={() => setOverlay("address")}
            >
              <MapPin size={16} />
              <span>
                <small>DELIVERING TO</small>
                <strong>
                  {app.address.street || `Brooklyn, ${app.address.zip}`}
                </strong>
              </span>
              <ChevronDown size={14} />
            </button>
            <button
              className={`header-cart ${app.view === "cart" ? "active" : ""}`}
              onClick={() => go("cart")}
              aria-label={`Cart, ${itemCount} items`}
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && <span>{itemCount}</span>}
            </button>
            <button
              className="profile-button"
              aria-label={
                app.user?.kind === "account"
                  ? "Your profile"
                  : "Sign in or view guest profile"
              }
              onClick={() =>
                app.user?.kind === "account"
                  ? go("profile")
                  : setOverlay("auth")
              }
            >
              <UserRound size={19} />
            </button>
          </div>
        </div>
      </header>
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="main-content"
      >
        {app.error && (
          <div role="alert" className="error-banner global-error">
            <span>{app.error}</span>
            {!app.ready && (
              <button onClick={() => void app.loadSession()}>
                Retry connection
              </button>
            )}
            <button aria-label="Dismiss error" onClick={() => app.setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {app.view === "discover" && (
          <Discover
            app={app}
            onDish={openDish}
            onAuth={() => setOverlay("auth")}
          />
        )}
        {app.view === "deck" && <Deck app={app} onDish={openDish} />}
        {app.view === "shortlist" && <Finalists app={app} onDish={openDish} />}
        {app.view === "faceoff" && <FaceOff app={app} onDish={openDish} />}
        {app.view === "saved" && (
          <section className="flow-page">
            <div className="page-intro align-left">
              <span className="eyebrow">GOOD TASTE, SAVED FOR LATER</span>
              <h1>
                For a future <em>food mood.</em>
              </h1>
              <p>
                A little collection of “ooh, maybe tomorrow.” Prices and
                availability may change.
              </p>
            </div>
            {!app.saved.length ? (
              <EmptyState
                icon={<Bookmark size={30} />}
                title="Save a little delicious for later."
                description="Tap the bookmark on any dish. A save is separate from your shortlist."
                action="Explore the menu"
                onAction={() => go("discover")}
              />
            ) : (
              <div className="dish-grid">
                {app.saved
                  .map((id) => dishById(id))
                  .filter((d) => !!d)
                  .map((d) => (
                    <div key={d.id}>
                      {!d.available && (
                        <p className="inline-info">Currently unavailable</p>
                      )}
                      <DishTile
                        dish={d}
                        saved
                        onSave={() => app.toggleSave(d.id)}
                        onOpen={() => openDish(d.id)}
                      />
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}
        {app.view === "cart" && (
          <CartView
            app={app}
            onAddress={() => setOverlay("address")}
            onHelp={() => setOverlay("help")}
          />
        )}
        {app.view === "orders" && (
          <OrdersView app={app} onHelp={() => setOverlay("help")} />
        )}
        {app.view === "profile" && (
          <Profile
            key={app.user?.id}
            app={app}
            onAddress={() => setOverlay("address")}
            onAuth={() => setOverlay("auth")}
          />
        )}
      </main>
      <footer className="site-footer">
        <Brand />
        <span>Good food. A good mood. A little less thinking.</span>
        <button onClick={() => setOverlay("help")}>
          About the demo <ArrowUpRight size={13} />
        </button>
        <small>Fictional kitchens · Original generated imagery</small>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => go(view)}
            className={activeView === view ? "active" : ""}
            aria-current={activeView === view ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{label}</span>
            {view === "saved" && app.saved.length > 0 && (
              <i>{app.saved.length}</i>
            )}
          </button>
        ))}
      </nav>
      {app.notice && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Check size={15} />
          </span>
          {app.notice}
          <button
            onClick={() => app.setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <Modal
        open={!!dish}
        title={dish?.name || "Dish details"}
        onClose={() => setDishId(null)}
        className="dish-modal"
      >
        {dish && (
          <DishDetails key={dish.id} dish={dish} app={app} onAdd={onAdd} />
        )}
      </Modal>
      <Modal
        open={overlay === "address"}
        title="Good food, coming your way."
        description="Manual entry is all you need. No location permission required."
        onClose={() => setOverlay(null)}
      >
        {overlay === "address" && (
          <AddressForm app={app} onDone={() => setOverlay(null)} />
        )}
      </Modal>
      <Modal
        open={overlay === "auth"}
        title="Pull up a seat."
        description="Your next favorite meal starts here."
        onClose={() => setOverlay(null)}
      >
        {overlay === "auth" && (
          <AuthForm app={app} onDone={() => setOverlay(null)} />
        )}
      </Modal>
      <Modal
        open={overlay === "switch"}
        title="One kitchen at a time."
        description="For this MVP, each delivery comes from a single kitchen."
        onClose={() => {
          setOverlay(null);
          setPending(null);
        }}
      >
        <div className="modal-body">
          <p>
            Your cart has food from{" "}
            {app.cart.restaurantId
              ? restaurantById(app.cart.restaurantId).name
              : "another kitchen"}
            . Start a new cart to add this dish? Your current cart will be
            replaced.
          </p>
          <div className="form-actions">
            <button
              className="primary-button"
              onClick={() => {
                if (pending) app.setCart(addItem(emptyCart, pending));
                setPending(null);
                setOverlay(null);
                app.setNotice("New kitchen, new cart. Your dish is added.");
              }}
            >
              Start a new cart <ArrowRight size={17} />
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setPending(null);
                setOverlay(null);
              }}
            >
              Keep my cart
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={overlay === "help"}
        title="A little about this demo."
        onClose={() => setOverlay(null)}
      >
        <div className="modal-body help-content">
          <span className="demo-badge">CUSTOMER MVP · DEMO MODE</span>
          <h3>Real choices. Simulated orders.</h3>
          <p>
            Discover dishes, save favorites, compare your finalists, and try the
            complete checkout. All kitchens, recipes, prices, and delivery
            updates are fictional. No payment is taken and no food is delivered.
          </p>
          <h3>Your data, your device.</h3>
          <p>
            Guest preferences, addresses, and bookmarks are stored in this
            browser. Configured accounts can sync them through Supabase. Demo
            orders are stored on this development server and scoped to your
            session.
          </p>
          <h3>Allergy information matters.</h3>
          <p>
            Explicit restrictions filter sample recipes. This cannot guarantee
            real-world safety. Always verify ingredients and cross-contact with
            the merchant before ordering real food.
          </p>
          <h3>Support / report an issue</h3>
          <p>
            No live support team is connected to this demo. Please share the
            order number and a description with the developer or repository
            maintainer. Don’t include payment details or sensitive personal
            information.
          </p>
          <button className="primary-button" onClick={() => setOverlay(null)}>
            Got it <Check size={17} />
          </button>
        </div>
      </Modal>
    </>
  );
}
function AddressForm({
  app,
  onDone,
}: {
  app: MoodFoodApp;
  onDone: () => void;
}) {
  const [address, setAddress] = useState<Address>(app.address);
  const [error, setError] = useState("");
  return (
    <form
      className="modal-body address-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          !["11201", "11205", "11217", "11231"].includes(address.zip) ||
          address.city.trim().toLowerCase() !== "brooklyn"
        ) {
          setError(
            "Demo delivery is available in Brooklyn: 11201, 11205, 11217, and 11231.",
          );
          return;
        }
        app.setAddress(address);
        app.setNotice("Delivery address saved on this device.");
        onDone();
      }}
    >
      <p className="inline-info">
        Demo delivery area: Brooklyn ZIP codes 11201, 11205, 11217, and 11231.
        Use a fictional address for this demo.
      </p>
      <label className="form-label" htmlFor="street">
        Street address
      </label>
      <input
        id="street"
        autoComplete="street-address"
        placeholder="123 Sample Street"
        required
        minLength={3}
        maxLength={150}
        value={address.street}
        onChange={(e) => setAddress({ ...address, street: e.target.value })}
      />
      <label className="form-label" htmlFor="apartment">
        Apartment / floor <span>(optional)</span>
      </label>
      <input
        id="apartment"
        maxLength={50}
        value={address.apartment}
        onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
      />
      <div className="form-row">
        <div>
          <label className="form-label" htmlFor="city">
            City
          </label>
          <input
            id="city"
            autoComplete="address-level2"
            required
            maxLength={80}
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="zip">
            ZIP code
          </label>
          <input
            id="zip"
            inputMode="numeric"
            pattern="[0-9]{5}"
            autoComplete="postal-code"
            required
            maxLength={5}
            value={address.zip}
            onChange={(e) => setAddress({ ...address, zip: e.target.value })}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit">
        Save delivery address <ArrowRight size={17} />
      </button>
      <p className="form-help">
        {app.user?.kind === "account"
          ? "Saved to this browser and synced to your configured account."
          : "Saved locally in this browser."}
      </p>
    </form>
  );
}
function AuthForm({ app, onDone }: { app: MoodFoodApp; onDone: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.confirmationRequired) {
        setMessage("Check your email to confirm your account, then sign in.");
        return;
      }
      await app.loadSession();
      app.setNotice("Welcome back. Your account space is ready.");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-body auth-form">
      <div className="auth-welcome">
        <span>✳︎</span>
        <h3>Good food. Your way.</h3>
        <p>
          Start exploring as a guest. No account, no questionnaire, no
          overthinking.
        </p>
      </div>
      <button
        className="primary-button"
        onClick={() => {
          app.setWelcomed(true);
          onDone();
        }}
      >
        Continue as guest <ArrowRight size={17} />
      </button>
      {!app.authConfigured ? (
        <div className="inline-info">
          <strong>Account sign-in isn’t configured yet.</strong>
          <p>
            Guest discovery, bookmarks, preferences, and demo ordering are ready
            to use. Supabase configuration is needed for real account creation.
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={mode === "signin" ? "selected" : ""}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={mode === "signup" ? "selected" : ""}
            >
              Create account
            </button>
          </div>
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="inline-info">
              {message}
            </p>
          )}
          <button className="secondary-button" disabled={busy} type="submit">
            {busy
              ? "One moment…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
            <ArrowUpRight size={17} />
          </button>
        </form>
      )}
    </div>
  );
}
