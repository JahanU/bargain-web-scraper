import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./test";

for (const colorScheme of ["light", "dark"] as const) {
  test(`no axe violations in the ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.getByText("81 deals")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });
}
