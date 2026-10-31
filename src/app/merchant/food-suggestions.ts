import type { MenuDish } from "./merchant-data";

// Deliberately local demo rules, never a live AI or allergen determination.
export function suggestFood(dish: MenuDish): MenuDish {
  if (dish.suggestionsEdited) return dish;
  const text = `${dish.name} ${dish.attributes}`.toLowerCase();
  const rules: [RegExp, string[], string[]][] = [
    [
      /\b(spicy|chili|chilli|gochujang|jalapeño)\b/,
      ["Spicy"],
      ["Feeling Adventurous"],
    ],
    [/\b(creamy|cream|risotto|mac and cheese)\b/, ["Creamy"], ["Comfort Food"]],
    [/\b(crunchy|crispy|fried|toast)\b/, ["Crunchy"], []],
    [/\b(miso|mushroom|broth|cheese|chicken|salmon)\b/, ["Savory"], []],
    [/\b(soup|stew|ramen|hearty)\b/, ["Hearty"], ["Comfort Food"]],
    [
      /\b(citrus|lemon|mint|smoothie|refreshing)\b/,
      ["Refreshing"],
      ["Need a Pick-Me-Up"],
    ],
    [/\b(salad|light|cucumber|greens)\b/, ["Fresh"], ["Something Light"]],
  ];
  const matches = rules.filter(([pattern]) => pattern.test(text));
  return {
    ...dish,
    foodTags: [...new Set(matches.flatMap(([, tags]) => tags))],
    suggestedMoods: [...new Set(matches.flatMap(([, , moods]) => moods))],
  };
}
