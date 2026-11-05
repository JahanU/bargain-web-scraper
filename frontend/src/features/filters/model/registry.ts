import { createParser, throttle } from "nuqs";
import { compareSizes } from "@/features/deals";
import { defineFilter, type FilterChip, type FilterDefinition } from "./types";

// The extension point: a new filter is one entry here plus its control.

export const SEARCH_MAX_LENGTH = 64;
export const DEFAULT_DISCOUNT = 30;
export const DISCOUNT_STOPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

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
    parser: createParser({
      // Multiples of 10 from 10 to 100; anything else falls back to the default.
      parse: (value) => {
        const number = Number(value);
        return Number.isInteger(number) && number >= 10 && number <= 100 && number % 10 === 0
          ? number
          : null;
      },
      serialize: String,
    }).withDefault(DEFAULT_DISCOUNT),
    isActive: (value) => value !== DEFAULT_DISCOUNT,
    predicate: (value) => (deal) => deal.discount >= value,
    chips: (value) => [{ label: `≥${value}%`, next: DEFAULT_DISCOUNT }],
  }),

  sizes: defineFilter<string[]>({
    parser: createParser({
      parse: (value) => {
        const sizes = [
          ...new Set(
            value
              .split(",")
              .map((size) => size.trim())
              .filter(Boolean),
          ),
        ];
        return sizes.length > 0 ? sizes : null;
      },
      // Canonical order, so the same selection always makes the same link.
      serialize: (sizes) => [...sizes].sort(compareSizes).join(","),
      eq: sameList,
    }).withDefault([]),
    isActive: (sizes) => sizes.length > 0,
    // OR within sizes; AND with the other filters.
    predicate: (sizes) => {
      const wanted = new Set(sizes);
      return (deal) => deal.sizes.some((size) => wanted.has(size));
    },
    chips: (sizes) =>
      sizes.map((size) => ({ label: size, next: sizes.filter((other) => other !== size) })),
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
