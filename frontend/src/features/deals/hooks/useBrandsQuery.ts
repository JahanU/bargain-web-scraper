import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchBrands } from "../api/dealsApi";
import { dealsKeys } from "../api/queryKeys";
import type { CategoryScope, Gender } from "../model/Deal";
import { apiQueryDefaults } from "./useDealsQuery";

/** Brand counts for a gender and category, biggest first. They ignore the brand selection. */
export function useBrandsQuery(gender: Gender, category: CategoryScope) {
  return useQuery(
    queryOptions({
      ...apiQueryDefaults,
      queryKey: dealsKeys.brands(gender, category),
      queryFn: ({ signal }) => fetchBrands(gender, category, signal),
    }),
  );
}
