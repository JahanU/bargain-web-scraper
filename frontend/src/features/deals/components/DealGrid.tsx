import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/shared/lib/cn";
import type { Deal } from "../model/Deal";
import { DealCard } from "./DealCard";

const PRIORITY_COUNT = 10; // roughly the first two rows on any screen
const ROW_HEIGHT_ESTIMATE = 440; // a card plus the row gap; real rows are measured

// Tailwind's sm, lg and xl breakpoints (see GRID_SIZES in DealImage), widest first.
const COLUMNS_AT = [
  ["(min-width: 80rem)", 5],
  ["(min-width: 64rem)", 4],
  ["(min-width: 40rem)", 3],
] as const;

type DealGridProps = {
  deals: readonly Deal[];
  /** From the full list, not the filtered one: see serverStartOf. */
  serverStart: number;
};

/**
 * Only the rows near the viewport are in the DOM, so the page costs the same at 80 deals or
 * 8,000. The window scrolls (not an inner box), so the header, filters and footer are unchanged.
 */
export function DealGrid({ deals, serverStart }: DealGridProps) {
  "use no memo"; // the virtualizer is one mutable object; the compiler would cache its output
  const columns = useSyncExternalStore(subscribeToColumns, currentColumns);
  const rowCount = Math.ceil(deals.length / columns);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    scrollMargin,
  });

  // Where the grid starts on the page. What sits above it (filter chips, the stale banner) can
  // change height, so this re-reads after every render; an unchanged value doesn't re-render.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- no deps on purpose, see above
  useLayoutEffect(() => {
    if (listRef.current)
      setScrollMargin(listRef.current.getBoundingClientRect().top + window.scrollY);
  });

  return (
    <div
      ref={listRef}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- rows are <div>s, which a <ul> can't hold
      role="list"
      className="relative"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((row) => {
        const first = row.index * columns;
        return (
          <div
            key={row.key}
            ref={virtualizer.measureElement}
            data-index={row.index}
            className={cn(
              "absolute inset-x-0 top-0 grid gap-x-3 sm:gap-x-6",
              row.index < rowCount - 1 && "pb-6 sm:pb-8",
            )}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              transform: `translateY(${row.start - scrollMargin}px)`,
            }}
          >
            {deals.slice(first, first + columns).map((deal, offset) => (
              // Position and size, since most cards aren't in the DOM for a screen reader to count.
              <div
                key={deal.id}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see role="list"
                role="listitem"
                aria-posinset={first + offset + 1}
                aria-setsize={deals.length}
              >
                <DealCard
                  deal={deal}
                  serverStart={serverStart}
                  priority={first + offset < PRIORITY_COUNT}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function subscribeToColumns(onChange: () => void) {
  const queries = COLUMNS_AT.map(([query]) => window.matchMedia(query));
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

function currentColumns(): number {
  return COLUMNS_AT.find(([query]) => window.matchMedia(query).matches)?.[1] ?? 2;
}
