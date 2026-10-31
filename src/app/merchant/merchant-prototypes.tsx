"use client";
import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { z } from "zod";
import { Modal } from "./merchant-panels";
import type { MenuDish, Order } from "./merchant-data";
import s from "./merchant.module.css";

// Session-only prototype data: no requests, customer contacts, or credentials.
function useDemoSession<T>(key: string, initial: T, schema: z.ZodType<T>) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) setValue(schema.parse(JSON.parse(saved)));
    } catch {
      setError(
        "Session storage unavailable. Changes last until you leave this screen.",
      );
    }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (loaded)
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        setError("Could not save this demo session.");
      }
  }, [key, value, loaded]);
  return { value, setValue, error };
}

export function POSSync({ menu }: { menu: MenuDish[] }) {
  const { value, setValue, error } = useDemoSession(
    "merchant-demo-sync",
    { time: "", reviewed: false },
    z.object({ time: z.string(), reviewed: z.boolean() }),
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  async function sync() {
    setBusy(true);
    setFailure("");
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (!navigator.onLine)
      setFailure("Demo sync unavailable while offline. Reconnect and retry.");
    else setValue({ time: new Date().toISOString(), reviewed: false });
    setBusy(false);
  }
  return (
    <section
      className={`${s.panel} ${s.syncPanel}`}
      aria-label="Demo POS synchronization"
    >
      <div className={s.sectionRow}>
        <div>
          <h2>POS Sync</h2>
          <p className={s.muted}>Demo only · No POS connected</p>
        </div>
        <button
          type="button"
          className={`${s.secondary} ${s.syncRefresh}`}
          aria-label="Sync Now"
          title="Sync Now"
          aria-busy={busy}
          disabled={busy}
          onClick={sync}
        >
          <RefreshCw
            size={20}
            aria-hidden="true"
            className={busy ? s.syncSpinning : undefined}
          />
        </button>
      </div>
      <p role="status">
        {busy
          ? "Checking fictional POS changes…"
          : value.time
            ? `Last successful demo sync: ${new Date(value.time).toLocaleString()}`
            : "Not synced this session"}
      </p>
      {(failure || error) && <p role="alert">{failure || error}</p>}
      {value.time && (
        <details className={s.details}>
          <summary>Changed items & conflicts</summary>
          {menu.length ? (
            <>
              <p>{menu[0].name} · Availability checked</p>
              <p>
                {value.reviewed
                  ? "Reviewed · Menu unchanged."
                  : `Demo price mismatch · Review needed`}
              </p>
              <p>Demo only · Menu unchanged.</p>
              <button
                type="button"
                className={s.secondary}
                disabled={value.reviewed}
                onClick={() => setValue({ ...value, reviewed: true })}
              >
                Keep current menu
              </button>
            </>
          ) : (
            <p>No menu items to compare. Add a dish first.</p>
          )}
        </details>
      )}
    </section>
  );
}

export function POSSettings() {
  const { value, setValue, error } = useDemoSession(
    "merchant-demo-pos-settings",
    { provider: "Not selected", direction: "Import for review" },
    z.object({ provider: z.string(), direction: z.string() }),
  );
  return (
    <section className={s.panel}>
      <h2>POS connection</h2>
      <p className={s.muted}>Future integration · Disconnected</p>
      <div className={s.prototypeGrid}>
        <label>
          Preferred POS
          <select
            value={value.provider}
            onChange={(e) => setValue({ ...value, provider: e.target.value })}
          >
            {["Not selected", "Square", "Toast", "Clover", "Other"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Sync preference
          <select
            value={value.direction}
            onChange={(e) => setValue({ ...value, direction: e.target.value })}
          >
            <option value="Import for review">Review Changes First</option>
            <option>Availability only</option>
          </select>
        </label>
      </div>
      <p>
        Preferences only. Connection and credentials are unavailable in this
        demo.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

const sampleSales = [
  { name: "Harvest bowl", counts: [18, 112, 486] },
  { name: "Miso salmon bowl", counts: [12, 86, 364] },
  { name: "Avocado toast", counts: [9, 63, 270] },
  { name: "Green glow", counts: [7, 51, 221] },
];
export function MenuInsights() {
  const [period, setPeriod] = useState(0);
  return (
    <section className={s.panel}>
      <h2>Menu Insights</h2>
      <p className={s.muted}>Fictional demo data · Orders per dish</p>
      <label className={`${s.prototypeStack} ${s.insightsFilter}`}>
        Date range
        <select
          value={period}
          aria-label="Date range"
          onChange={(event) => setPeriod(Number(event.target.value))}
        >
          {["Today", "7 Days", "30 Days"].map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <ol className={s.insightList}>
        {sampleSales.map((d) => (
          <li key={d.name}>
            <div className={s.row}>
              <span>{d.name}</span>
              <strong>{d.counts[period]} orders</strong>
            </div>
            <meter
              aria-label={`${d.name} orders`}
              min={0}
              max={sampleSales[0].counts[period]}
              value={d.counts[period]}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

type History = { text: string; time: string; kind: "message" | "delay" };
export function OrderCommunication({
  order,
  onDelay,
}: {
  order: Order;
  onDelay: (id: string, minutes: number) => void;
}) {
  const {
    value: history,
    setValue: setHistory,
    error,
  } = useDemoSession<History[]>(
    `merchant-demo-order-${order.id}`,
    [],
    z.array(
      z.object({
        text: z.string(),
        time: z.string(),
        kind: z.enum(["message", "delay"]),
      }),
    ),
  );
  const [panel, setPanel] = useState<"message" | "delay" | null>(null);
  const [text, setText] = useState("");
  const [delay, setDelay] = useState("5");
  const [status, setStatus] = useState("");
  const minutes = Number(delay);
  const valid = Number.isInteger(minutes) && minutes >= 1 && minutes <= 120;
  function record(kind: History["kind"], content: string) {
    setHistory((previous) => [
      ...previous,
      { kind, text: content, time: new Date().toISOString() },
    ]);
  }
  return (
    <>
      <div className={s.inlineActions}>
        <button
          type="button"
          className={s.secondary}
          onClick={() => {
            setPanel("message");
            setStatus("");
          }}
        >
          <MessageCircle size={18} aria-hidden="true" />
          Contact Customer
        </button>
        <button
          type="button"
          className={s.secondary}
          onClick={() => {
            setPanel("delay");
            setStatus("");
          }}
        >
          Report Delay
        </button>
      </div>
      {panel && (
        <Modal
          title={`${panel === "message" ? "Contact Customer" : "Report Delay"} · #${order.id}`}
          onClose={() => setPanel(null)}
        >
          <p className={s.demoNote}>
            Demo only · No messages or calls leave this browser.
          </p>
          {panel === "message" ? (
            <>
              <div className={s.prototypeStack}>
                <label>
                  Message template
                  <select value="" onChange={(e) => setText(e.target.value)}>
                    <option value="">Choose a template</option>
                    {[
                      "Your order is being prepared.",
                      "We need a little more time. Thank you for your patience.",
                      "Your order is ready for pickup.",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Order message
                  <textarea
                    maxLength={500}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Use fictional details only"
                  />
                </label>
              </div>
              <div className={s.dialogActions}>
                <button type="button" className={s.secondary} disabled>
                  Masked call · Coming later
                </button>
                <button
                  type="button"
                  className={s.primary}
                  disabled={!text.trim()}
                  onClick={() => {
                    record("message", text.trim());
                    setText("");
                    setStatus("Demo message recorded. Nothing sent.");
                  }}
                >
                  Simulate Message
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className={s.inlineActions}
                role="group"
                aria-label="Additional delay"
              >
                {[5, 10, 15, 20].map((x) => (
                  <button
                    type="button"
                    className={s.secondary}
                    aria-pressed={delay === String(x)}
                    key={x}
                    onClick={() => {
                      setDelay(String(x));
                      setStatus("");
                    }}
                  >
                    {x} min
                  </button>
                ))}
              </div>
              <label className={s.prototypeStack}>
                Custom delay (1–120 min)
                <input
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={delay}
                  onChange={(e) => {
                    setDelay(e.target.value);
                    setStatus("");
                  }}
                />
              </label>
              <p>
                {status
                  ? `Current preparation estimate: ${order.minutes} minutes`
                  : valid
                    ? `Revised preparation estimate: ${order.minutes + minutes} minutes`
                    : "Enter a whole number from 1 to 120."}
              </p>
              <button
                type="button"
                className={s.primary}
                disabled={!valid || !!status}
                onClick={() => {
                  onDelay(order.id, minutes);
                  record(
                    "delay",
                    `+${minutes} min · Revised prep: ${order.minutes + minutes} min. Courier notification simulated.`,
                  );
                  setStatus(
                    "Delay confirmed · Demo courier notification recorded. Nothing sent.",
                  );
                }}
              >
                Confirm Delay
              </button>
            </>
          )}
          <p role="status">{status}</p>
          {error && <p role="alert">{error}</p>}
          <h3>Order communication history</h3>
          {history.length ? (
            <ul className={s.prototypeHistory}>
              {history.map((h, i) => (
                <li key={i}>
                  <strong>
                    {h.kind === "message" ? "Demo message" : "Demo delay"}
                  </strong>
                  <p>{h.text}</p>
                  <small>{new Date(h.time).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No communication for this order yet.</p>
          )}
        </Modal>
      )}
    </>
  );
}
