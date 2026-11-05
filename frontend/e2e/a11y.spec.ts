import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const colorScheme of ["light", "dark"] as const) {
  test(`no axe violations in the ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });
}
