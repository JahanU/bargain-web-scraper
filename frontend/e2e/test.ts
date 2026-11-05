import { test as base } from "@playwright/test";
import fixture from "../src/test/fixtures/deals.json" with { type: "json" };

export { expect } from "@playwright/test";

/** Every page answers the deals API from the checked-in fixture; the real API is never hit. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route("**/v1/deals", (route) =>
      route.fulfill({ json: fixture, headers: { "Access-Control-Allow-Origin": "*" } }),
    );
    await provide(page);
  },
});
