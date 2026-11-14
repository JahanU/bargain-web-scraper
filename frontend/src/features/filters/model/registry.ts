import { createParser, throttle } from "nuqs";
import {
  type CategoryScope,
  compareSizes,
  DEFAULT_DISCOUNT,
  type Gender,
  type SortId,
} from "@/features/deals";
import { defineFilter, type FilterChip, type FilterDefinition } from "./types";

// The extension point: a new filter is one entry here plus its control.

export const SEARCH_MAX_LENGTH = 64;

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
    chips: (value) => [{ label: `“${value.trim()}”`, next: "" }],
  }),

  discount: defineFilter({
    parser: createParser<number>({
      // A whole percentage from the default up; anything else falls back to the default. The
      // stops on offer are the backend's, so no list of them lives here.
      parse: (value) =>
        /^\d+$/.test(value) && Number(value) >= DEFAULT_DISCOUNT && Number(value) <= 100
          ? Number(value)
          : null,
      serialize: String,
    }).withDefault(DEFAULT_DISCOUNT),
    isActive: (value) => value !== DEFAULT_DISCOUNT,
    chips: (value) => [{ label: `≥${value}%`, next: DEFAULT_DISCOUNT }],
  }),

  sizes: defineFilter<string[]>({
    parser: listParser(compareSizes),
    isActive: (sizes) => sizes.length > 0,
    chips: listChips,
  }),

  brands: defineFilter<string[]>({
    parser: listParser(),
    isActive: (brands) => brands.length > 0,
    chips: listChips,
  }),

  /** Retailer ids. */
  stores: defineFilter<string[]>({
    parser: listParser(),
    isActive: (stores) => stores.length > 0,
    chips: listChips,
  }),
};

type Registry = typeof filterRegistry;
export type FilterKey = keyof Registry;
export type FilterValues = { [K in FilterKey]: Registry[K]["parser"]["defaultValue"] };
/** The whole URL state, which is also the deals request: the URL says what the backend is asked. */
export type FilterState = FilterValues & { sort: SortId; gender: Gender; category: CategoryScope };

export const FILTER_KEYS = Object.keys(filterRegistry) as FilterKey[];

// TypeScript can't relate a key to its own value type across the union, hence the one cast.
function definition<K extends FilterKey>(key: K): FilterDefinition<FilterValues[K]> {
  return filterRegistry[key] as unknown as FilterDefinition<FilterValues[K]>;
}

export function isFilterActive<K extends FilterKey>(key: K, value: FilterValues[K]): boolean {
  return definition(key).isActive(value);
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
