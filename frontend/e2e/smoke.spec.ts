import { expect, test } from "@playwright/test";

test("the page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Bargain" })).toBeVisible();
});
