import { expect, test } from "@playwright/test";

test("the page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the self-hosted Archivo font loads", async ({ page }) => {
  await page.goto("/");
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('800 20px "Archivo"');
  });
  expect(loaded).toBe(true);
});
