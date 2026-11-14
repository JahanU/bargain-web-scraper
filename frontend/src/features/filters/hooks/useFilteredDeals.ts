import { useDeferredValue, useMemo } from "react";
import type { Deal } from "@/features/deals";
import { type FilterState, applyFilters } from "../model/applyFilters";

/**
 * The visible deals, plus the deals filtered by everything except sizes, and except discount,
 * which the size and discount controls count from.
 * Search is deferred so typing stays responsive while the list catches up.
 */
export function useFilteredDeals(deals: readonly Deal[] | undefined, values: FilterState) {
  const search = useDeferredValue(values.search);
  const { discount, sizes, brands, sort } = values;
  // The one explicit memo: the filter pass is the only per-keystroke work over every deal.
  return useMemo(() => {
    if (!deals)
      return { visible: undefined, withoutSizeFilter: undefined, withoutDiscountFilter: undefined };
    const deferred = { search, discount, sizes, brands, sort };
    return {
      visible: applyFilters(deals, deferred),
      withoutSizeFilter: applyFilters(deals, deferred, "sizes"),
      withoutDiscountFilter: applyFilters(deals, deferred, "discount"),
    };
  }, [deals, search, discount, sizes, brands, sort]);
}
