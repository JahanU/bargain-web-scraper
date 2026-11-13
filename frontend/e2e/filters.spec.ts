import AxeBuilder from "@axe-core/playwright";
import { devices } from "@playwright/test";
import { dealsApi, expect, test } from "./test";

test("desktop: search, discount and sizes filter the grid, and a reload restores them", async ({
  page,
}) => {
  await page.setViewportSize(devices["Desktop Chrome"].viewport); // the Mobile Safari project defaults to phone width
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

test("desktop: category and brands narrow the list through the API, by keyboard, and survive a reload", async ({
  page,
}) => {
  await page.setViewportSize(devices["Desktop Chrome"].viewport);
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (dealsApi(url)) requests.push(url.search);
  });
  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();
  await expect(page.getByRole("radio", { name: "20%" })).toHaveCount(0);

  await page.getByRole("radio", { name: "Shoes" }).check();
  await expect(page.getByText("21 deals")).toBeVisible();

  const brands = page.getByRole("button", { name: /^Brands/ });
  await brands.click();
  const popup = page.getByRole("dialog", { name: "Filter by brand" });
  const vans = popup.getByRole("button", { name: "Vans, 8 deals" });
  await vans.focus();
  await page.keyboard.press("Space");
  await expect(vans).toHaveAttribute("aria-pressed", "true");
  await expect(vans).toBeFocused();
  await popup.getByRole("button", { name: "adidas, 4 deals" }).click();

  await expect(page).toHaveURL(/\?category=Shoes&brands=Vans,adidas$/);
  await expect(page.getByText("12 deals")).toBeVisible();
  expect(requests.at(-1)).toBe("?gender=Male&category=Shoes&brand=Vans&brand=adidas");

  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(brands).toBeFocused();
  await expect(brands).toHaveText(/· 2/);

  await page.reload();

  await expect(page.getByText("12 deals")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Shoes" })).toBeChecked();
  await expect(page.getByRole("list", { name: "Active filters" }).getByRole("button")).toHaveText([
    "Vans",
    "adidas",
  ]);

  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page).toHaveURL(/\?category=Shoes$/);
  await expect(page.getByText("21 deals")).toBeVisible();
});

test("each card shows its store; Size asks the API for store=size only, and All sends no store", async ({
  page,
}) => {
  await page.setViewportSize(devices["Desktop Chrome"].viewport);
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/v1/")) requests.push(url.pathname + url.search);
  });
  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();
  const store = page.getByRole("group", { name: "Store" });
  await expect(store.getByRole("radio", { name: "All" })).toBeChecked();
  expect(requests.some((request) => request.includes("store"))).toBe(false);

  const cards = page.locator("a", { has: page.getByRole("heading", { level: 2 }) });
  const badge = (label: string) => page.getByText(label, { exact: true }).and(page.locator("span"));
  await expect(cards.first()).toHaveAccessibleName(/^Nike NFL Las Vegas Raiders .* JD, Men/);
  await expect(cards.first().locator(badge("JD"))).toBeVisible();
  await expect(cards.filter({ has: badge("Size") }).first()).toHaveAccessibleName(/ Size, Men/);

  requests.length = 0;
  await store.getByRole("radio", { name: "Size" }).check();

  await expect(page.getByText("13 deals")).toBeVisible();
  await expect(page).toHaveURL(/\?store=size$/);
  expect(requests.sort()).toEqual([
    "/v1/brands?gender=Male&store=size",
    "/v1/deals?gender=Male&store=size",
  ]);
  await expect(cards.filter({ has: badge("Size") })).toHaveCount(await cards.count());
  await expect(cards.filter({ has: badge("JD") })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("13 deals")).toBeVisible();
  await expect(store.getByRole("radio", { name: "Size" })).toBeChecked();

  requests.length = 0;
  await store.getByRole("radio", { name: "JD" }).check();
  await expect(page.getByText("68 deals")).toBeVisible();
  expect(requests.sort()).toEqual([
    "/v1/brands?gender=Male&store=jd",
    "/v1/deals?gender=Male&store=jd",
  ]);

  requests.length = 0;
  // The deals for All are still cached from the first load, so make the app ask again.
  await page.reload();
  await store.getByRole("radio", { name: "All" }).check();
  await expect(page.getByText("81 deals")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  const afterAll = requests.filter((request) => !request.includes("store=jd"));
  expect(afterAll.sort()).toEqual(["/v1/brands?gender=Male", "/v1/deals?gender=Male"]);
});

test.describe("phone", () => {
  test.use({ viewport: devices["iPhone 13"].viewport, hasTouch: true });

  test("category sits in the bar and brands in the sheet; both narrow the list", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("81 deals")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Brands/ })).toBeHidden(); // in the sheet

    await page.getByRole("radio", { name: "Shoes" }).check();
    await expect(page.getByText("21 deals")).toBeVisible();

    await page.getByRole("button", { name: "Filters" }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("button", { name: "Vans, 8 deals" }).click();

    await expect(page).toHaveURL(/\?category=Shoes&brands=Vans$/);
    await sheet.getByRole("button", { name: "Show 8 deals" }).click();

    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: "Filters (1)" })).toBeFocused();
    await expect(page.getByText("8 deals")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      devices["iPhone 13"].viewport.width,
    );
  });

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
