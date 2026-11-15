import { Search, SlidersHorizontal } from "lucide-react";
import { type ReactNode, Suspense, lazy, useRef, useState, useSyncExternalStore } from "react";
import type { Facets } from "@/features/deals";
import { cn } from "@/shared/lib/cn";
import { Button, IconButton } from "@/shared/ui";
import { activeChips, type FilterState } from "../model/registry";
import { CategoryControl } from "./CategoryControl";
import { FilterPanel } from "./FilterPanel";
import { GenderControl } from "./GenderControl";
import { SearchField } from "./SearchField";

const loadSheet = () => import("./FilterSheet");
const FilterSheet = lazy(loadSheet);

// Tailwind's lg: from here the filters are a sidebar; below it, a bottom sheet.
const WIDE = "(min-width: 64rem)";
const subscribeToWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isWide = () => window.matchMedia(WIDE).matches;

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
 * The filters and the page they filter. A slim sticky bar holds the Filters button. On wide
 * screens it shows or hides a sidebar of every filter (sort included) beside `children` (the
 * deals); on small ones it opens the same filters in a bottom sheet, and on phones the button is
 * docked at the bottom of the screen, in reach of a thumb. Search sits in the bar too.
 */
export function FilterBar({ children, ...props }: FilterBarProps & { children: ReactNode }) {
  const { values, onChange, busy } = props;
  const wide = useSyncExternalStore(subscribeToWide, isWide);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtersButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  // Search has its own field in the bar, so it isn't counted on the button.
  const active = activeChips(values).filter((chip) => chip.filter !== "search").length;

  return (
    <>
      {/* Phones: only search is left up here, and it scrolls away with the header. */}
      <div className="sticky top-0 z-20 border-b border-border bg-surface-raised max-sm:static">
        {/* xl: Filters is as wide as the sidebar under it, so the next control starts where the deals do. */}
        <div className="page-container flex items-center gap-2 py-2">
          {/* The footer's bottom padding keeps the last line clear of the docked bar. */}
          <div className="contents max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-20 max-sm:flex max-sm:gap-2 max-sm:border-t max-sm:border-border max-sm:bg-surface-raised max-sm:px-4 max-sm:pt-2 max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Button
              ref={filtersButton}
              aria-expanded={wide ? panelOpen : undefined}
              // Wide: a toggle, filled only while the sidebar is open. Narrow: it opens the sheet,
              // so it is always the filled, primary action.
              className="flex-1 max-lg:border-text max-lg:bg-text max-lg:text-surface sm:w-40 sm:flex-none xl:mr-6 xl:w-72 lg:aria-expanded:border-text lg:aria-expanded:bg-text lg:aria-expanded:text-surface"
              onPointerDown={() => void loadSheet()}
              onClick={() => (wide ? setPanelOpen(!panelOpen) : setSheetOpen(true))}
            >
              <SlidersHorizontal size={16} aria-hidden />
              Filters{active > 0 && ` (${active})`}
            </Button>
            {/* Search has scrolled away with the header: this brings it back. */}
            <IconButton
              label="Search"
              tone="secondary"
              icon={<Search size={16} aria-hidden />}
              className="sm:hidden"
              onClick={() => {
                // Focused inside the tap, or iOS keeps the keyboard down.
                searchInput.current?.focus({ preventScroll: true });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
          {/* Wide screens have room for these beside Filters; smaller ones keep them in the sheet. */}
          {wide && (
            <>
              <GenderControl value={values.gender} onChange={(gender) => onChange({ gender })} />
              <CategoryControl
                value={values.category}
                onChange={(category) => onChange({ category })}
              />
            </>
          )}
          <SearchField
            ref={searchInput}
            value={values.search}
            onChange={(search) => onChange({ search })}
            className="max-sm:w-full sm:ml-auto sm:w-72 xl:w-96"
          />
        </div>
      </div>
      <div
        className={cn(
          "page-container grid transition-[grid-template-columns] duration-slow ease-out",
          panelOpen ? "lg:grid-cols-[20rem_minmax(0,1fr)]" : "lg:grid-cols-[0rem_minmax(0,1fr)]",
        )}
      >
        {/* Clipped, not hidden: `overflow: hidden` would stop the form inside from sticking. */}
        <aside
          inert={!panelOpen}
          className={cn(
            "overflow-x-clip transition-opacity duration-slow max-lg:hidden",
            !panelOpen && "opacity-0",
          )}
        >
          <form
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- <search> needs Safari 17; the floor is 16.4
            role="search"
            aria-label="Filter deals"
            aria-busy={busy || undefined}
            onSubmit={(event) => event.preventDefault()}
            // Its own width, so nothing reflows while the column opens and closes.
            className="sticky top-14 max-h-[calc(100dvh-3.5rem)] w-80 overflow-y-auto pr-8 pb-8"
          >
            <FilterPanel {...props} inBar={wide} />
          </form>
        </aside>
        <div className="@container min-w-0 py-3">{children}</div>
      </div>
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
    </>
  );
}
