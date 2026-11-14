import { type Page, test as base } from "@playwright/test";
import { queryDeals } from "../src/mocks/api";
import fixture from "../src/test/fixtures/deals.json" with { type: "json" };

export { expect } from "@playwright/test";
export { fixture };

// A stand-in product photo, so tests never reach the image CDN.
const PHOTO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 726 926"><rect width="726" height="926" fill="#fff"/><path d="M180 620h366l-60-260H240z" fill="#c9c4bb"/></svg>`;

// A glob would miss the ?gender= query string.
export const dealsApi = (url: URL) => url.pathname.endsWith("/v2/deals");
const headers = { "Access-Control-Allow-Origin": "*" };

/** Answers the API from `deals`, queried as the backend would. A later call replaces an earlier one. */
export function serveDeals(
  page: Page,
  deals: Parameters<typeof queryDeals>[0],
  stores?: Parameters<typeof queryDeals>[2],
) {
  return page.route(dealsApi, (route) =>
    route.fulfill({
      ...queryDeals(deals, new URL(route.request().url()).searchParams, stores),
      headers,
    }),
  );
}

/** Every page answers the API from the checked-in fixture. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await serveDeals(page, fixture);
    await page.route("https://i8.amplience.net/**", (route) =>
      route.fulfill({ body: PHOTO, contentType: "image/svg+xml" }),
    );
    await provide(page);
  },
});
