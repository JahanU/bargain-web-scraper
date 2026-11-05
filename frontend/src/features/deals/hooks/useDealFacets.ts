import { useMemo } from "react";
import type { Deal } from "../model/Deal";
import { sizeFacets } from "../model/sizes";

/**
 * Size groups with counts. Pass the deals filtered by everything except sizes, so each count
 * answers "how many will I see if I add this size". (Deals knows nothing about filters.)
 */
export function useDealFacets(deals: readonly Deal[] | undefined) {
  return useMemo(() => sizeFacets(deals ?? []), [deals]);
}
