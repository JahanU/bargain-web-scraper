import { expect, test } from "vite-plus/test";
import { deal } from "@/test/deal";
import type { FilterState } from "./applyFilters";
import { explainEmpty } from "./explainEmpty";

const deals = [
  deal({ name: "Nike Tee", discount: 50, sizes: ["M"] }),
  deal({ name: "Nike Tee 2", discount: 40, sizes: ["M"] }),
  deal({ name: "Adidas Top", discount: 70, sizes: ["L"] }),
];
const values = (overrides: Partial<FilterState>): FilterState => ({
  search: "",
  discount: 30,
  sizes: [],
  brands: [],
  sort: "discount-high-to-low",
  gender: "Male",
  category: "All",
  store: "all",
  ...overrides,
});

test("relaxes each filter alone: the nearest discount that works, any size, no search", () => {
  expect(explainEmpty(deals, values({ discount: 70, sizes: ["M"] }))).toEqual({
    title: "No deals at 70% or more in size M",
    suggestions: [
      { label: "Show 1 deal at 50% or more", next: { discount: 50 } },
      { label: "Show 1 deal in any size", next: { sizes: [] } },
    ],
  });
});

test("search alone: quotes the term and suggests shortening it", () => {
  expect(explainEmpty(deals, values({ search: "nike zoom" }))).toEqual({
    title: "Nothing matches “nike zoom”",
    hint: "Try a shorter or different search.",
    suggestions: [{ label: "Show 3 deals without the search", next: { search: "" } }],
  });
});

test("a relaxation that still shows nothing isn't offered", () => {
  expect(explainEmpty(deals, values({ search: "puma", sizes: ["XS"], discount: 90 }))).toEqual({
    title: "No deals for “puma” at 90% or more in size XS",
    suggestions: [],
  });
});

test("brands are named, and dropping them is offered even when nothing is loaded to count", () => {
  expect(explainEmpty([], values({ brands: ["Fila", "Kappa"] }))).toEqual({
    title: "No deals at 30% or more from Fila or Kappa",
    suggestions: [{ label: "Show deals from any brand", next: { brands: [] } }],
  });
});
