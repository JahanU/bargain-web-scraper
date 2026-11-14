import { SlidersHorizontal } from "lucide-react";
import { Suspense, lazy, useRef, useState } from "react";
import type { Facets } from "@/features/deals";
import { Button } from "@/shared/ui";
import { activeChips, type FilterState } from "../model/registry";
import { CategoryControl } from "./CategoryControl";
import { ChipFacetPopover } from "./ChipFacet";
import { DiscountControl } from "./DiscountControl";
import { brandOptions, storeOptions } from "./facetOptions";
import { GenderControl } from "./GenderControl";
import { SearchField } from "./SearchField";
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
 * Sticky toolbar. Wide screens: gender, category, search and sort in a row, then discount, stores
 * (when there is more than one), brands and sizes; below lg search and sort wrap to a row of their own. Phones: gender, category, search, then a
 * Filters button (opening a sheet with everything else) next to sort.
 */
export function FilterBar(props: FilterBarProps) {
  const { values, onChange, facets, busy } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const stores = storeOptions(facets);
  const filtersButton = useRef<HTMLButtonElement>(null);
  // Search sits outside the sheet, so it isn't counted on the button.
  const sheetFilters = activeChips(values).filter((chip) => chip.filter !== "search").length;

  return (
    <div className="sticky top-header z-20 border-b border-border bg-surface-raised py-2">
      <form
        className="page-container"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- <search> needs Safari 17; the floor is 16.4
        role="search"
        aria-label="Filter deals"
        aria-busy={busy || undefined}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-wrap items-center gap-2 lg:gap-x-4">
          <GenderControl
            value={values.gender}
            onChange={(gender) => onChange({ gender })}
            className="w-full sm:w-auto"
          />
          <CategoryControl
            value={values.category}
            onChange={(category) => onChange({ category })}
            className="w-full sm:w-auto"
          />
          <SearchField
            value={values.search}
            onChange={(search) => onChange({ search })}
            className="w-full sm:w-auto sm:min-w-48 sm:flex-1 lg:w-80 lg:flex-none"
          />
          <Button
            ref={filtersButton}
            className="flex-1 sm:hidden"
            onPointerDown={() => void loadSheet()}
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal size={16} aria-hidden />
            Filters{sheetFilters > 0 && ` (${sheetFilters})`}
          </Button>
          <SortSelect
            value={values.sort}
            onChange={(sort) => onChange({ sort })}
            className="flex-1 sm:ml-auto sm:flex-none"
          />
          <div className="hidden w-full flex-wrap items-center gap-2 sm:flex">
            <span className={toolbarLabel} aria-hidden>
              Discount ≥
            </span>
            <DiscountControl
              value={values.discount}
              onChange={(discount) => onChange({ discount })}
              stops={facets?.discounts}
              name="discount-toolbar"
            />
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
