import { queryOptions, useQuery } from "@tanstack/react-query";
import { ApiError } from "../api/ApiError";
import { fetchDeals } from "../api/dealsApi";
import { normaliseDeals } from "../api/normalise";
import { dealsKeys } from "../api/queryKeys";
import type { DealsRequest } from "../model/Deal";

const FIVE_MINUTES = 5 * 60_000;

/** Freshness and retries shared by the deals and brands queries. */
export const apiQueryDefaults = {
  staleTime: FIVE_MINUTES, // the backend scrapes every 5 minutes
  gcTime: 30 * 60_000,
  refetchInterval: FIVE_MINUTES, // only while the tab is visible
  refetchOnWindowFocus: true,
  // 503s are already retried inside the fetch; retry only network errors and 5xx here.
  retry: (failureCount: number, error: Error) =>
    failureCount < 3 &&
    error instanceof ApiError &&
    (error.kind === "network" || (error.kind === "http" && (error.status ?? 0) >= 500)),
};

/**
 * The cache holds validated wire deals (plain JSON, so it persists); components get Deals.
 * One entry per gender, category and brand selection, so a late response for one selection can
 * never land in another.
 */
export const dealsQueryOptions = (request: DealsRequest) =>
  queryOptions({
    ...apiQueryDefaults,
    queryKey: dealsKeys.list(request),
    queryFn: ({ signal }) => fetchDeals(request, signal),
  });

export function useDealsQuery(request: DealsRequest) {
  return useQuery({
    ...dealsQueryOptions(request),
    select: normaliseDeals,
    // A brand toggle keeps the last list on screen until the new one lands. A new gender or
    // category starts empty: the old deals would be the wrong ones.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === request.gender &&
      previousQuery.queryKey[2] === request.category
        ? previous
        : undefined,
  });
}
