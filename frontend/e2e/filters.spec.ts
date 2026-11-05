import AxeBuilder from "@axe-core/playwright";
import { devices } from "@playwright/test";
import { expect, test } from "./test";

test("desktop: search, discount and sizes filter the grid, and a reload restores them", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();

  await page.getByRole("searchbox", { name: "Search deals" }).fill("nike");
  await page.getByRole("radio", { name: "50%" }).check();
  await page.getByRole("button", { name: "Sizes" }).click();
  await page
    .getByRole("dialog", { name: "Filter by size" })
    .getByRole("button", { name: /^M, / })
    .click();
  await page.keyboard.press("Escape");

  await expect(page).toHaveURL(/\?search=nike&discount=50&sizes=M$/);
  const summary = page.getByText(/^\d+ of 81 deals$/);
  const filtered = await summary.textContent();

  await page.reload();

  await expect(page.getByRole("searchbox", { name: "Search deals" })).toHaveValue("nike");
  await expect(page.getByRole("radio", { name: "50%" })).toBeChecked();
  await expect(page.getByText(filtered ?? "")).toBeVisible();
  await expect(page.getByRole("list", { name: "Active filters" }).getByRole("button")).toHaveText([
    "“nike”",
    "≥50%",
    "M",
  ]);
});

test.describe("phone", () => {
  test.use({ viewport: devices["iPhone 13"].viewport, hasTouch: true });

  test("the Filters sheet toggles a size, is axe-clean, and Escape returns focus to Filters", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("81 deals")).toBeVisible();
    await expect(page.getByRole("radio", { name: "50%" })).toBeHidden(); // in the sheet, not the bar

    const filters = page.getByRole("button", { name: "Filters" });
    await filters.click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    await sheet.getByRole("button", { name: /^XL, / }).click();
    await expect(page).toHaveURL(/\?sizes=XL$/);
    await expect(sheet.getByRole("button", { name: /^Show \d+ deals$/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: "Filters (1)" })).toBeFocused();
  });

  test("the sheet's Show button closes it; the filters stay applied", async ({ page }) => {
    await page.goto("/?discount=60");
    await page.getByRole("button", { name: "Filters (1)" }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });

    await sheet.getByRole("button", { name: /^Show \d+ deals?$/ }).click();

    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\?discount=60$/);
  });
});
