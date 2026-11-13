import { queryOptions, useQuery } from "@tanstack/react-query";
import { ApiError } from "../api/ApiError";
import { fetchDeals } from "../api/dealsApi";
import { normaliseDeals } from "../api/normalise";
import { dealsKeys } from "../api/queryKeys";
import type { Gender } from "../model/Deal";

const FIVE_MINUTES = 5 * 60_000;

/**
 * The cache holds validated wire deals (plain JSON, so it persists); components get Deals.
 * One entry per gender, so a late response for one tab can never land in another.
 */
export const dealsQueryOptions = (gender: Gender) =>
  queryOptions({
    queryKey: dealsKeys.gender(gender),
    queryFn: ({ signal }) => fetchDeals(gender, signal),
    staleTime: FIVE_MINUTES, // the backend scrapes every 5 minutes
    gcTime: 30 * 60_000,
    refetchInterval: FIVE_MINUTES, // only while the tab is visible
    refetchOnWindowFocus: true,
    // 503s are already retried inside fetchDeals; retry only network errors and 5xx here.
    retry: (failureCount, error) =>
      failureCount < 3 &&
      error instanceof ApiError &&
      (error.kind === "network" || (error.kind === "http" && (error.status ?? 0) >= 500)),
  });

export function useDealsQuery(gender: Gender) {
  return useQuery({ ...dealsQueryOptions(gender), select: normaliseDeals });
}
