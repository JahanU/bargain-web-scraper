import { useEffect, useState } from "react";
import {
  DealGridSkeleton,
  ErrorState,
  ResultsSummary,
  StaleBanner,
  useDealsQuery,
} from "@/features/deals";
import { gbp } from "@/shared/lib/format";

const WAKING_AFTER_MS = 3000;

/** The single orchestrator: the only place server state and URL state meet. */
export function DealsPage() {
  const query = useDealsQuery();
  const deals = query.data;
  const waking = useAfter(query.isPending, WAKING_AFTER_MS);
  const retry = () => void query.refetch();

  return (
    <>
      <h1 className="sr-only">Deals from JD Sports UK</h1>
      {deals && query.isError && (
        <StaleBanner updatedAt={query.dataUpdatedAt} onRetry={retry} retrying={query.isFetching} />
      )}
      {deals ? (
        <>
          <ResultsSummary
            shown={deals.length}
            total={deals.length}
            updatedAt={query.dataUpdatedAt}
          />
          {/* Plain list until the deal grid lands (phase 4). */}
          <ul className="space-y-1 text-sm">
            {deals.map((deal) => (
              <li key={deal.id}>
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener"
                  className="underline-offset-2 hover:underline"
                >
                  {deal.name}
                </a>{" "}
                <span className="font-bold">{gbp(deal.nowPrice)}</span>
              </li>
            ))}
          </ul>
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
