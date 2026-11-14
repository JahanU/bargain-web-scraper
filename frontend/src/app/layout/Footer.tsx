import { LastUpdated } from "@/features/deals";
import { useDealsRequest, useFilters } from "@/features/filters";

export function Footer() {
  const request = useDealsRequest(useFilters()[0]);
  return (
    <footer className="border-t border-border">
      <p className="page-container py-4 text-xs text-text-muted">
        <LastUpdated request={request} />
        Refreshes every 5 min · Prices from jdsports.co.uk
      </p>
    </footer>
  );
}
