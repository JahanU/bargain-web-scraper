import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchBrands } from "../api/dealsApi";
import { dealsKeys } from "../api/queryKeys";
import type { CategoryScope, Gender, StoreScope } from "../model/Deal";
import { apiQueryDefaults } from "./useDealsQuery";

/** Brand counts for a gender, category and store, biggest first. They ignore the brand selection. */
export function useBrandsQuery(gender: Gender, category: CategoryScope, store: StoreScope) {
  return useQuery(
    queryOptions({
      ...apiQueryDefaults,
      queryKey: dealsKeys.brands(gender, category, store),
      queryFn: ({ signal }) => fetchBrands(gender, category, store, signal),
    }),
  );
}
