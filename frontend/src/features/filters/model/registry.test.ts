import { createLoader, createSerializer } from "nuqs";
import { expect, test } from "vite-plus/test";
import { deal } from "@/test/deal";
import { activeChips, filterRegistry } from "./registry";
import { sortParser } from "./sort";

const parsers = {
  search: filterRegistry.search.parser,
  discount: filterRegistry.discount.parser,
  sizes: filterRegistry.sizes.parser,
  sort: sortParser,
};
const load = createLoader(parsers);
const serialize = createSerializer(parsers);
const DEFAULTS = {
  search: "",
  discount: 30,
  sizes: [] as string[],
  sort: "discount-high-to-low" as const,
};

test("a link shared before the rewrite parses as it did", () => {
  expect(load("?search=nike&sizes=M,L&sort=price-low-to-high")).toEqual({
    search: "nike",
    discount: 30,
    sizes: ["M", "L"],
    sort: "price-low-to-high",
  });
});

test("no params means the defaults", () => {
  expect(load("")).toEqual(DEFAULTS);
});

test("defaults are left out of the URL", () => {
  expect(serialize(DEFAULTS)).toBe("");
});

test.each([
  ["?search=nike", { search: "nike" }],
  ["?discount=50", { discount: 50 }],
  ["?sizes=S,M,8", { sizes: ["S", "M", "8"] }],
  ["?sort=price-high-to-low", { sort: "price-high-to-low" }],
  [
    "?search=air+max&discount=70&sizes=XL,9&sort=discount-low-to-high",
    {
      search: "air max",
      discount: 70,
      sizes: ["XL", "9"],
      sort: "discount-low-to-high",
    },
  ],
])("round-trips %s", (url, values) => {
  const parsed = load(url);
  expect(parsed).toEqual({ ...DEFAULTS, ...values });
  expect(serialize(parsed)).toBe(url);
});

test("search is trimmed and capped at 64 characters", () => {
  expect(load("?search=%20%20nike%20").search).toBe("nike");
  expect(load(`?search=${"a".repeat(80)}`).search).toHaveLength(64);
  expect(serialize({ search: " nike " })).toBe("?search=nike");
});

test.each(["5", "35", "0", "110", "abc", "50.5", ""])("discount=%j falls back to 30", (value) => {
  expect(load(`?discount=${value}`).discount).toBe(30);
});

test.each([10, 20, 100])("discount=%i is a valid stop", (value) => {
  expect(load(`?discount=${value}`).discount).toBe(value);
});

test("sizes: trimmed, deduplicated, empty segments dropped", () => {
  expect(load("?sizes=%20S%20,%20M%20").sizes).toEqual(["S", "M"]);
  expect(load("?sizes=M,M,L").sizes).toEqual(["M", "L"]);
  expect(load("?sizes=S,,L").sizes).toEqual(["S", "L"]);
  expect(load("?sizes=,,").sizes).toEqual([]);
});

test("sizes are written in canonical order, so a selection always makes the same link", () => {
  expect(serialize({ sizes: ["9", "L", "S"] })).toBe("?sizes=S,L,9");
});

test.each(["", "invalid-sort", "price"])("sort=%j falls back to best discount", (value) => {
  expect(load(`?sort=${value}`).sort).toBe("discount-high-to-low");
});

test("unknown params are ignored", () => {
  expect(load("?gender=male&mock=loading")).toEqual(DEFAULTS);
});

test("one chip per non-default value, each knowing the value without it", () => {
  expect(activeChips({ search: "nike", discount: 50, sizes: ["M", "L"] })).toEqual([
    { filter: "search", label: "“nike”", next: "" },
    { filter: "discount", label: "≥50%", next: 30 },
    { filter: "sizes", label: "M", next: ["L"] },
    { filter: "sizes", label: "L", next: ["M"] },
  ]);
  expect(activeChips({ search: "  ", discount: 30, sizes: [] })).toEqual([]);
});

test("predicates", () => {
  const tee = deal({ name: "Nike Tee", discount: 40, sizes: ["M"] });
  expect(filterRegistry.search.predicate(" TEE ")(tee)).toBe(true);
  expect(filterRegistry.discount.predicate(40)(tee)).toBe(true);
  expect(filterRegistry.discount.predicate(50)(tee)).toBe(false);
  expect(filterRegistry.sizes.predicate(["S", "M"])(tee)).toBe(true);
  expect(filterRegistry.sizes.predicate(["S"])(tee)).toBe(false);
});
