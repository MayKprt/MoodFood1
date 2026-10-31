import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
const pixel = readFileSync(new URL("../../public/merchant-food.png", import.meta.url));
test("dish photos upload, preview, save, reload, replace and remove locally", async ({
  page,
}) => {
  await page.goto("/merchant");
  await page
    .getByRole("navigation", { name: "Merchant navigation" })
    .getByRole("button", { name: "Menu", exact: true })
    .click();
  await page.getByRole("button", { name: "Add a Dish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const upload = dialog.getByLabel("Upload dish photo", { exact: true });
  await upload.setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(
    dialog.getByText("Choose a JPG, PNG, or WebP image.", { exact: true }),
  ).toBeVisible();
  await upload.setInputFiles({
    name: "dish.png",
    mimeType: "image/png",
    buffer: pixel,
  });
  await expect(
    dialog.getByRole("img", { name: "Dish photo preview", exact: true }),
  ).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
  await dialog.getByLabel("Dish name", { exact: true }).fill("Photo test dish");
  await dialog.getByRole("button", { name: "Add Dish", exact: true }).click();
  const card = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Photo test dish", exact: true }),
    });
  await expect(
    card.getByRole("img", { name: "Photo test dish", exact: true }),
  ).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Merchant navigation" })
    .getByRole("button", { name: "Menu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit Photo test dish", exact: true })
    .click();
  await expect(
    dialog.getByRole("img", { name: "Dish photo preview", exact: true }),
  ).toBeVisible();
  await upload.setInputFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: pixel,
  });
  await expect(
    dialog.getByText("Replace photo", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Remove photo", exact: true })
    .click();
  await expect(
    dialog.getByRole("img", { name: "Dish photo preview", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Save Changes", exact: true })
    .click();
  await expect(
    card.getByRole("img", { name: "Photo test dish: no photo", exact: true }),
  ).toBeVisible();
});
