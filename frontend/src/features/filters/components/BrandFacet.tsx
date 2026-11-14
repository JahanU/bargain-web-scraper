import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { BrandCount } from "@/features/deals";
import { Button, Popover, ToggleGroup } from "@/shared/ui";
import { facetCount } from "./toolbarLabel";

const TOP_BRANDS = 10;

type BrandFacetProps = {
  selected: readonly string[];
  onChange: (brands: string[]) => void;
  /** From /v1/brands, biggest first; undefined while they load or if they failed. */
  counts: readonly BrandCount[] | undefined;
};

/**
 * Brand toggles with the backend's counts: the ten biggest plus any selected, the rest behind
 * "Show all". OR within brands. A selected brand with no deals still shows (at 0) so it can be
 * turned off; without counts only the selected brands show.
 */
export function BrandOptions({ selected, onChange, counts }: BrandFacetProps) {
  const [expanded, setExpanded] = useState(false);
  const brands = [
    ...(counts ?? []),
    ...selected
      .filter((brand) => !counts?.some((item) => item.brand === brand))
      .map((brand) => ({ brand, count: 0 })),
  ];
  const shown = expanded
    ? brands
    : brands.filter(({ brand }, index) => index < TOP_BRANDS || selected.includes(brand));

  return (
    <div className="space-y-3">
      {shown.length > 0 && (
        <ToggleGroup
          label="Brands"
          items={shown.map(({ brand, count }) =>
            counts
              ? {
                  value: brand,
                  name: `${brand}, ${count} ${count === 1 ? "deal" : "deals"}`,
                  label: (
                    <>
                      {brand} <span className={facetCount}>{count}</span>
                    </>
                  ),
                }
              : { value: brand, label: brand },
          )}
          value={selected}
          onValueChange={onChange}
        />
      )}
      {!counts ? (
        <p className="text-sm text-text-muted">The brand list isn’t available yet.</p>
      ) : brands.length === 0 ? (
        <p className="text-sm text-text-muted">No brands for these deals.</p>
      ) : null}
      {brands.length > TOP_BRANDS && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="flex h-11 items-center text-sm font-semibold underline underline-offset-2 sm:h-8"
        >
          {expanded ? "Show fewer brands" : `Show all ${brands.length} brands`}
        </button>
      )}
    </div>
  );
}

/** On wide screens the options sit in a popover behind a "Brands" button. */
export function BrandPopover(props: BrandFacetProps) {
  const count = props.selected.length;
  return (
    <Popover
      title="Filter by brand"
      trigger={
        <Button tone="secondary">
          Brands
          {count > 0 && <span className="text-accent"> · {count}</span>}
          <ChevronDown size={16} aria-hidden />
        </Button>
      }
    >
      <div className="w-[min(22rem,calc(100vw-3rem))]">
        <BrandOptions {...props} />
      </div>
    </Popover>
  );
}
