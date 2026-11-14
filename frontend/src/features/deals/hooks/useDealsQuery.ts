import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "../api/ApiError";
import { fetchDealsPage } from "../api/dealsApi";
import { normalisePages } from "../api/normalise";
import { dealsKeys } from "../api/queryKeys";
import type { DealsRequest } from "../model/request";

const FIVE_MINUTES = 5 * 60_000;

/**
 * The cache holds validated wire pages (plain JSON, so it persists); components get Deals.
 * One entry per request, so a late response for one view can never land in another, and a
 * superseded request is aborted through the query's signal.
 */
export const dealsQueryOptions = (request: DealsRequest) =>
  infiniteQueryOptions({
    queryKey: dealsKeys.list(request),
    queryFn: ({ pageParam, signal }) => fetchDealsPage(request, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: FIVE_MINUTES, // the backend scrapes every 5 minutes
    gcTime: 30 * 60_000,
    refetchInterval: FIVE_MINUTES, // only while the tab is visible
    refetchOnWindowFocus: true,
    // 503s are already retried inside the fetch; retry only network errors and 5xx here.
    retry: (failureCount, error) =>
      failureCount < 3 &&
      error instanceof ApiError &&
      (error.kind === "network" || (error.kind === "http" && (error.status ?? 0) >= 500)),
  });

export function useDealsQuery(request: DealsRequest) {
  return useInfiniteQuery({
    ...dealsQueryOptions(request),
    select: normalisePages,
    // A changed request keeps the last result on screen until its own lands. A new gender starts
    // empty: the old deals would be the wrong ones.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === request.gender ? previous : undefined,
  });
}
