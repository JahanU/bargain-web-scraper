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

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(cards.last()).toHaveAttribute("aria-posinset", "81");
  await expect(cards.last()).toBeInViewport();
});
