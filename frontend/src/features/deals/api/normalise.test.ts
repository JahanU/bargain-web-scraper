import { expect, test } from "vite-plus/test";
import { makeDeal } from "@/test/makeDeal";
import type { WirePage } from "./dealSchema";
import { normaliseDeal, normalisePages } from "./normalise";

test("turns a wire deal into the UI's Deal", () => {
  const deal = normaliseDeal(
    makeDeal({
      name: "The North Face Mountain Jacket",
      brand: "The North Face",
      category: "Clothes",
      url: "https://www.jdsports.co.uk/product/black-tnf/19599668/",
      sizes: ["XL", "S", "9", "S"],
      timestamp: 123,
    }),
  );

  expect(deal).toMatchObject({
    id: "https://www.jdsports.co.uk/product/black-tnf/19599668/",
    brand: "The North Face",
    category: "Clothes",
    store: "jd",
    sizes: ["S", "XL", "9"],
    foundAt: 123,
  });
  expect(deal.image?.srcSet).toContain("w=240");
});

test("missing sizes and image become an empty list and no image", () => {
  const deal = normaliseDeal(makeDeal({ sizes: undefined, imageUrl: undefined }));
  expect(deal.sizes).toEqual([]);
  expect(deal.image).toBeUndefined();
});

const page = (items: WirePage["items"], overrides: Partial<WirePage> = {}): WirePage => ({
  items,
  total: 3,
  nextCursor: null,
  trackingSince: 100,
  ...overrides,
});

test("pages become one list in order; total, tracking time and facets are the first page's", () => {
  const [a, b, c] = [makeDeal(), makeDeal(), makeDeal()];
  const facets = { stores: [], brands: [{ brand: "Nike", count: 3 }], sizes: [], discounts: [] };

  const result = normalisePages({
    pages: [page([a, b], { facets, nextCursor: "x" }), page([c], { total: 99, trackingSince: 5 })],
  });

  expect(result.deals.map((deal) => deal.id)).toEqual([a.url, b.url, c.url]);
  expect(result).toMatchObject({ total: 3, trackingSince: 100, facets });
});

test("a deal that comes back on a later page is listed once, where it first appeared", () => {
  const [a, b, c] = [makeDeal(), makeDeal(), makeDeal()];

  const { deals } = normalisePages({ pages: [page([a, b]), page([b, c])] });

  expect(deals.map((deal) => deal.id)).toEqual([a.url, b.url, c.url]);
});
