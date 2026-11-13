import { SlidersHorizontal } from "lucide-react";
import { Suspense, lazy, useRef, useState } from "react";
import type { SizeFacet as Facet, SizeGroup } from "@/features/deals";
import { Button } from "@/shared/ui";
import type { FilterState } from "../model/applyFilters";
import { activeChips } from "../model/registry";
import { DiscountControl } from "./DiscountControl";
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
  sizeFacets: Record<SizeGroup, Facet[]>;
  discountCounts: Record<number, number> | undefined;
  /** Deals the current filters show; undefined while loading. */
  resultCount: number | undefined;
  /** Deals haven't loaded yet. */
  busy: boolean;
};

/**
 * Sticky toolbar. Wide screens: gender, search, discount, sizes and sort in a row; below lg gender
 * sits on its own row above them. Phones: gender, then search, then a Filters button (opening a
 * sheet with everything else) next to sort.
 */
export function FilterBar(props: FilterBarProps) {
  const { values, onChange, sizeFacets, discountCounts, busy } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const filtersButton = useRef<HTMLButtonElement>(null);
  // Search sits outside the sheet, so it isn't counted on the button.
  const sheetFilters = activeChips(values).filter((chip) => chip.filter !== "search").length;

  return (
    <div className="sticky top-12 z-20 -mx-4 -mt-4 mb-3 border-b border-border bg-surface-raised px-4 py-2 sm:top-[52px] sm:-mx-6 sm:px-6">
      <form
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- <search> needs Safari 17; the floor is 16.4
        role="search"
        aria-label="Filter deals"
        aria-busy={busy || undefined}
        onSubmit={(event) => event.preventDefault()}
      >
        {/* Below lg the filters row is already full, so gender gets its own row. */}
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-4">
          <GenderControl
            value={values.gender}
            onChange={(gender) => onChange({ gender })}
            className="w-full shrink-0 sm:w-auto"
          />
          <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-4 lg:w-auto lg:flex-1">
            <SearchField
              value={values.search}
              onChange={(search) => onChange({ search })}
              className="w-full sm:w-64 lg:w-80"
            />
            <div className="hidden items-center gap-2 sm:flex">
              <span className={toolbarLabel} aria-hidden>
                Discount ≥
              </span>
              <DiscountControl
                value={values.discount}
                onChange={(discount) => onChange({ discount })}
                counts={discountCounts}
                name="discount-toolbar"
                className="grid-cols-10"
              />
            </div>
            <div className="hidden sm:block">
              <SizePopover
                selected={values.sizes}
                onChange={(sizes) => onChange({ sizes })}
                facets={sizeFacets}
              />
            </div>
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
