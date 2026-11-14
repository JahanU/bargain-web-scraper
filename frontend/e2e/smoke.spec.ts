import { dealsApi, expect, test } from "./test";

test("the page loads the deals", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Nike NFL Las Vegas Raiders Helmet T-Shirt" }),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText(/Last updated \d\d:\d\d/);
});

test("a returning visitor sees the saved snapshot even when the API is down", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();
  // Saves are throttled (1 s), so wait until the deals themselves are stored.
  await page.waitForFunction(() =>
    localStorage.getItem("bargain-deals")?.includes("Las Vegas Raiders"),
  );

  await page.route(dealsApi, (route) => route.abort());
  await page.reload();

  await expect(page.getByText("81 deals")).toBeVisible();
});

test("the self-hosted Archivo font loads", async ({ page }) => {
  await page.goto("/");
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('800 20px "Archivo"');
  });
  expect(loaded).toBe(true);
});

test("the head declares a real title, description, manifest and icons, and they are served", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Bargain: the biggest discounts on JD Sports and Size");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /30% off or more/,
  );

  for (const path of [
    "/manifest.webmanifest",
    "/favicon.svg",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/robots.txt",
  ]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ short_name: "Bargain", start_url: "/", display: "standalone" });
});
