import AxeBuilder from "@axe-core/playwright";
import { devices } from "@playwright/test";
import { expect, fixture, serveDeals, test } from "./test";

for (const colorScheme of ["light", "dark"] as const) {
  test(`no axe violations in the ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.getByText("81 deals")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });
}

test("no axe violations with the Brands popover open", async ({ page }) => {
  await page.setViewportSize(devices["Desktop Chrome"].viewport);
  await page.goto("/?brands=Nike");
  await page.getByRole("button", { name: /^Brands/ }).click();
  const popup = page.getByRole("dialog", { name: "Filter by brand" });
  await expect(popup.getByRole("button", { name: "Nike, 22 deals" })).toBeVisible();
  await popup.getByRole("button", { name: "Show all 12 brands" }).click();

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});

test("no axe violations with the Stores popover open", async ({ page }) => {
  await page.setViewportSize(devices["Desktop Chrome"].viewport);
  await serveDeals(page, fixture, [
    { store: "jd", name: "JD Sports" },
    { store: "footlocker", name: "Foot Locker" },
  ]);
  await page.goto("/?stores=jd");
  await page.getByRole("button", { name: /^Stores/ }).click();
  const popup = page.getByRole("dialog", { name: "Filter by store" });
  await expect(popup.getByRole("button", { name: "JD Sports, 81 deals" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(popup.getByRole("button", { name: "Foot Locker, 0 deals" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});

test("no axe violations with the phone filter sheet open", async ({ page }) => {
  await page.setViewportSize(devices["iPhone 13"].viewport);
  await page.goto("/?brands=Nike&category=Clothes");
  await page.getByRole("button", { name: "Filters (1)" }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet.getByRole("button", { name: "Nike, 20 deals" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
