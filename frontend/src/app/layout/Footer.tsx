import { useQueryState } from "nuqs";
import { LastUpdated } from "@/features/deals";
import { genderParser } from "@/features/filters";

export function Footer() {
  const [gender] = useQueryState("gender", genderParser);
  return (
    <footer className="border-t border-border">
      <p className="mx-auto max-w-[1440px] px-4 py-4 text-xs text-text-muted sm:px-6">
        <LastUpdated gender={gender} />
        Refreshes every 5 min · Prices from jdsports.co.uk
      </p>
    </footer>
  );
}
