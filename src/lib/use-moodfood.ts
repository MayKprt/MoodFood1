"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Address,
  Cart,
  DeckState,
  Preferences,
  Selection,
  Order,
  Intent,
  Decision,
  defaultAddress,
  defaultPreferences,
  emptyCart,
  decide,
  undo,
} from "./domain";
import { buildDeck, parseIntent } from "./recommendations";
import { preferencesSchema, addressSchema } from "./server/validation";
import { z } from "zod";
export type View =
  | "discover"
  | "deck"
  | "shortlist"
  | "faceoff"
  | "saved"
  | "cart"
  | "orders"
  | "profile";
type User = { id: string; kind: "guest" | "account"; email?: string };
const persistedSchema = z.object({
  saved: z.array(z.string()).max(1000),
  preferences: preferencesSchema,
  address: addressSchema.partial().optional(),
  cart: z.object({
    restaurantId: z.string().nullable(),
    items: z
      .array(
        z.object({
          dishId: z.string(),
          quantity: z.number().int().min(1).max(20),
          modifierIds: z.array(z.string()),
          instructions: z.string(),
        }),
      )
      .max(30),
  }),
  welcomed: z.boolean(),
});
export function useMoodFood() {
  const [view, setView] = useState<View>("discover");
  const [user, setUser] = useState<User | null>(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const [address, setAddress] = useState<Address>(defaultAddress);
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [welcomed, setWelcomed] = useState(false);
  const [selection, setSelection] = useState<Selection>({
    mood: "",
    cravings: [],
    text: "",
  });
  const [deck, setDeck] = useState<DeckState>({ ids: [], history: [] });
  const [seen, setSeen] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Decision[]>([]);
  const [intent, setIntent] = useState<Intent>(parseIntent(""));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const lastView = useRef(view);
  const remoteState = useRef("");
  const currentOwner = useRef<string | null>(null);
  const syncQueue = useRef<Promise<unknown>>(Promise.resolve());
  const loadSession = useCallback(async () => {
    setReady(false);
    currentOwner.current = null;
    setUser(null);
    setOrders([]);
    setSaved([]);
    setCart(emptyCart);
    setPreferences(defaultPreferences);
    setAddress(defaultAddress);
    remoteState.current = "";
    try {
      const response = await fetch("/api/session");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      currentOwner.current = data.user.id;
      setUser(data.user);
      setAuthConfigured(data.authConfigured);
      setSaved([]);
      setPreferences(defaultPreferences);
      setAddress(defaultAddress);
      setCart(emptyCart);
      setWelcomed(false);
      setOrders([]);
      setDeck({ ids: [], history: [] });
      setSeen([]);
      setFeedback([]);
      try {
        const raw = localStorage.getItem(`moodfood:v1:${data.user.id}`);
        if (raw) {
          const p = persistedSchema.parse(JSON.parse(raw));
          setSaved(p.saved);
          setPreferences(p.preferences);
          setAddress({ ...defaultAddress, ...p.address });
          setCart(p.cart);
          setWelcomed(p.welcomed);
        }
      } catch {
        setNotice(
          "Your saved browser data could not be read. A fresh session is ready.",
        );
      }
      if (data.user.kind === "account") {
        try {
          const remoteResponse = await fetch("/api/customer");
          const remote = await remoteResponse.json();
          if (!remoteResponse.ok) throw new Error(remote.error);
          if (remote.exists) {
            const prefs = preferencesSchema.parse(remote.preferences);
            setPreferences(prefs);
            setAddress(remote.address);
            setSaved(remote.saved);
            remoteState.current = JSON.stringify({
              preferences: prefs,
              address: remote.address,
              saved: remote.saved,
            });
          }
        } catch (e) {
          setNotice((e as Error).message);
        }
      }
      setReady(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void loadSession();
  }, [loadSession]);
  useEffect(() => {
    if (ready && user) {
      try {
        localStorage.setItem(
          `moodfood:v1:${user.id}`,
          JSON.stringify({ saved, preferences, address, cart, welcomed }),
        );
      } catch {
        setNotice(
          "Browser storage is unavailable. Your preferences will last for this visit.",
        );
      }
    }
  }, [ready, user, saved, preferences, address, cart, welcomed]);
  useEffect(() => {
    if (!ready || user?.kind !== "account") return;
    const state = JSON.stringify({ preferences, address, saved });
    if (state === remoteState.current) return;
    const timer = setTimeout(() => {
      syncQueue.current = syncQueue.current
        .catch(() => undefined)
        .then(async () => {
          const response = await fetch("/api/customer", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...JSON.parse(state), ownerId: user.id }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          remoteState.current = state;
        })
        .catch((e) => setNotice((e as Error).message));
    }, 700);
    return () => clearTimeout(timer);
  }, [ready, user, preferences, address, saved]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    if (view !== lastView.current) {
      window.scrollTo({ top: 0, behavior: "instant" });
      lastView.current = view;
      setError("");
    }
  }, [view]);
  const toggleSave = (id: string) => {
    setSaved((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  };
  async function startDeck(refinement?: string) {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    const nextSelection = refinement
      ? { ...selection, text: `${selection.text} ${refinement}`.trim() }
      : selection;
    try {
      let nextIntent = parseIntent(nextSelection.text);
      if (nextSelection.text.trim()) {
        try {
          const response = await fetch("/api/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: nextSelection.text }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          nextIntent = data.intent;
          setNotice(
            data.source === "ai"
              ? "Your craving, translated. Let’s find something good."
              : "Matched using food keywords. Review dietary restrictions in Profile.",
          );
        } catch {
          setNotice(
            "Text matching is running locally while the service is unavailable.",
          );
        }
      }
      const allFeedback = [...feedback, ...deck.history];
      if (refinement === "Something cheaper")
        nextIntent = {
          ...nextIntent,
          budget: Math.min(nextIntent.budget ?? Infinity, 15),
        };
      const picks = buildDeck(
        nextSelection,
        preferences,
        address.zip,
        seen,
        allFeedback,
        nextIntent,
      );
      if (!picks.length) {
        setError(
          "No dishes match these preferences in your delivery area. Check your ZIP code, budget, and dietary restrictions.",
        );
        return;
      }
      if (picks.length < 7)
        setNotice(
          `Only ${picks.length} dishes meet your current constraints. Your restrictions come first.`,
        );
      setFeedback(allFeedback);
      setSelection(nextSelection);
      setIntent(nextIntent);
      setSeen((old) => [...new Set([...old, ...picks.map((d) => d.id)])]);
      setDeck({ ids: picks.map((d) => d.id), history: [] });
      setWelcomed(true);
      setView("deck");
    } finally {
      setBusy(false);
    }
  }
  function swipe(action: "like" | "skip") {
    const next = decide(deck, action);
    if (next === deck) return;
    setDeck(next);
    if (next.history.length === next.ids.length) setView("shortlist");
  }
  function goBack() {
    if (!deck.history.length) return;
    setDeck(undo(deck));
    setView("deck");
  }
  // Feedback is the current decision history, so undo cannot leave a phantom preference.
  const effectiveFeedback = [...feedback, ...deck.history];
  const loadOrders = useCallback(async (silent = false) => {
    const owner = currentOwner.current;
    if (!owner) return;
    if (!silent) setOrdersLoading(true);
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (currentOwner.current === owner) setOrders(data.orders);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOrdersLoading(false);
    }
  }, []);
  useEffect(() => {
    if (view === "orders" && ready) {
      void loadOrders();
      const timer = setInterval(() => void loadOrders(true), 5000);
      return () => clearInterval(timer);
    }
  }, [view, ready, loadOrders]);
  function refreshDeck(refinement?: string) {
    void startDeck(refinement);
  }
  return {
    view,
    setView,
    user,
    ready,
    authConfigured,
    loadSession,
    saved,
    toggleSave,
    preferences,
    setPreferences,
    address,
    setAddress,
    cart,
    setCart,
    welcomed,
    setWelcomed,
    selection,
    setSelection,
    deck,
    intent,
    feedback: effectiveFeedback,
    swipe,
    goBack,
    startDeck,
    refreshDeck,
    busy,
    notice,
    setNotice,
    error,
    setError,
    orders,
    ordersLoading,
    loadOrders,
  };
}
export type MoodFoodApp = ReturnType<typeof useMoodFood>;
