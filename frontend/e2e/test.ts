import { test as base } from "@playwright/test";
import { brandCounts, filterDeals } from "../src/mocks/api";
import fixture from "../src/test/fixtures/deals.json" with { type: "json" };

export { expect } from "@playwright/test";

// A stand-in product photo, so tests never reach the image CDN.
const PHOTO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 726 926"><rect width="726" height="926" fill="#fff"/><path d="M180 620h366l-60-260H240z" fill="#c9c4bb"/></svg>`;

// A glob would miss the ?gender= query string.
export const dealsApi = (url: URL) => url.pathname.endsWith("/v1/deals");
const brandsApi = (url: URL) => url.pathname.endsWith("/v1/brands");
const headers = { "Access-Control-Allow-Origin": "*" };

/** Every page answers the API from the checked-in fixture, filtered as the backend would. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route(dealsApi, (route) =>
      route.fulfill({
        json: filterDeals(fixture, new URL(route.request().url()).searchParams),
        headers,
      }),
    );
    await page.route(brandsApi, (route) =>
      route.fulfill({
        json: brandCounts(fixture, new URL(route.request().url()).searchParams),
        headers,
      }),
    );
    await page.route("https://i8.amplience.net/**", (route) =>
      route.fulfill({ body: PHOTO, contentType: "image/svg+xml" }),
    );
    await provide(page);
  },
});
