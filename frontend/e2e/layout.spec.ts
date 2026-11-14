import { expect, test } from "./test";

/** Distinct left edges of the first row's cards = number of grid columns. */
async function columns(page: import("@playwright/test").Page) {
  const boxes = await page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link") })
    .evaluateAll((items) =>
      items.slice(0, 8).map((item) => Math.round(item.getBoundingClientRect().top)),
    );
  return boxes.filter((top) => top === boxes[0]).length;
}

for (const { width, cols } of [
  { width: 390, cols: 2 },
  { width: 1280, cols: 5 },
]) {
  test(`${width} px: ${cols} columns, no horizontal scroll, screenshot attached`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByText("81 deals")).toBeVisible();

    expect(await columns(page)).toBe(cols);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.evaluate(() => document.fonts.ready);
    await testInfo.attach(`deals-${width}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
}

for (const width of [320, 375, 640, 768, 1280]) {
  test(`${width} px: the toolbar and an active brand never overflow sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?brands=Nike,Under+Armour&category=Clothes&discount=40");
    await expect(page.getByText(/\d+ deals$/)).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const bar = await page.getByRole("search", { name: "Filter deals" }).boundingBox();
    const controls = await page
      .getByRole("search", { name: "Filter deals" })
      .locator("fieldset, input[type=search], select, button")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => node.getBoundingClientRect())
          .filter((box) => box.width > 0)
          .map((box) => box.right),
      );
    expect(Math.max(...controls)).toBeLessThanOrEqual((bar?.x ?? 0) + (bar?.width ?? 0) + 0.5);
  });
}

test("the layout doesn't shift when deals replace the skeleton", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();
  const shift = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as {
            value: number;
            hadRecentInput: boolean;
          }[]) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(total), 500);
      }),
  );
  expect(shift).toBeLessThan(0.05);
});

test("only the rows near the viewport are rendered, and scrolling reaches the last deal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();
  const cards = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link") });

  expect(await cards.count()).toBeLessThan(81);

  // The first scroll reaches the end of the first page, which loads the second.
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(cards.last()).toHaveAttribute("aria-posinset", "81", { timeout: 1000 });
  }).toPass();
  await expect(cards.last()).toBeInViewport();
});

/** The position (1-based) of the first card in the top visible row. */
async function topDeal(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll("main [aria-posinset]")];
    const top = cards.find((card) => card.getBoundingClientRect().bottom > 0);
    return Number(top?.getAttribute("aria-posinset"));
  });
}

/** Loads the page at 5 columns, scrolls a few rows down and returns the deal now at the top. */
async function scrollIntoTheGrid(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();
  await page.mouse.wheel(0, 3000);
  await expect.poll(() => topDeal(page)).toBeGreaterThan(10);
  return topDeal(page);
}

test("a reload returns to the deal that was at the top", async ({ page }) => {
  const before = await scrollIntoTheGrid(page);

  await page.reload();

  await expect.poll(() => topDeal(page)).toBe(before);
});

test("a reload returns to a deal on the second page, loading as far as it had", async ({
  page,
}) => {
  await scrollIntoTheGrid(page);
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect(await topDeal(page)).toBeGreaterThan(60);
  }).toPass();
  const before = await topDeal(page);

  await page.reload();

  await expect.poll(() => topDeal(page)).toBe(before);
});

test("a column change keeps the deal that was at the top in view", async ({ page }) => {
  const before = await scrollIntoTheGrid(page);

  await page.setViewportSize({ width: 390, height: 900 }); // 5 columns → 2

  await expect(page.locator(`main [aria-posinset="${before}"]`)).toBeInViewport();
});

for (const width of [640, 768, 1280]) {
  test(`${width} px: Tab moves through the toolbar in the order it is laid out`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByText("81 deals")).toBeVisible();

    const positions = await page
      .getByRole("search", { name: "Filter deals" })
      .locator("fieldset, input[type=search], select, button")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => node.getBoundingClientRect())
          .filter((box) => box.width > 0)
          // Controls in one row differ in height, so rows are told apart by their centre line.
          .map(
            (box) => Math.round((box.top + box.height / 2) / 20) * 10_000 + Math.round(box.left),
          ),
      );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
}
