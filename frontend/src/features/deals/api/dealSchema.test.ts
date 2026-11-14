import { expect, test, vi } from "vite-plus/test";
import fixture from "@/test/fixtures/deals.json";
import { makeDeal } from "@/test/makeDeal";
import { parsePage } from "./dealSchema";

const FACETS = {
  stores: [{ store: "jd", name: "JD Sports", count: 2 }],
  brands: [{ brand: "Nike", count: 2 }],
  sizes: [{ size: "M", count: 2 }],
  discounts: [{ minDiscount: 30, count: 2 }],
};
const page = (items: unknown[], overrides: Record<string, unknown> = {}) => ({
  items,
  total: items.length,
  nextCursor: null,
  trackingSince: 1_700_000_000_000,
  ...overrides,
});
const invalidBody = expect.objectContaining({ kind: "invalid-body" });

test("a valid first page passes through unchanged", () => {
  const body = page([makeDeal(), makeDeal({ sizes: undefined, imageUrl: undefined })], {
    total: 7,
    nextCursor: "abc",
    facets: FACETS,
  });
  expect(parsePage(body)).toEqual(body);
});

test("a later page has no facets, and an empty page is fine", () => {
  expect(parsePage(page([]))).toEqual(page([]));
});

test("legacy price strings are coerced to numbers", () => {
  const { items } = parsePage(page([{ ...makeDeal(), wasPrice: "£1,135.00", nowPrice: "54.99" }]));
  expect(items[0]).toMatchObject({ wasPrice: 1135, nowPrice: 54.99 });
});

test("an invalid deal is dropped and counted; the rest survive", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const good = makeDeal();
  const { brand: _brand, ...noBrand } = makeDeal();
  const { store: _store, ...noStore } = makeDeal();

  const { items } = parsePage(
    page([
      good,
      { ...makeDeal(), nowPrice: "free" },
      { ...makeDeal(), category: "Kids" },
      noBrand,
      noStore,
      null,
    ]),
  );

  expect(items).toEqual([good]);
  expect(warn).toHaveBeenCalledWith("Dropped 5 of 6 deals that failed validation.");
});

test("fields the backend no longer sends are stripped, and an unknown gender becomes Unisex", () => {
  const { items } = parsePage(page([{ ...makeDeal(), inStock: "IN STOCK", gender: "Kids" }]));
  expect(items[0]).not.toHaveProperty("inStock");
  expect(items[0]?.gender).toBe("Unisex");
});

test("a page with no valid deal is an invalid-body error, not an empty sale", () => {
  const { brand: _brand, ...noBrand } = makeDeal();
  expect(() => parsePage(page([noBrand, noBrand]))).toThrow(invalidBody);
});

test.each([
  ["not an object", null],
  ["the old bare list", [makeDeal()]],
  ["an error body", { error: "Not Found" }],
  ["no total", page([], { total: undefined })],
  ["a negative total", page([], { total: -1 })],
  ["a fractional total", page([], { total: 1.5 })],
  ["no nextCursor", page([], { nextCursor: undefined })],
  ["a numeric nextCursor", page([], { nextCursor: 60 })],
  ["no trackingSince", page([], { trackingSince: null })],
  ["facets missing a list", page([], { facets: { ...FACETS, sizes: undefined } })],
  ["a facet row without a count", page([], { facets: { ...FACETS, brands: [{ brand: "Nike" }] } })],
  [
    "a store without a name",
    page([], { facets: { ...FACETS, stores: [{ store: "jd", count: 1 }] } }),
  ],
])("the envelope is strict: %s is invalid-body", (_case, body) => {
  expect(() => parsePage(body)).toThrow(invalidBody);
});

test("every deal in the checked-in fixture is valid", () => {
  expect(parsePage(page(fixture)).items).toHaveLength(81);
});
