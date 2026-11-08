import type { Deal, Gender } from "@/features/deals";
import {
  FILTER_KEYS,
  type FilterKey,
  type FilterValues,
  filterPredicate,
  isFilterActive,
} from "./registry";
import { compareDeals, type SortId } from "./sort";

type ClientFilters = FilterValues & { sort: SortId };
export type FilterState = ClientFilters & { gender: Gender };

/**
 * One pass: build the active predicates once, filter once, sort once (stable). `except` leaves
 * one filter out, e.g. to count what each size would show with everything else applied.
 */
export function applyFilters(
  deals: readonly Deal[],
  values: ClientFilters,
  except?: FilterKey,
): Deal[] {
  const predicates = FILTER_KEYS.filter(
    (key) => key !== except && isFilterActive(key, values[key]),
  ).map((key) => filterPredicate(key, values[key]));
  const kept =
    predicates.length > 0
      ? deals.filter((deal) => predicates.every((test) => test(deal)))
      : [...deals];
  return kept.sort(compareDeals(values.sort));
}
