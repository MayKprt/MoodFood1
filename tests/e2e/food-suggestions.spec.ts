import { test, expect } from "@playwright/test";
test("merchants review automatic demo tags and moods in editor and CSV import", async ({
  page,
}) => {
  await page.goto("/merchant");
  await page
    .getByRole("navigation", { name: "Merchant navigation" })
    .getByRole("button", { name: "Menu", exact: true })
    .click();
  await page.getByRole("button", { name: "Add a Dish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Dish name", { exact: true })
    .fill("Spicy creamy ramen");
  await expect(
    dialog.getByRole("button", {
      name: "Remove Food Tags: Spicy",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Remove Suggested Moods: Comfort Food",
      exact: true,
    }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Remove Food Tags: Spicy", exact: true })
    .click();
  await dialog.getByLabel("Add Food Tags", { exact: true }).fill("Savory");
  await dialog
    .getByRole("button", { name: "Add Food Tags", exact: true })
    .click();
  await dialog
    .getByLabel("Dish name", { exact: true })
    .fill("Spicy creamy ramen special");
  await expect(
    dialog.getByRole("button", {
      name: "Remove Food Tags: Spicy",
      exact: true,
    }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Add Dish", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Edit Spicy creamy ramen special",
      exact: true,
    })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Remove Food Tags: Savory",
      exact: true,
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Import Menu", exact: true }).click();
  await dialog
    .getByLabel("Menu file")
    .setInputFiles({
      name: "demo.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("name,price\nMint smoothie,8\nSpicy soup,12"),
    });
  const soup = dialog.getByRole("region", {
    name: "MoodFood AI Suggestions for Spicy soup",
    exact: true,
  });
  await soup
    .getByRole("button", {
      name: "Remove Suggested Moods: Feeling Adventurous",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Add 2 Dishes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit Spicy soup", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Remove Suggested Moods: Feeling Adventurous",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    dialog.getByText(
      "Demo suggestions · No live AI or Customer catalog connection.",
      { exact: true },
    ),
  ).toBeVisible();
});
