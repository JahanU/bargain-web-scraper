import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { ApiError } from "../api/ApiError";
import { fetchDeals } from "../api/dealsApi";
import { normaliseDeals } from "../api/normalise";
import { dealsKeys } from "../api/queryKeys";

const FIVE_MINUTES = 5 * 60_000;

/** The cache holds validated wire deals (plain JSON, so it persists); components get Deals. */
export const dealsQueryOptions = queryOptions({
  queryKey: dealsKeys.all,
  queryFn: ({ signal }) => fetchDeals(signal),
  staleTime: FIVE_MINUTES, // the backend scrapes every 5 minutes
  gcTime: 30 * 60_000,
  refetchInterval: FIVE_MINUTES, // only while the tab is visible
  refetchOnWindowFocus: true,
  placeholderData: keepPreviousData,
  // 503s are already retried inside fetchDeals; retry only network errors and 5xx here.
  retry: (failureCount, error) =>
    failureCount < 3 &&
    error instanceof ApiError &&
    (error.kind === "network" || (error.kind === "http" && (error.status ?? 0) >= 500)),
});

export function useDealsQuery() {
  return useQuery({ ...dealsQueryOptions, select: normaliseDeals });
}
