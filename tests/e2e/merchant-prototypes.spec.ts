import { test, expect } from "@playwright/test";

test("demo sync, order communication, delay and insights stay local", async ({
  page,
  context,
  browser,
}) => {
  await page.goto("/merchant");
  const nav = page.getByRole("navigation", { name: "Merchant navigation" });
  await nav.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name: "Sync Now", exact: true }).click();
  await expect(page.getByText(/Last successful demo sync:/)).toBeVisible();
  await page.getByText("Changed items & conflicts", { exact: true }).click();
  await page
    .getByRole("button", { name: "Keep current menu", exact: true })
    .click();
  await expect(page.getByText("Reviewed · Menu unchanged.")).toBeVisible();
  await nav.getByRole("button", { name: /^Orders/ }).click();
  await page.getByRole("button", { name: /^In Progress/ }).click();
  const order = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Order #1047", exact: true }),
  });
  await order.getByText("Delivery Details", { exact: true }).click();
  await order
    .getByRole("button", { name: "Contact Customer", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: /Masked call/ }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Message template")
    .selectOption("Your order is being prepared.");
  await dialog
    .getByRole("button", { name: "Simulate Message", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toHaveText(
    "Demo message recorded. Nothing sent.",
  );
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await order
    .getByRole("button", { name: "Report Delay", exact: true })
    .click();
  await dialog.getByRole("button", { name: "10 min", exact: true }).click();
  await expect(
    dialog.getByText("Revised preparation estimate: 30 minutes"),
  ).toBeVisible();
  await dialog.getByLabel("Custom delay (1–120 min)").fill("0");
  await expect(
    dialog.getByRole("button", { name: "Confirm Delay" }),
  ).toBeDisabled();
  await dialog.getByLabel("Custom delay (1–120 min)").fill("10");
  await dialog.getByRole("button", { name: "Confirm Delay" }).click();
  await expect(dialog.getByRole("status")).toContainText("Nothing sent.");
  await expect(
    dialog.getByText("Your order is being prepared.", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    order.getByText("Preparing · 30 min", { exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Preferred POS").selectOption("Toast");
  await page.getByLabel("Date range", { exact: true }).selectOption("1");
  await expect(page.getByText("112 orders", { exact: true })).toBeVisible();
  await page.getByLabel("Date range", { exact: true }).selectOption("2");
  await expect(page.getByText("486 orders", { exact: true })).toBeVisible();
  const guest = await browser.newContext();
  const other = await guest.newPage();
  await other.goto("/merchant");
  await other
    .getByRole("navigation", { name: "Merchant navigation" })
    .getByRole("button", { name: "Menu", exact: true })
    .click();
  await expect(
    other.getByText("Not synced this session", { exact: true }),
  ).toBeVisible();
  await guest.close();
  await nav.getByRole("button", { name: "Menu", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Sync Now", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Demo POS synchronization" })
      .getByRole("alert"),
  ).toContainText("offline");
  await context.setOffline(false);
});
