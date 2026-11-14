import { createParser, throttle } from "nuqs";
import { compareSizes } from "@/features/deals";
import { defineFilter, type FilterChip, type FilterDefinition } from "./types";

// The extension point: a new filter is one entry here plus its control.

export const SEARCH_MAX_LENGTH = 64;
export const DEFAULT_DISCOUNT = 30;
/** The backend sends nothing under 30% off, so the stops start there. */
export const DISCOUNT_STOPS = [30, 40, 50, 60, 70, 80, 90, 100] as const;

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/** A comma-separated list, written in canonical order so a selection always makes the same link. */
const listParser = (compare?: (a: string, b: string) => number) =>
  createParser({
    parse: (value) => {
      const items = [
        ...new Set(
          value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ];
      return items.length > 0 ? items : null;
    },
    serialize: (items: string[]) => [...items].sort(compare).join(","),
    eq: sameList,
  }).withDefault([]);

const listChips = (items: string[]) =>
  items.map((item) => ({ label: item, next: items.filter((other) => other !== item) }));

export const filterRegistry = {
  search: defineFilter({
    parser: createParser({
      parse: (value) => value.trim().slice(0, SEARCH_MAX_LENGTH),
      serialize: (value) => value.trim(),
    })
      .withDefault("")
      .withOptions({ limitUrlUpdates: throttle(250) }),
    isActive: (value) => value.trim() !== "",
    predicate: (value) => {
      const term = value.trim().toLowerCase();
      return (deal) => deal.searchText.includes(term);
    },
    chips: (value) => [{ label: `“${value.trim()}”`, next: "" }],
  }),

  discount: defineFilter({
    parser: createParser<number>({
      // Only the stops; anything else falls back to the default.
      parse: (value) => DISCOUNT_STOPS.find((stop) => String(stop) === value) ?? null,
      serialize: String,
    }).withDefault(DEFAULT_DISCOUNT),
    isActive: (value) => value !== DEFAULT_DISCOUNT,
    predicate: (value) => (deal) => deal.discount >= value,
    chips: (value) => [{ label: `≥${value}%`, next: DEFAULT_DISCOUNT }],
  }),

  sizes: defineFilter<string[]>({
    parser: listParser(compareSizes),
    isActive: (sizes) => sizes.length > 0,
    // OR within sizes; AND with the other filters.
    predicate: (sizes) => {
      const wanted = new Set(sizes);
      return (deal) => deal.sizes.some((size) => wanted.has(size));
    },
    chips: listChips,
  }),

  // The backend applies brands; the predicate keeps the list right while that request is in flight.
  brands: defineFilter<string[]>({
    parser: listParser(),
    isActive: (brands) => brands.length > 0,
    predicate: (brands) => (deal) => brands.includes(deal.brand),
    chips: listChips,
  }),
};

type Registry = typeof filterRegistry;
export type FilterKey = keyof Registry;
export type FilterValues = { [K in FilterKey]: Registry[K]["parser"]["defaultValue"] };

export const FILTER_KEYS = Object.keys(filterRegistry) as FilterKey[];

// TypeScript can't relate a key to its own value type across the union, hence the one cast.
function definition<K extends FilterKey>(key: K): FilterDefinition<FilterValues[K]> {
  return filterRegistry[key] as unknown as FilterDefinition<FilterValues[K]>;
}

export function isFilterActive<K extends FilterKey>(key: K, value: FilterValues[K]): boolean {
  return definition(key).isActive(value);
}

export function filterPredicate<K extends FilterKey>(key: K, value: FilterValues[K]) {
  return definition(key).predicate(value);
}

export type ActiveChip = {
  [K in FilterKey]: FilterChip<FilterValues[K]> & { filter: K };
}[FilterKey];

/** Every removable chip for the current values, in registry order. */
export function activeChips(values: FilterValues): ActiveChip[] {
  return FILTER_KEYS.flatMap((key) =>
    isFilterActive(key, values[key])
      ? definition(key)
          .chips(values[key])
          .map((chip) => ({ ...chip, filter: key }) as ActiveChip)
      : [],
  );
}

/** How many deals each discount stop would show (pass deals filtered by everything else). */
export function discountCounts(deals: readonly { discount: number }[]): Record<number, number> {
  return Object.fromEntries(
    DISCOUNT_STOPS.map((stop) => [stop, deals.filter((deal) => deal.discount >= stop).length]),
  );
}
