import { LastUpdated } from "@/features/deals";
import { useFilters } from "@/features/filters";

export function Footer() {
  const [{ gender, category, store, brands }] = useFilters();
  return (
    <footer className="border-t border-border">
      <p className="mx-auto max-w-[1440px] px-4 py-4 text-xs text-text-muted sm:px-6">
        <LastUpdated request={{ gender, category, store, brands }} />
        Refreshes every 5 min · Prices from jdsports.co.uk, size.co.uk and endclothing.com
      </p>
    </footer>
  );
}
