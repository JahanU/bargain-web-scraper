import { test as base } from "@playwright/test";
import fixture from "../src/test/fixtures/deals.json" with { type: "json" };

export { expect } from "@playwright/test";

// A stand-in product photo, so tests never reach the image CDN.
const PHOTO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 726 926"><rect width="726" height="926" fill="#fff"/><path d="M180 620h366l-60-260H240z" fill="#c9c4bb"/></svg>`;

/** Every page answers the deals API from the checked-in fixture; the real API is never hit. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route("**/v1/deals", (route) =>
      route.fulfill({ json: fixture, headers: { "Access-Control-Allow-Origin": "*" } }),
    );
    await page.route("https://i8.amplience.net/**", (route) =>
      route.fulfill({ body: PHOTO, contentType: "image/svg+xml" }),
    );
    await provide(page);
  },
});
