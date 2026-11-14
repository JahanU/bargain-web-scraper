import { LastUpdated } from "@/features/deals";
import { useDealsRequest, useFilters } from "@/features/filters";

export function Footer() {
  const request = useDealsRequest(useFilters()[0]);
  return (
    <footer className="border-t border-border">
      <p className="mx-auto max-w-[1440px] px-4 py-4 text-xs text-text-muted sm:px-6">
        <LastUpdated request={request} />
        Refreshes every 5 min · Prices from jdsports.co.uk, size.co.uk and endclothing.com
      </p>
    </footer>
  );
}
