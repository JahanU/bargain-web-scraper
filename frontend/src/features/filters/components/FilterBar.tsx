import { SlidersHorizontal } from "lucide-react";
import { Suspense, lazy, useRef, useState } from "react";
import type { Facets } from "@/features/deals";
import { Button } from "@/shared/ui";
import { activeChips, type FilterState } from "../model/registry";
import { CategoryControl } from "./CategoryControl";
import { ChipFacetPopover } from "./ChipFacet";
import { DiscountControl } from "./DiscountControl";
import { brandOptions, storeOptions } from "./facetOptions";
import { SizePopover } from "./SizeFacet";
import { SortSelect } from "./SortSelect";
import { toolbarLabel } from "./toolbarLabel";

const loadSheet = () => import("./FilterSheet");
const FilterSheet = lazy(loadSheet);

export type FilterBarProps = {
  values: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClearAll: () => void;
  /** What each control's options would show, from the backend; undefined until deals load. */
  facets: Facets | undefined;
  /** Deals the current filters match; undefined until that is known. */
  resultCount: number | undefined;
  /** Deals haven't loaded yet. */
  busy: boolean;
};

/**
 * The sticky toolbar, one row of same-height controls: category, minimum discount, stores (when
 * there is more than one), brands and sizes, with sort at the far end; narrower screens wrap it
 * group by group. Phones: only category shows; Filters (a sheet with everything else) and sort
 * float in a dock at the bottom, where a thumb reaches. Gender and search live in the header.
 */
export function FilterBar(props: FilterBarProps) {
  const { values, onChange, facets, busy } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const stores = storeOptions(facets);
  const filtersButton = useRef<HTMLButtonElement>(null);
  // Search sits outside the sheet, so it isn't counted on the button.
  const sheetFilters = activeChips(values).filter((chip) => chip.filter !== "search").length;

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-surface-raised py-2">
      <form
        className="page-container flex flex-wrap items-center gap-x-4 gap-y-2"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- <search> needs Safari 17; the floor is 16.4
        role="search"
        aria-label="Filter deals"
        aria-busy={busy || undefined}
        onSubmit={(event) => event.preventDefault()}
      >
        <CategoryControl
          value={values.category}
          onChange={(category) => onChange({ category })}
          className="w-full sm:w-auto"
        />
        <div className="hidden items-center gap-2 sm:flex">
          <span className={toolbarLabel} aria-hidden>
            Discount ≥
          </span>
          <DiscountControl
            value={values.discount}
            onChange={(discount) => onChange({ discount })}
            stops={facets?.discounts}
            name="discount-toolbar"
          />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {stores && (
            <ChipFacetPopover
              noun="store"
              selected={values.stores}
              onChange={(next) => onChange({ stores: next })}
              options={stores}
            />
          )}
          <ChipFacetPopover
            noun="brand"
            selected={values.brands}
            onChange={(brands) => onChange({ brands })}
            options={brandOptions(facets)}
          />
          <SizePopover
            selected={values.sizes}
            onChange={(sizes) => onChange({ sizes })}
            counts={facets?.sizes}
          />
        </div>
        <div className="contents max-sm:fixed max-sm:bottom-[max(1rem,env(safe-area-inset-bottom))] max-sm:left-1/2 max-sm:flex max-sm:-translate-x-1/2 max-sm:items-center max-sm:rounded-full max-sm:bg-text max-sm:p-1 max-sm:text-surface max-sm:shadow-lg">
          <Button
            ref={filtersButton}
            tone="ghost"
            className="max-sm:rounded-full max-sm:text-inherit max-sm:hover:bg-transparent sm:hidden"
            onPointerDown={() => void loadSheet()}
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal size={16} aria-hidden />
            Filters{sheetFilters > 0 && ` (${sheetFilters})`}
          </Button>
          <span aria-hidden className="h-5 w-px bg-surface opacity-30 sm:hidden" />
          <SortSelect
            value={values.sort}
            onChange={(sort) => onChange({ sort })}
            className="max-sm:[&_select]:w-auto max-sm:[&_select]:rounded-full max-sm:[&_select]:border-transparent max-sm:[&_select]:bg-transparent max-sm:[&_select]:font-semibold max-sm:[&_svg]:text-inherit sm:ml-auto"
          />
        </div>
      </form>
      {sheetOpen && (
        <Suspense fallback={null}>
          <FilterSheet
            {...props}
            onClose={() => {
              setSheetOpen(false);
              filtersButton.current?.focus();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
