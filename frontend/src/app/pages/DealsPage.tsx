import { useEffect, useState } from "react";
import {
  DealGrid,
  DealGridSkeleton,
  EmptyState,
  ErrorState,
  type Facets,
  ResultsSummary,
  StaleBanner,
  useDealsQuery,
} from "@/features/deals";
import {
  ActiveFilterChips,
  FilterBar,
  type FilterState,
  activeChips,
  explainEmpty,
  useDealsRequest,
  useFilters,
} from "@/features/filters";

const WAKING_AFTER_MS = 3000;

/** The single orchestrator: the URL state is the request, and the backend's answer is the page. */
export function DealsPage() {
  const [values, actions] = useFilters();
  const request = useDealsRequest(values);
  const query = useDealsQuery(request);
  const result = query.data;
  // The result kept from the last request may be empty: that is not "no deals" for this one,
  // the answer just hasn't landed yet.
  const awaiting = query.isPlaceholderData && result?.deals.length === 0;
  const change = (next: Partial<FilterState>) => void actions.set(next);
  const clearAll = () => void actions.clearAll();
  const waking = useAfter(query.isPending, WAKING_AFTER_MS);
  const retry = () => void query.refetch();

  return (
    <>
      <h1 className="sr-only">Deals from JD Sports UK</h1>
      <FilterBar
        values={values}
        onChange={change}
        onClearAll={clearAll}
        facets={result?.facets}
        resultCount={query.isPlaceholderData ? undefined : result?.total}
        busy={!result}
      />
      <ActiveFilterChips
        values={values}
        onChange={change}
        onClearAll={clearAll}
        stores={result?.facets?.stores}
      />
      {result && query.isError && (
        <StaleBanner updatedAt={query.dataUpdatedAt} onRetry={retry} retrying={query.isFetching} />
      )}
      {result && !awaiting ? (
        <>
          <ResultsSummary
            total={result.total}
            updatedAt={query.isPlaceholderData ? undefined : query.dataUpdatedAt}
          />
          {result.deals.length > 0 ? (
            <DealGrid
              deals={result.deals}
              total={result.total}
              serverStart={result.trackingSince}
              // Not after a failure: the grid asks on every render, and the banner has Retry.
              hasMore={query.hasNextPage && !query.isPlaceholderData && !query.isError}
              loadingMore={query.isFetchingNextPage}
              // A refresh already under way finishes first; the grid asks again after it.
              onLoadMore={() => void query.fetchNextPage({ cancelRefetch: false })}
            />
          ) : (
            <NoDeals
              // The request, not the URL: while a search settles they differ, and these are its deals.
              values={request}
              facets={result.facets}
              onChange={change}
              onClearAll={clearAll}
            />
          )}
        </>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={retry} retrying={query.isFetching} />
      ) : (
        <div aria-busy="true">
          <output className="mb-3 block min-h-4 text-xs text-text-muted">
            {waking ? "Waking the server, this can take a minute." : "Loading deals…"}
          </output>
          <DealGridSkeleton />
        </div>
      )}
    </>
  );
}

type NoDealsProps = {
  values: FilterState;
  facets: Facets | undefined;
  onChange: (next: Partial<FilterState>) => void;
  onClearAll: () => void;
};

function NoDeals({ values, facets, onChange, onClearAll }: NoDealsProps) {
  if (activeChips(values).length === 0) {
    return (
      <EmptyState
        title="No deals right now"
        hint="Nothing in the sale is 30% off or more at the moment. The list refreshes every 5 minutes."
        actions={[]}
      />
    );
  }
  const { title, hint, suggestions } = explainEmpty(values, facets);
  return (
    <EmptyState
      title={title}
      hint={hint}
      actions={[
        ...suggestions.map((suggestion) => ({
          label: suggestion.label,
          onClick: () => onChange(suggestion.next),
        })),
        { label: "Clear all filters", onClick: onClearAll },
      ]}
    />
  );
}

/** True once `active` has stayed true for `ms`. */
function useAfter(active: boolean, ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, ms]);
  return active && elapsed;
}
