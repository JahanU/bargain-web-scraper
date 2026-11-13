import { expect, test } from "vite-plus/test";
import { deal } from "@/test/deal";
import { type FilterState, applyFilters } from "./applyFilters";

// The legacy sort.spec items, plus one deal for ties.
const nike = deal({ name: "Nike Air", nowPrice: 70, discount: 32, sizes: ["M", "L"] });
const adidas = deal({
  name: "Adidas Runner",
  brand: "adidas",
  nowPrice: 55,
  discount: 31,
  sizes: ["S", "M"],
});
const puma = deal({ name: "Puma Tee", nowPrice: 20, discount: 50, sizes: ["XL"] });
const vans = deal({ name: "Vans Tee", nowPrice: 20, discount: 50, sizes: undefined });
const deals = [nike, adidas, puma, vans];

const DEFAULTS: FilterState = {
  search: "",
  discount: 30,
  sizes: [],
  brands: [],
  sort: "discount-high-to-low",
  gender: "Male",
  category: "All",
};
const names = (values: Partial<FilterState>, input = deals) =>
  applyFilters(input, { ...DEFAULTS, ...values }).map((item) => item.name);

test("defaults keep everything, best discount first then cheapest", () => {
  expect(names({})).toEqual(["Puma Tee", "Vans Tee", "Nike Air", "Adidas Runner"]);
});

test("search is case-insensitive and trimmed", () => {
  expect(names({ search: "  NIKE " })).toEqual(["Nike Air"]);
  expect(names({ search: "tee" })).toEqual(["Puma Tee", "Vans Tee"]);
  expect(names({ search: "zzznomatch" })).toEqual([]);
});

test("minimum discount is inclusive", () => {
  expect(names({ discount: 50 })).toEqual(["Puma Tee", "Vans Tee"]);
  expect(names({ discount: 32 })).toEqual(["Puma Tee", "Vans Tee", "Nike Air"]);
});

test("sizes match any selected size; deals without sizes never match", () => {
  expect(names({ sizes: ["XL"] })).toEqual(["Puma Tee"]);
  expect(names({ sizes: ["S", "L"] })).toEqual(["Nike Air", "Adidas Runner"]);
});

test("filters combine with AND", () => {
  expect(names({ discount: 31, sizes: ["M"], search: "runner" })).toEqual(["Adidas Runner"]);
  expect(names({ discount: 40, sizes: ["M"] })).toEqual([]);
});

test.each([
  ["price-low-to-high", ["Puma Tee", "Vans Tee", "Adidas Runner", "Nike Air"]],
  ["price-high-to-low", ["Nike Air", "Adidas Runner", "Puma Tee", "Vans Tee"]],
  ["discount-high-to-low", ["Puma Tee", "Vans Tee", "Nike Air", "Adidas Runner"]],
  ["discount-low-to-high", ["Adidas Runner", "Nike Air", "Puma Tee", "Vans Tee"]],
] as const)("sort %s, after filtering", (sort, expected) => {
  expect(names({ sort })).toEqual(expected);
});

test("full ties keep their incoming order (stable)", () => {
  expect(names({ sort: "price-low-to-high" }, [vans, puma])).toEqual(["Vans Tee", "Puma Tee"]);
  expect(names({ sort: "price-low-to-high" }, [puma, vans])).toEqual(["Puma Tee", "Vans Tee"]);
});

test("does not mutate its input", () => {
  const input = [...deals];
  applyFilters(input, { ...DEFAULTS, sort: "price-low-to-high", discount: 50 });
  expect(input).toEqual(deals);
});

test("`except` leaves one filter out", () => {
  const all = { ...DEFAULTS, sizes: ["XL"], discount: 31 };
  expect(applyFilters(deals, all, "sizes").map((item) => item.name)).toEqual([
    "Puma Tee",
    "Vans Tee",
    "Nike Air",
    "Adidas Runner",
  ]);
});

test("brands match the deal's brand field, any of the selected", () => {
  expect(names({ brands: ["adidas"] })).toEqual(["Adidas Runner"]);
  expect(names({ brands: ["adidas", "Nike"] })).toEqual([
    "Puma Tee",
    "Vans Tee",
    "Nike Air",
    "Adidas Runner",
  ]);
  expect(names({ brands: ["Fila"] })).toEqual([]);
});
