import { expect, test } from "vite-plus/test";
import type { Facets } from "@/features/deals";
import { explainEmpty } from "./explainEmpty";
import type { FilterState } from "./registry";

const values = (overrides: Partial<FilterState>): FilterState => ({
  search: "",
  discount: 30,
  sizes: [],
  brands: [],
  stores: [],
  sort: "discount-high-to-low",
  gender: "Male",
  category: "All",
  ...overrides,
});
const facets = (overrides: Partial<Facets> = {}): Facets => ({
  stores: [
    { store: "jd", name: "JD Sports", count: 0 },
    { store: "fl", name: "Foot Locker", count: 0 },
  ],
  brands: [],
  sizes: [],
  discounts: [30, 40, 50, 60, 70].map((minDiscount) => ({ minDiscount, count: 0 })),
  ...overrides,
});

test("each filter whose own facet has deals is offered; discount goes to the nearest stop that works", () => {
  const found = facets({
    discounts: [
      { minDiscount: 30, count: 4 },
      { minDiscount: 40, count: 4 },
      { minDiscount: 50, count: 1 },
      { minDiscount: 60, count: 0 },
      { minDiscount: 70, count: 0 },
    ],
    sizes: [{ size: "L", count: 2 }],
    brands: [{ brand: "Nike", count: 3 }],
    stores: [
      { store: "jd", name: "JD Sports", count: 5 },
      { store: "fl", name: "Foot Locker", count: 0 },
    ],
  });

  expect(
    explainEmpty(values({ discount: 70, sizes: ["M"], brands: ["Fila"], stores: ["fl"] }), found),
  ).toEqual({
    title: "No deals at 70% or more in size M from Fila at Foot Locker",
    suggestions: [
      { label: "Show 1 deal at 50% or more", next: { discount: 50 } },
      { label: "Show deals in any size", next: { sizes: [] } },
      { label: "Show deals from any brand", next: { brands: [] } },
      { label: "Show deals at any store", next: { stores: [] } },
    ],
  });
});

test("a filter whose facet is empty isn't offered: dropping it alone would still show nothing", () => {
  expect(
    explainEmpty(
      values({ discount: 90, sizes: ["XS"], brands: ["Fila", "Kappa"], stores: ["jd"] }),
      facets(),
    ),
  ).toEqual({
    title: "No deals at 90% or more in size XS from Fila or Kappa at JD Sports",
    suggestions: [],
  });
});

test("search alone: quotes the term, suggests shortening it, and always offers to clear it", () => {
  expect(explainEmpty(values({ search: " nike zoom " }), facets())).toEqual({
    title: "Nothing matches “nike zoom”",
    hint: "Try a shorter or different search.",
    suggestions: [{ label: "Clear search", next: { search: "" } }],
  });
});

test("search with other filters is named first and still offered last", () => {
  expect(
    explainEmpty(
      values({ search: "puma", sizes: ["M", "L"] }),
      facets({ sizes: [{ size: "S", count: 3 }] }),
    ),
  ).toEqual({
    title: "No deals for “puma” at 30% or more in size M or L",
    suggestions: [
      { label: "Show deals in any size", next: { sizes: [] } },
      { label: "Clear search", next: { search: "" } },
    ],
  });
});

test("without facets only Clear search is offered, and a store shows as its id", () => {
  expect(explainEmpty(values({ search: "x", stores: ["jd"], discount: 50 }), undefined)).toEqual({
    title: "No deals for “x” at 50% or more at jd",
    suggestions: [{ label: "Clear search", next: { search: "" } }],
  });
});
