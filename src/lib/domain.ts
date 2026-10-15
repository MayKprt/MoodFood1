export type Mood =
  "Comforting" | "Adventurous" | "Cozy" | "Indulgent" | "Fresh" | "Low effort";
export type Dish = {
  id: string;
  name: string;
  restaurantId: string;
  price: number;
  description: string;
  cuisine: string;
  tags: string[];
  ingredients: string[];
  allergens: string[];
  dietary: string[];
  verified: boolean;
  available: boolean;
  image: number;
  minutes: [number, number];
  spice: number;
  temperature: "hot" | "cold";
  richness: "light" | "rich";
  modifiers: { id: string; name: string; price: number }[];
};
export type Restaurant = {
  id: string;
  name: string;
  description: string;
  open: boolean;
  deliveryFee: number;
  zipCodes: string[];
};
export type Preferences = {
  diets: string[];
  allergies: string[];
  disliked: string;
  cuisines: string[];
  budget: number;
  notifications: boolean;
};
export type Address = {
  street: string;
  apartment: string;
  city: string;
  zip: string;
};
export type Intent = {
  tags: string[];
  cuisines: string[];
  budget?: number;
  diets: string[];
  excludedIngredients: string[];
  portion?: string;
  occasion?: string;
};
export type Selection = { mood: string; cravings: string[]; text: string };
export type Decision = { dishId: string; action: "like" | "skip" };
export type DeckState = { ids: string[]; history: Decision[] };
export type CartItem = {
  dishId: string;
  quantity: number;
  modifierIds: string[];
  instructions: string;
};
export type Cart = { restaurantId: string | null; items: CartItem[] };
export type Quote = {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
};
export type Order = {
  id: string;
  ownerId: string;
  createdAt: string;
  items: CartItem[];
  restaurantId: string;
  address: Address;
  instructions: string;
  quote: Quote;
  demo: true;
  paymentStatus: "demo";
  lineSnapshots: {
    dishId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    modifierNames: string[];
    ingredients: string[];
    allergens: string[];
    instructions: string;
  }[];
  kitchenStatus:
    | "awaiting_confirmation"
    | "accepted"
    | "preparing"
    | "ready"
    | "needs_attention"
    | "cancelled";
  deliveryStatus:
    | "unassigned"
    | "assigned"
    | "picked_up"
    | "on_the_way"
    | "delivered"
    | "failed"
    | "support_pending";
};
export const defaultPreferences: Preferences = {
  diets: [],
  allergies: [],
  disliked: "",
  cuisines: [],
  budget: 30,
  notifications: false,
};
export const defaultAddress: Address = {
  street: "",
  apartment: "",
  city: "Brooklyn",
  zip: "11201",
};
export const emptyCart: Cart = { restaurantId: null, items: [] };
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function decide(deck: DeckState, action: Decision["action"]): DeckState {
  const dishId = deck.ids[deck.history.length];
  return dishId
    ? { ...deck, history: [...deck.history, { dishId, action }] }
    : deck;
}
export const undo = (deck: DeckState): DeckState => ({
  ...deck,
  history: deck.history.slice(0, -1),
});
export const shortlist = (deck: DeckState) => [
  ...new Set(
    deck.history.filter((d) => d.action === "like").map((d) => d.dishId),
  ),
];
export function faceOffWinner(contenders: string[], chosen: string): string[] {
  if (!contenders.slice(0, 2).includes(chosen)) return contenders;
  return [chosen, ...contenders.slice(2)];
}
