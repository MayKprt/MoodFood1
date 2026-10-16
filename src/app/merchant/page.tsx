"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Home,
  Leaf,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  BarChart3,
} from "lucide-react";
import {
  acceptOrder,
  initialState,
  isAvailable,
  restoreState,
  STORAGE_KEY,
  type MerchantState,
  type MenuDish,
} from "./merchant-data";
import {
  DishEditor,
  HelpPanel,
  MenuPanel,
  Modal,
  Onboarding,
  OrderList,
  SettingsPanel,
} from "./merchant-panels";
import s from "./merchant.module.css";

const navigation = [
  { name: "Home", icon: Home },
  { name: "Orders", icon: ShoppingBag },
  { name: "Menu", icon: UtensilsCrossed },
  { name: "Settings", icon: Settings },
];
export default function Merchant() {
  const [tab, setTab] = useState("Home");
  const [state, setState] = useState<MerchantState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [filter, setFilter] = useState("Needs Attention");
  const [editing, setEditing] = useState<MenuDish | null | undefined>(
    undefined,
  );
  const [setup, setSetup] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [insights, setInsights] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(restoreState(saved));
    } catch {
      setStorageError(
        "Saved preview data could not be read. Changes will not overwrite it.",
      );
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || storageError) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, version: 2 }),
      );
    } catch {
      setStorageError(
        "Changes can’t be saved on this device. Keep this page open.",
      );
    }
  }, [state, loaded, storageError]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const attention = state.orders.filter((o) =>
    ["New", "Needs Attention"].includes(o.status),
  ).length;
  const preparing = state.orders.filter((o) => o.status === "Preparing").length;
  const unavailable = state.menu.filter((d) => !isAvailable(d)).length;
  const mode = state.settings.mode ?? (state.settings.open ? "Open" : "Paused");
  function navigate(name: string) {
    setTab(name);
    setStatusOpen(false);
  }
  function orderAction(id: string) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    if (["New", "Needs Attention"].includes(order.status)) {
      const result = acceptOrder(state, id);
      if (result.error) {
        setNotice(result.error);
        return;
      }
      setState(result.state);
      setNotice(`Order #${id} accepted.`);
    } else {
      setState((previous) => ({
        ...previous,
        orders: previous.orders.map((o) =>
          o.id === id
            ? { ...o, status: o.status === "Preparing" ? "Ready" : "Completed" }
            : o,
        ),
      }));
      setNotice(
        order.status === "Preparing"
          ? `Order #${id} is ready.`
          : `Order #${id} completed.`,
      );
    }
  }
  function availability(id: string, available?: boolean) {
    const dish = state.menu.find((d) => d.id === id);
    if (!dish) return false;
    const next = available ?? !isAvailable(dish);
    if (next && dish.trackQuantity && dish.quantity === 0) {
      setNotice("Add stock before making this dish available.");
      setEditing(dish);
      return false;
    }
    if (next && dish.schedule && !isAvailable({ ...dish, available: true })) {
      setNotice("Update the dish’s schedule to make it available now.");
      setEditing(dish);
      return false;
    }
    setState((previous) => ({
      ...previous,
      menu: previous.menu.map((d) =>
        d.id === id ? { ...d, available: next } : d,
      ),
    }));
    setNotice(`${dish.name} marked ${next ? "available" : "sold out"}.`);
    return true;
  }
  function saveDish(dish: MenuDish) {
    const previous = state.menu.find((d) => d.id === dish.id);
    if (previous && previous.name !== dish.name)
      dish = {
        ...dish,
        previousNames: [...new Set([...dish.previousNames, previous.name])],
      };
    if (
      state.menu.some(
        (d) =>
          d.id !== dish.id && d.name.toLowerCase() === dish.name.toLowerCase(),
      )
    ) {
      setNotice(
        "A dish with this name already exists. Choose a different name.",
      );
      return;
    }
    setState((previous) => ({
      ...previous,
      menu: previous.menu.some((d) => d.id === dish.id)
        ? previous.menu.map((d) => (d.id === dish.id ? dish : d))
        : [...previous.menu, dish],
    }));
    setEditing(undefined);
    setNotice("Dish saved.");
  }
  function addImported(items: MenuDish[]) {
    const names = new Set(state.menu.map((d) => d.name.toLowerCase()));
    const unique = items.filter((d) => {
      const key = d.name.toLowerCase();
      if (names.has(key)) return false;
      names.add(key);
      return true;
    });
    setState((previous) => ({
      ...previous,
      menu: [...previous.menu, ...unique],
    }));
    setNotice(
      `${unique.length} dishes added.${unique.length < items.length ? " Existing dish names were skipped." : ""}`,
    );
  }
  return (
    <div className={s.shell}>
      <a className={s.skipLink} href="#merchant-main">
        Skip to content
      </a>
      <aside className={s.sidebar}>
        <a className={s.brand} href="/merchant">
          <span className={s.brandSymbol}>
            <UtensilsCrossed size={21} />
          </span>
          <span>
            moodfood<span className={s.brandDot}>.</span>
            <small>MERCHANT</small>
          </span>
        </a>
        <nav className={s.nav} aria-label="Merchant navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => navigate(name)}
              aria-current={tab === name ? "page" : undefined}
              className={tab === name ? s.activeNav : ""}
            >
              <Icon size={22} />
              <span>{name}</span>
              {name === "Orders" && attention > 0 && (
                <span className={s.navCount}>{attention}</span>
              )}
            </button>
          ))}
        </nav>
        <div className={s.sidebarBottom}>
          <span className={s.restaurantAvatar}>
            <Leaf size={21} />
          </span>
          <strong>{state.settings.name}</strong>
          <span className={s.previewLabel}>Demo workspace</span>
          <a href="/">Customer app ↗</a>
        </div>
      </aside>
      <main id="merchant-main" className={s.main}>
        <header className={s.header}>
          <div>
            {tab === "Home" ? (
              <>
                <h1>
                  Good afternoon <span aria-hidden="true">👋</span>
                </h1>
                <p>{state.settings.name}</p>
              </>
            ) : (
              <>
                <p className={s.breadcrumb}>{state.settings.name}</p>
                <h1>{tab === "AI Help" ? "Ask MoodFood" : tab}</h1>
              </>
            )}
          </div>
          {tab === "Home" ? (
            <div className={s.statusControl}>
              <button
                className={`${s.storeStatus} ${mode === "Busy" ? s.busyStatus : mode === "Paused" ? s.pausedStatus : ""}`}
                aria-expanded={statusOpen}
                aria-controls="restaurant-status"
                onClick={() => setStatusOpen(!statusOpen)}
              >
                <span className={s.statusDot} />
                {mode}
                <ChevronDown size={18} />
              </button>
              {statusOpen && (
                <div
                  id="restaurant-status"
                  className={s.statusOptions}
                  role="group"
                  aria-label="Restaurant status"
                >
                  {["Open", "Busy", "Paused"].map((value) => (
                    <button
                      key={value}
                      aria-pressed={mode === value}
                      onClick={() => {
                        setState((previous) => ({
                          ...previous,
                          settings: {
                            ...previous.settings,
                            mode: value as "Open" | "Busy" | "Paused",
                            open: value !== "Paused",
                          },
                        }));
                        setStatusOpen(false);
                        setNotice(
                          value === "Busy"
                            ? "Busy mode on. Allow a little extra preparation time."
                            : `Restaurant ${value.toLowerCase()}.`,
                        );
                      }}
                    >
                      {value}
                      {value === mode && <Check size={17} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : tab !== "AI Help" ? (
            <button
              className={s.headerHelp}
              onClick={() => navigate("AI Help")}
              aria-label="Ask MoodFood"
            >
              <Sparkles size={20} />
              <span>Ask MoodFood</span>
            </button>
          ) : null}
        </header>
        {storageError && (
          <p role="alert" className={s.storageError}>
            {storageError}
          </p>
        )}
        {!loaded ? (
          <p className={s.muted}>Opening your kitchen…</p>
        ) : (
          <>
            {tab === "Home" && (
              <div className={s.homeContent}>
                <section
                  className={`${s.attentionCard} ${attention === 0 ? s.caughtUp : ""}`}
                  aria-labelledby="attention-title"
                >
                  <div className={s.attentionIcon}>
                    {attention > 0 ? (
                      <CircleAlert size={29} />
                    ) : (
                      <Check size={29} />
                    )}
                  </div>
                  <div className={s.attentionCopy}>
                    <h2 id="attention-title">
                      Needs Attention{" "}
                      {attention > 0 && <span>{attention}</span>}
                    </h2>
                    <p>
                      {attention > 0
                        ? `${attention} ${attention === 1 ? "order needs" : "orders need"} your help`
                        : "All caught up! ✓"}
                    </p>
                    <button
                      className={attention > 0 ? s.primary : s.secondary}
                      onClick={() => {
                        setFilter(
                          attention > 0 ? "Needs Attention" : "In Progress",
                        );
                        navigate("Orders");
                      }}
                    >
                      {attention > 0 ? "Review Now" : "View Orders"}
                      <ArrowRight size={19} />
                    </button>
                  </div>
                </section>
                <section aria-labelledby="quick-actions">
                  <h2 id="quick-actions" className={s.sectionTitle}>
                    Quick Actions
                  </h2>
                  <div className={s.actionGrid}>
                    {[
                      {
                        title: "Update Availability",
                        line: "What’s on the menu?",
                        icon: Package,
                        color: "peach",
                        action: () => navigate("Menu"),
                      },
                      {
                        title: "Add a Dish",
                        line: "Something new to love",
                        icon: UtensilsCrossed,
                        color: "green",
                        action: () => {
                          setEditing(null);
                        },
                      },
                      {
                        title: "View Orders",
                        line: "Keep things moving",
                        icon: ShoppingBag,
                        color: "blue",
                        action: () => {
                          setFilter(
                            attention > 0 ? "Needs Attention" : "In Progress",
                          );
                          navigate("Orders");
                        },
                      },
                    ].map(({ title, line, icon: Icon, color, action }) => (
                      <button
                        className={s.actionTile}
                        key={title}
                        onClick={action}
                      >
                        <span className={`${s.tileIcon} ${s[color]}`}>
                          <Icon size={27} />
                        </span>
                        <span className={s.tileText}>
                          <strong>{title}</strong>
                          <small>{line}</small>
                        </span>
                        <ChevronRight className={s.tileArrow} size={18} />
                      </button>
                    ))}
                  </div>
                </section>
                <section aria-labelledby="today-overview">
                  <div className={s.sectionRow}>
                    <h2 id="today-overview" className={s.sectionTitle}>
                      Today at a glance
                    </h2>
                    <button
                      className={s.insightsLink}
                      onClick={() => setInsights(true)}
                    >
                      Insights <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className={s.overview}>
                    {[
                      ["Today’s Orders", state.orders.length],
                      ["Orders Preparing", preparing],
                      ["Dishes Sold Out", unavailable],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <strong>{value}</strong>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
            {tab === "Orders" && (
              <OrderList
                orders={state.orders}
                menu={state.menu}
                filter={filter}
                setFilter={setFilter}
                onAction={orderAction}
                onReject={(id) => {
                  setState((previous) => ({
                    ...previous,
                    orders: previous.orders.map((o) =>
                      o.id === id ? { ...o, status: "Cancelled" } : o,
                    ),
                  }));
                  setNotice(`Order #${id} cancelled.`);
                }}
              />
            )}
            {tab === "Menu" && (
              <MenuPanel
                menu={state.menu}
                onToggle={availability}
                onEdit={setEditing}
                onAdd={() => setEditing(null)}
                onImport={addImported}
              />
            )}
            {tab === "Settings" && (
              <SettingsPanel
                settings={state.settings}
                onSave={(settings) => {
                  setState((previous) => ({ ...previous, settings }));
                  setNotice("Settings saved.");
                }}
                onSetup={() => setSetup(true)}
              />
            )}
            {tab === "AI Help" && (
              <HelpPanel
                menu={state.menu}
                onNavigate={navigate}
                onAvailability={availability}
              />
            )}
          </>
        )}
        <footer className={s.footer}>
          <span>Good food. A smoother day.</span>
        </footer>
      </main>
      <button className={s.assistantButton} onClick={() => navigate("AI Help")}>
        <Sparkles size={19} /> Ask MoodAI
      </button>
      <div
        role="status"
        aria-live="polite"
        className={notice ? s.toast : s.srOnly}
      >
        {notice}
        {notice && (
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <Check size={18} />
          </button>
        )}
      </div>
      {setup && (
        <Onboarding
          state={state}
          onChange={(settings) =>
            setState((previous) => ({ ...previous, settings }))
          }
          onClose={() => {
            setSetup(false);
            if (state.settings.onboardingStep === 3) navigate("Home");
          }}
          onAdd={() => setEditing(null)}
          onImport={addImported}
        />
      )}
      {editing !== undefined && (
        <DishEditor
          key={editing?.id ?? "new"}
          dish={editing}
          onSave={saveDish}
          onClose={() => setEditing(undefined)}
        />
      )}
      {insights && (
        <Modal title="Today’s Insights" onClose={() => setInsights(false)}>
          <div className={s.insightIntro}>
            <BarChart3 size={35} />
            <p>A quick look at your demo orders.</p>
          </div>
          <div className={s.insightRows}>
            <p>
              <span>Completed orders</span>
              <strong>
                {state.orders.filter((o) => o.status === "Completed").length}
              </strong>
            </p>
            <p>
              <span>Completed sales</span>
              <strong>
                $
                {state.orders
                  .filter((o) => o.status === "Completed")
                  .reduce((total, o) => total + o.total, 0)
                  .toFixed(2)}
              </strong>
            </p>
            <p>
              <span>Menu dishes</span>
              <strong>{state.menu.length}</strong>
            </p>
          </div>
          <p className={s.demoNote}>
            Sample data · Discovery analytics are not connected.
          </p>
        </Modal>
      )}
    </div>
  );
}
