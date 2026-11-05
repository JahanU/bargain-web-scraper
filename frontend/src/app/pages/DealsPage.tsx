import { useEffect, useState } from "react";
import {
  type Deal,
  DealGrid,
  DealGridSkeleton,
  EmptyState,
  ErrorState,
  ResultsSummary,
  StaleBanner,
  serverStartOf,
  useDealsQuery,
} from "@/features/deals";
import { type FilterState, explainEmpty, useFilteredDeals, useFilters } from "@/features/filters";

const WAKING_AFTER_MS = 3000;

/** The single orchestrator: the only place server state and URL state meet. */
export function DealsPage() {
  const query = useDealsQuery();
  const deals = query.data;
  const [values, actions] = useFilters();
  const { visible } = useFilteredDeals(deals, values);
  const waking = useAfter(query.isPending, WAKING_AFTER_MS);
  const retry = () => void query.refetch();

  return (
    <>
      <h1 className="sr-only">Deals from JD Sports UK</h1>
      {deals && query.isError && (
        <StaleBanner updatedAt={query.dataUpdatedAt} onRetry={retry} retrying={query.isFetching} />
      )}
      {deals && visible ? (
        <>
          <ResultsSummary
            shown={visible.length}
            total={deals.length}
            updatedAt={query.dataUpdatedAt}
          />
          {visible.length > 0 ? (
            <DealGrid deals={visible} serverStart={serverStartOf(deals)} />
          ) : (
            <NoDeals
              deals={deals}
              values={values}
              onChange={(next) => void actions.set(next)}
              onClearAll={() => void actions.clearAll()}
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
  deals: readonly Deal[];
  values: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClearAll: () => void;
};

function NoDeals({ deals, values, onChange, onClearAll }: NoDealsProps) {
  if (deals.length === 0) {
    return (
      <EmptyState
        title="No deals right now"
        hint="Nothing in the sale is 30% off or more at the moment. The list refreshes every 5 minutes."
        actions={[]}
      />
    );
  }
  const { title, hint, suggestions } = explainEmpty(deals, values);
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
