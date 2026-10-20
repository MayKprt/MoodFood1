import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("complete discovery, undo, bookmark, Face-Off, and demo order journey", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/customer");
  await expect(
    page.getByRole("button", { name: "Feed Me", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Feed Me", exact: true }).click();
  await expect(page.getByText("1 of 7", { exact: true })).toBeVisible();
  const firstName = await page.locator(".swipe-title h2").innerText();
  await page
    .getByRole("button", { name: "Bookmark for later", exact: true })
    .click();
  await page.getByRole("button", { name: "Like dish", exact: true }).click();
  await expect(page.getByText("2 of 7", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Undo last swipe", exact: true })
    .click();
  await expect(page.getByText("1 of 7", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (let i = 0; i < 7; i++)
    await page
      .getByRole("button", {
        name: i < 3 ? "Like dish" : "Skip dish",
        exact: true,
      })
      .click();
  await expect(
    page.getByRole("heading", { name: "Your food finalists." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Can’t decide? Food Face-Off" })
    .click();
  await page
    .getByRole("button", { name: "This one", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "This one", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Your appetite has spoken!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View dish & order" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /Add to cart/ }).click();
  await page.getByRole("button", { name: /Cart, 1 items/ }).click();
  await page.getByRole("button", { name: "Add address", exact: true }).click();
  await page
    .getByLabel("Street address", { exact: true })
    .fill("123 Sample Street");
  await page.getByRole("button", { name: "Save delivery address" }).click();
  await page
    .getByRole("checkbox", { name: /I reviewed the sample ingredients/ })
    .check();
  await page
    .getByRole("button", { name: "Place demo order", exact: true })
    .click();
  await expect(page.getByText(/Simulation in progress/)).toBeVisible();
  await expect(
    page.getByText("123 Sample Street, Brooklyn 11201"),
  ).toBeVisible();
  await expect(page.getByText(/DEMO ORDER · MF-/)).toBeVisible();
  const nav = page.getByRole("navigation", {
    name:
      test.info().project.name === "mobile"
        ? "Mobile navigation"
        : "Main navigation",
    exact: true,
  });
  await nav.getByRole("button", { name: /Saved/ }).click();
  await expect(
    page.getByRole("button", { name: `View ${firstName}`, exact: true }),
  ).toBeVisible();
  await page.reload();
  await nav.getByRole("button", { name: /Saved/ }).click();
  await expect(
    page.getByRole("button", { name: `View ${firstName}`, exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("keyboard dialog behavior, no horizontal overflow, and accessible discover", async ({
  page,
}) => {
  await page.goto("/customer");
  await expect(
    page.getByRole("button", { name: "Feed Me", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const violations = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
  expect(
    violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "View Gochujang Chicken Bowl", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("guest sessions cannot see each other’s orders and cannot spoof ownership", async ({
  page,
  browser,
}) => {
  await page.goto("/customer");
  await expect(
    page.getByRole("button", { name: "Feed Me", exact: true }),
  ).toBeEnabled();
  const one = await page.request.get("/api/session");
  const first = (await one.json()).user;
  const context = await browser.newContext();
  const second = (
    await (
      await context.request.get("http://127.0.0.1:3000/api/session")
    ).json()
  ).user;
  expect(first.id).not.toBe(second.id);
  expect(
    (
      await (
        await context.request.get("http://127.0.0.1:3000/api/orders")
      ).json()
    ).orders,
  ).toEqual([]);
  const denied = await context.request.put(
    "http://127.0.0.1:3000/api/customer",
    { data: { ownerId: first.id } },
  );
  expect(denied.ok()).toBe(false);
  await context.close();
});
