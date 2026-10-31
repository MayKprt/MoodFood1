import { test, expect } from "@playwright/test";

test("responsive homepage uses the real Customer app without recursive framing", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await expect(page.getByRole("button", { name: "Feed Me", exact: true })).toBeEnabled();
    await expect(page.locator("iframe")).toHaveCount(0);
  } else {
    const iframe = page.locator("iframe");
    await expect(iframe).toHaveAttribute("src", "/customer");
    await expect(iframe).toHaveAttribute("width", "390");
    await expect(iframe).toHaveAttribute("height", "844");
    await expect(page.getByRole("heading")).toHaveCount(0);
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 600 }]) {
      await page.setViewportSize(viewport);
      await expect.poll(async () => {
        const bounds = await iframe.evaluate((element) => {
          const phone = element.parentElement!.parentElement!.getBoundingClientRect();
          return { top: phone.top, bottom: phone.bottom, height: phone.height };
        });
        return bounds.top >= 0 && bounds.bottom <= viewport.height && Math.abs(bounds.height / viewport.height - 0.88) < 0.015;
      }).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    }
    const app = page.frameLocator("iframe");
    await expect(app.locator("iframe")).toHaveCount(0);
    await app.getByRole("button", { name: "Feed Me", exact: true }).click();
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

test("Merchant assistant closes back to the previous section and sold-out photos update", async ({ page }) => {
  await page.goto("/merchant");
  await page.getByRole("navigation", { name: "Merchant navigation" }).getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ask MoodFood", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ask MoodAI", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Menu", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Orders", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close MoodAI", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Menu", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask MoodAI", exact: true })).toBeFocused();
  const dish = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Harvest bowl", exact: true }) });
  await dish.getByRole("button", { name: "Harvest bowl: Available", exact: true }).click();
  await expect(dish.getByRole("button", { name: "Harvest bowl: Sold Out", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(dish.locator('[class*="foodPhoto"]')).toHaveCSS("filter", "none");
  await expect(dish.locator('[class*="foodPhoto"]')).toHaveCSS("opacity", "0.5");
  await expect(dish.getByRole("button", { name: "Edit Harvest bowl", exact: true })).toBeEnabled();
  await dish.getByRole("button", { name: "Harvest bowl: Sold Out", exact: true }).click();
  await expect(dish.locator('[class*="foodPhoto"]')).toHaveCSS("filter", "none");
  await expect(dish.locator('[class*="foodPhoto"]')).toHaveCSS("opacity", "1");
});

test("Merchant controls use purpose-sized tablet widths and preserve mobile fit", async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/merchant");
  const nav = page.getByRole("navigation", { name: "Merchant navigation" });
  const actions = page.locator('[class*="actionGrid"] > button');
  await expect(actions).toHaveCount(3);
  if (!isMobile) {
    const bounds = await actions.evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, width: rect.width, height: rect.height };
    }));
    for (const rect of bounds) {
      expect(rect.top).toBeCloseTo(bounds[0].top, 0);
      expect(rect.width).toBeCloseTo(bounds[0].width, 0);
      expect(rect.height).toBeCloseTo(bounds[0].height, 0);
    }
  }
  await nav.getByRole("button", { name: /^Orders/ }).click();
  await page.getByRole("button", { name: /^In Progress/ }).click();
  const complete = page.getByRole("button", { name: "Complete Order", exact: true }).first();
  await expect(complete).toBeEnabled();
  const orderWidth = (await complete.boundingBox())!.width;
  if (!isMobile) {
    expect(orderWidth).toBeGreaterThanOrEqual(220);
    expect(orderWidth).toBeLessThanOrEqual(280);
  }
  await nav.getByRole("button", { name: "Settings", exact: true }).click();
  const name = page.getByLabel("Restaurant name", { exact: true });
  const email = page.getByLabel("Contact email", { exact: true });
  if (!isMobile) {
    expect((await name.boundingBox())!.width).toBeLessThanOrEqual(560);
    expect((await email.boundingBox())!.width).toBeCloseTo((await name.boundingBox())!.width, 0);
    expect((await name.boundingBox())!.height).toBe(48);
    expect((await email.boundingBox())!.height).toBe(48);
    expect((await email.boundingBox())!.y).toBeCloseTo((await name.boundingBox())!.y, 0);
  } else {
    expect((await email.boundingBox())!.y).toBeGreaterThan((await name.boundingBox())!.y);
  }
  await nav.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name: "Add a Dish", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  if (!isMobile) {
    const price = (await page.getByLabel("Price ($)", { exact: true }).boundingBox())!;
    const category = (await page.getByLabel("Category", { exact: true }).boundingBox())!;
    expect(price.width).toBeCloseTo(category.width, 0);
    expect(category.x - price.x - price.width).toBeCloseTo(16, 0);
    expect((await page.getByRole("dialog").getByRole("combobox").boundingBox())!.width).toBeCloseTo((await page.getByLabel("Dish name", { exact: true }).boundingBox())!.width, 0);
  }
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ask MoodAI", exact: true }).click();
  await expect(page.getByLabel("Ask MoodFood", { exact: true })).toBeEnabled();
  if (!isMobile) expect((await page.getByLabel("Ask MoodFood", { exact: true }).boundingBox())!.width).toBeLessThanOrEqual(640);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Merchant screens share gutters without responsive overflow", async ({ page, isMobile }) => {
  const viewports = isMobile ? [{ width: 390, height: 844 }] : [
    { width: 1180, height: 820 }, { width: 1440, height: 900 }, { width: 820, height: 1180 },
  ];
  await page.goto("/merchant");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const gutters: number[] = [];
    const headings: number[] = [];
    for (const screen of ["Home", "Orders", "Menu", "Settings", "AI Help"]) {
      if (screen === "AI Help") await page.getByRole("button", { name: "Ask MoodAI", exact: true }).click();
      else await page.getByRole("navigation", { name: "Merchant navigation" }).getByRole("button", { name: new RegExp(`^${screen}(?:\\s*\\d+)?$`) }).click();
      const layout = await page.locator("#merchant-main").evaluate(el => ({
        gutter: parseFloat(getComputedStyle(el).paddingLeft),
        headerLeft: el.querySelector("header")!.getBoundingClientRect().left,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      gutters.push(layout.gutter);
      headings.push(layout.headerLeft);
      expect(layout.overflow).toBe(false);
    }
    expect(new Set(gutters).size).toBe(1);
    expect(new Set(headings).size).toBe(1);
    expect(gutters[0]).toBe(isMobile ? 16 : 40);
    await page.getByRole("button", { name: "Close MoodAI", exact: true }).click();
  }
});

test("Sound disclosure supports pointer, Enter and Space without changing settings", async ({ page }) => {
  await page.goto("/merchant");
  await page.getByRole("navigation", { name: "Merchant navigation" }).getByRole("button", { name: "Settings", exact: true }).click();
  const summary = page.locator("summary").filter({ hasText: "Sound & volume" });
  const details = page.locator("details").filter({ has: summary });
  await expect(details).toHaveJSProperty("open", false);
  await summary.press("Enter");
  await expect(details).toHaveJSProperty("open", true);
  await expect(page.getByLabel("Play alert sounds", { exact: true })).toBeVisible();
  const volume = page.getByRole("slider");
  const initial = await volume.inputValue();
  await summary.press("Space");
  await expect(details).toHaveJSProperty("open", false);
  await summary.click();
  await expect(details).toHaveJSProperty("open", true);
  await expect(volume).toHaveValue(initial);
  await expect(page.getByRole("button", { name: "Test Sound", exact: true })).toBeVisible();
});
