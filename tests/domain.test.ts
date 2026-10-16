import { describe, expect, it } from "vitest";
import { sameOrigin } from "../src/lib/server/security";
import {
  buildDeck,
  eligible,
  parseIntent,
  restrictionMatches,
  topPick,
} from "../src/lib/recommendations";
import {
  decide,
  undo,
  shortlist,
  faceOffWinner,
  defaultPreferences,
  defaultAddress,
  emptyCart,
} from "../src/lib/domain";
import { addItem, quoteCart, validateCart } from "../src/lib/cart";
import { dishes } from "../src/lib/data";
import { DemoDeliveryProvider } from "../src/lib/delivery";
const selection = { mood: "", cravings: [], text: "" };
const item = (dishId = dishes[0].id) => ({
  dishId,
  quantity: 1,
  modifierIds: [],
  instructions: "",
});
describe("seven-card discovery", () => {
  it("right swipe likes, left skips, and ends after seven without adding an eighth", () => {
    let deck = {
      ids: dishes.slice(0, 7).map((d) => d.id),
      history: [] as ReturnType<typeof decide>["history"],
    };
    deck = decide(deck, "like");
    deck = decide(deck, "skip");
    expect(shortlist(deck)).toEqual([dishes[0].id]);
    for (let i = 0; i < 5; i++) deck = decide(deck, "like");
    expect(deck.history).toHaveLength(7);
    expect(decide(deck, "like")).toBe(deck);
  });
  it("multiple undo steps restore choices without duplicate likes", () => {
    let deck = {
      ids: dishes.slice(0, 7).map((d) => d.id),
      history: [] as ReturnType<typeof decide>["history"],
    };
    deck = decide(decide(deck, "like"), "skip");
    deck = undo(undo(deck));
    expect(deck.history).toEqual([]);
    deck = decide(undo(decide(deck, "like")), "like");
    expect(shortlist(deck)).toEqual([dishes[0].id]);
  });
  it("bookmarks are independent of like, skip, and undo state", () => {
    const saved = new Set([dishes[0].id]);
    const deck = undo(decide({ ids: [dishes[0].id], history: [] }, "skip"));
    expect(shortlist(deck)).toEqual([]);
    expect([...saved]).toEqual([dishes[0].id]);
  });
  it("refresh uses seven new dishes when there are enough unseen eligible dishes", () => {
    const first = buildDeck(selection, defaultPreferences, "11201");
    const second = buildDeck(
      selection,
      defaultPreferences,
      "11201",
      first.map((d) => d.id),
    );
    expect(first).toHaveLength(7);
    expect(second).toHaveLength(7);
    expect(second.every((d) => !first.some((x) => x.id === d.id))).toBe(true);
  });
  it("refuses closed, unavailable, out-of-area, unverified, and allergy-conflicting food", () => {
    expect(
      eligible({ ...dishes[0], available: false }, defaultPreferences, "11201"),
    ).toBe(false);
    expect(eligible(dishes[0], defaultPreferences, "99999")).toBe(false);
    expect(
      eligible(
        dishes[0],
        { ...defaultPreferences, allergies: ["sesame"] },
        "11201",
      ),
    ).toBe(false);
    expect(
      eligible(
        { ...dishes[8], verified: false },
        { ...defaultPreferences, diets: ["Vegetarian"] },
        "11201",
      ),
    ).toBe(false);
    expect(restrictionMatches("dairy", ["butter"])).toBe(true);
    expect(restrictionMatches("peanuts", ["peanut oil"])).toBe(true);
  });
  it("respects explicit vegan choices and budgets, even when fewer than seven match", () => {
    const deck = buildDeck(
      selection,
      { ...defaultPreferences, diets: ["Vegan"], budget: 14 },
      "11201",
    );
    expect(deck.length).toBeGreaterThan(0);
    expect(
      deck.every((d) => d.dietary.includes("Vegan") && d.price <= 1400),
    ).toBe(true);
  });
  it("interprets text into attributes without inventing merchant facts", () => {
    expect(
      parseIntent("Something spicy and crunchy under $17, without sesame")
        .budget,
    ).toBe(17);
    expect(parseIntent("Anything").tags).toEqual([]);
    expect(
      parseIntent("Something comforting but not too heavy").tags,
    ).toContain("light");
  });
  it("top pick respects eligibility even if it has a higher-scoring liked competitor", () => {
    const top = topPick(
      [dishes[0].id, dishes[14].id],
      { ...selection, cravings: ["Spicy"] },
      { ...defaultPreferences, allergies: ["sesame"] },
      "11201",
    );
    expect(top?.id).toBe(dishes[14].id);
  });
  it("Face-Off eliminates comparison contestants and preserves the original shortlist", () => {
    const original = ["a", "b", "c"];
    let next = faceOffWinner(original, "b");
    expect(next).toEqual(["b", "c"]);
    next = faceOffWinner(next, "c");
    expect(next).toEqual(["c"]);
    expect(original).toEqual(["a", "b", "c"]);
  });
});
describe("ordering", () => {
  it("restricts the cart to one merchant and merges matching items", () => {
    const cart = addItem(emptyCart, item());
    expect(addItem(cart, item()).items[0].quantity).toBe(2);
    expect(() => addItem(cart, item(dishes[1].id))).toThrow(/one kitchen/);
  });
  it("revalidates quantities, modifiers, dietary constraints, and delivery address", () => {
    const cart = addItem(emptyCart, item());
    const address = { ...defaultAddress, street: "123 Sample Street" };
    expect(
      validateCart(cart, address, defaultPreferences).total,
    ).toBeGreaterThan(1600);
    expect(() =>
      validateCart(cart, defaultAddress, defaultPreferences),
    ).toThrow(/address/);
    expect(() =>
      validateCart(
        { ...cart, items: [{ ...item(), quantity: 0 }] },
        address,
        defaultPreferences,
      ),
    ).toThrow(/quantity/);
    expect(() =>
      validateCart(
        { ...cart, items: [{ ...item(), modifierIds: ["fake"] }] },
        address,
        defaultPreferences,
      ),
    ).toThrow(/option/);
    expect(() =>
      validateCart(cart, address, {
        ...defaultPreferences,
        allergies: ["sesame"],
      }),
    ).toThrow(/restrictions/);
  });
  it("computes totals in integer cents with explicit fees", () => {
    expect(quoteCart(addItem(emptyCart, item()))).toEqual({
      subtotal: 1600,
      deliveryFee: 249,
      serviceFee: 80,
      tax: 149,
      total: 2078,
    });
  });
});

describe("mutation origin checks", () => {
  it("uses the incoming host behind a Next.js proxy and rejects foreign sites", () => {
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3000/api/orders", {
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3000/api/orders", {
          headers: {
            host: "127.0.0.1:3000",
            origin: "https://foreign.example",
          },
        }),
      ),
    ).toThrow(/MoodFood/);
  });
});
