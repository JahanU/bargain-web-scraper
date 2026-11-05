import { expect, test } from "@playwright/test";

const theme = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.dataset.theme);

test("the theme is set before the app's JavaScript runs, so there is no flash", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.route("**/assets/*.js", (route) => route.abort());

  await page.goto("/");

  expect(await theme(page)).toBe("dark");
  // The dark surface token is painted, not just the attribute set: its OKLCH lightness is low.
  const background = await page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  );
  expect(background).toMatch(/^oklch\(/);
  expect(Number(background.match(/^oklch\(([\d.]+)/)?.[1])).toBeLessThan(0.3);
});

test("follows the system preference when nothing is stored", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await theme(page)).toBe("dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => theme(page)).toBe("light");
});

test("a manual choice survives a reload and overrides the system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await page.getByRole("button", { name: "Dark theme" }).click();
  await page.reload();

  expect(await theme(page)).toBe("dark");
  await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
