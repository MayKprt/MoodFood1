import { test, expect } from "@playwright/test";

test("responsive homepage uses the real Customer app without recursive framing", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await expect(page.getByRole("button", { name: "Just feed me", exact: true })).toBeEnabled();
    await expect(page.locator("iframe")).toHaveCount(0);
  } else {
    const iframe = page.locator("iframe");
    await expect(iframe).toHaveAttribute("src", "/customer");
    await expect(iframe).toHaveAttribute("width", "390");
    await expect(iframe).toHaveAttribute("height", "844");
    await expect(page.getByRole("link", { name: "Open Full App" })).toHaveAttribute("href", "/customer");
    const app = page.frameLocator("iframe");
    await expect(app.locator("iframe")).toHaveCount(0);
    await app.getByRole("button", { name: "Just feed me", exact: true }).click();
    await expect(app.getByText("1 of 7", { exact: true })).toBeVisible();
    await app.getByRole("button", { name: "Like dish", exact: true }).click();
    await expect(app.getByText("2 of 7", { exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("same-origin framing policy is served on all entry routes", async ({ request }) => {
  for (const route of ["/", "/customer", "/merchant", "/iphone-test"]) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-security-policy"]).toBe("frame-ancestors 'self'; frame-src 'self'");
    expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  }
});

test("Merchant retains Quick Actions, navigation and assistant", async ({ page }) => {
  await page.goto("/merchant");
  await expect(page.getByRole("heading", { name: "Quick Actions", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask MoodAI", exact: true })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Merchant navigation" });
  for (const section of ["Orders", "Menu", "Settings"]) {
    await navigation.getByRole("button", { name: new RegExp(`^${section}(?:\\s*\\d+)?$`) }).click();
    await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
  }
});
