import { Dish, Intent, Preferences, Selection, Decision } from "./domain";
import { restaurantById, dishes } from "./data";
export const emptyIntent: Intent = {
  tags: [],
  cuisines: [],
  diets: [],
  excludedIngredients: [],
};
export function parseIntent(text: string): Intent {
  const lower = text.toLowerCase();
  const tags = [
    "spicy",
    "crispy",
    "creamy",
    "cheesy",
    "savory",
    "sweet",
    "light",
    "fresh",
    "crunchy",
    "warming",
    "soft",
    "garlicky",
  ].filter((t) => lower.includes(t));
  if (/crunch/.test(lower)) tags.push("crispy");
  if (/spicier/.test(lower)) tags.push("spicy");
  if (/not spicy|no spice|mild/.test(lower)) {
    const n = tags.indexOf("spicy");
    if (n >= 0) tags.splice(n, 1);
  }
  if (/comfort|cozy|long day/.test(lower)) tags.push("warming");
  if (/not too heavy|lighter/.test(lower)) tags.push("light");
  const budget = lower.match(
    /(?:under|below|less than|max|budget(?: of)?)\s*\$?\s*(\d+(?:\.\d{1,2})?)/,
  );
  const diets = ["vegan", "vegetarian", "gluten-free"].filter((t) =>
    lower.includes(t),
  );
  const exclusions = [
    ...lower.matchAll(/(?:\bno|without|allergic to|avoid)\s+([^.!?;]+)/g),
  ].flatMap((m) =>
    m[1]
      .split(/,|\band\b|\bor\b|\bwith\b|\bunder\b|\bbut\b|\bplease\b|\bfor\b/)
      .map((v) => v.trim())
      .filter(Boolean),
  );
  return {
    tags: [...new Set(tags)],
    cuisines: [
      "korean",
      "japanese",
      "italian",
      "mexican",
      "thai",
      "chinese",
      "mediterranean",
      "american",
      "hawaiian",
    ].filter((t) => lower.includes(t)),
    budget: budget ? Number(budget[1]) : undefined,
    diets,
    excludedIngredients: exclusions,
    portion: /large|big portion/.test(lower) ? "large" : undefined,
    occasion: ["breakfast", "lunch", "dinner"].find((t) => lower.includes(t)),
  };
}
function normalize(s: string) {
  return s.trim().toLowerCase();
}
const ingredientAliases: Record<string, string[]> = {
  dairy: ["milk", "butter", "cream", "cheese", "parmesan", "cheddar"],
  milk: ["milk", "butter", "cream", "cheese", "parmesan", "cheddar"],
  gluten: ["wheat", "barley", "rye"],
  peanuts: ["peanut"],
  eggs: ["egg"],
  "tree nuts": ["almond", "cashew", "walnut", "pecan", "pistachio"],
  nuts: ["peanut", "almond", "cashew", "walnut", "pecan", "pistachio"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "clam", "mussel"],
  soy: ["soy", "edamame", "tofu"],
  sesame: ["sesame", "tahini"],
};
export function restrictionMatches(restriction: string, ingredients: string[]) {
  const term = normalize(restriction);
  const tokens = ingredientAliases[term] ?? [term.replace(/s$/, "")];
  return tokens.some((token) =>
    ingredients.some((i) => normalize(i).includes(token)),
  );
}
export function eligible(
  dish: Dish,
  prefs: Preferences,
  zip: string,
  intent: Intent = emptyIntent,
): boolean {
  const merchant = restaurantById(dish.restaurantId);
  if (!dish.available || !merchant.open || !merchant.zipCodes.includes(zip))
    return false;
  const diets = [...prefs.diets, ...intent.diets].map(normalize);
  const restrictions = [...prefs.allergies, ...intent.excludedIngredients]
    .map(normalize)
    .filter(Boolean);
  if ((diets.length || restrictions.length) && !dish.verified) return false;
  if (!diets.every((d) => dish.dietary.some((x) => normalize(x) === d)))
    return false;
  if (
    restrictions.some((a) =>
      restrictionMatches(a, [...dish.ingredients, ...dish.allergens]),
    )
  )
    return false;
  return dish.price <= Math.min(prefs.budget, intent.budget ?? Infinity) * 100;
}
const moodTags: Record<string, string[]> = {
  Comforting: ["warming", "savory", "creamy"],
  Cozy: ["warming", "creamy"],
  Adventurous: ["spicy", "chewy", "aromatic"],
  Indulgent: ["cheesy", "creamy", "crispy"],
  Fresh: ["fresh", "light"],
  "Low effort": ["savory"],
};
export function scoreDish(
  d: Dish,
  selection: Selection,
  prefs: Preferences,
  intent: Intent,
  feedback: Decision[] = [],
): { score: number; explanation: string } {
  const desired = [
    ...selection.cravings,
    ...intent.tags,
    ...(moodTags[selection.mood] ?? []),
  ].map(normalize);
  const tags = [
    ...d.tags.map(normalize),
    ...(d.temperature === "hot" ? ["warming"] : []),
    d.richness,
  ];
  const matches = [...new Set(tags.filter((t) => desired.includes(t)))];
  const cuisine = [...prefs.cuisines, ...intent.cuisines].some(
    (c) => normalize(c) === normalize(d.cuisine),
  );
  const recent = feedback.filter((f) => f.dishId === d.id);
  const disliked = prefs.disliked
    .split(",")
    .map(normalize)
    .filter(Boolean)
    .some((x) => d.ingredients.some((i) => normalize(i).includes(x)));
  const score =
    matches.length * 5 +
    (cuisine ? 4 : 0) +
    (d.minutes[0] <= 25 ? 1 : 0) +
    recent.reduce((v, f) => v + (f.action === "like" ? 2 : -1), 0) -
    (disliked ? 12 : 0);
  const explanation = matches.length
    ? `${matches
        .slice(0, 2)
        .map((t) => t[0].toUpperCase() + t.slice(1))
        .join(" + ")}, and within your dish budget.`
    : cuisine
      ? `A cuisine you selected, within your dish budget.`
      : "Available in your area and within your dish budget.";
  return { score, explanation };
}
export function buildDeck(
  selection: Selection,
  prefs: Preferences,
  zip: string,
  seen: string[] = [],
  feedback: Decision[] = [],
  intent: Intent = parseIntent(selection.text),
): Dish[] {
  const candidates = dishes.filter((d) => eligible(d, prefs, zip, intent));
  const sorted = candidates.sort(
    (a, b) =>
      Number(seen.includes(a.id)) - Number(seen.includes(b.id)) ||
      scoreDish(b, selection, prefs, intent, feedback).score -
        scoreDish(a, selection, prefs, intent, feedback).score,
  );
  const result: Dish[] = [];
  // Keep the highest-scored pick; add variety without discarding eligibility or unseen priority.
  while (result.length < 7 && sorted.length) {
    let index = sorted.findIndex(
      (d) =>
        !seen.includes(d.id) &&
        !result.slice(-2).some((r) => r.cuisine === d.cuisine),
    );
    if (index < 0) index = 0;
    result.push(sorted.splice(index, 1)[0]);
  }
  return result;
}
export function topPick(
  ids: string[],
  selection: Selection,
  prefs: Preferences,
  zip: string,
  feedback: Decision[] = [],
) {
  const intent = parseIntent(selection.text);
  return dishes
    .filter((d) => ids.includes(d.id) && eligible(d, prefs, zip, intent))
    .sort(
      (a, b) =>
        scoreDish(b, selection, prefs, intent, feedback).score -
        scoreDish(a, selection, prefs, intent, feedback).score,
    )[0];
}
