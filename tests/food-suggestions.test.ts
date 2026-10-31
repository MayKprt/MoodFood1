import { expect, it } from "vitest";
import {
  dishSchema,
  importMenu,
  initialState,
  restoreState,
} from "../src/app/merchant/merchant-data";
import { suggestFood } from "../src/app/merchant/food-suggestions";
it("suggests tags and moods from descriptive information without inventing vague dish attributes", () => {
  const dish = dishSchema.parse({
    name: "Spicy creamy ramen",
    price: 12,
    available: true,
  });
  expect(suggestFood(dish).foodTags).toEqual(
    expect.arrayContaining(["Spicy", "Creamy", "Hearty"]),
  );
  expect(suggestFood(dish).suggestedMoods).toEqual(
    expect.arrayContaining(["Comfort Food", "Feeling Adventurous"]),
  );
  expect(suggestFood({ ...dish, name: "Special" }).foodTags).toEqual([]);
});
it("preserves merchant corrections, including intentionally empty groups, through storage", () => {
  const dish = {
    ...initialState.menu[0],
    foodTags: ["Crunchy"],
    suggestedMoods: [],
    suggestionsEdited: true,
  };
  expect(suggestFood({ ...dish, name: "Creamy soup" }).foodTags).toEqual([
    "Crunchy",
  ]);
  const restored = restoreState(
    JSON.stringify({ ...initialState, menu: [dish] }),
  );
  expect(restored.menu[0]).toEqual(dish);
});
it("suggests imported dishes and accepts old menus without tag metadata", () => {
  expect(importMenu("name,price\nSpicy ramen,12")[0].suggestedMoods).toContain(
    "Feeling Adventurous",
  );
  const old = JSON.parse(JSON.stringify(initialState));
  delete old.menu[0].foodTags;
  delete old.menu[0].suggestedMoods;
  delete old.menu[0].suggestionsEdited;
  expect(restoreState(JSON.stringify(old)).menu[0].foodTags).toEqual([]);
});
