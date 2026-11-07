import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Deal } from "../model/Deal";
import { DealCard } from "./DealCard";

const PRIORITY_COUNT = 10; // roughly the first two rows on any screen
const CARD_HEIGHT_ESTIMATE = 410; // real rows are measured

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
  const columns = useSyncExternalStore(subscribeToColumns, currentColumns);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // The virtualizer is one mutable object, so the compiler leaves DealGrid unmemoised (as it
  // should); DealRow gets only plain values and the stable measureElement.
  // oxlint-disable-next-line react/incompatible-library -- intended, see above
  const virtualizer = useWindowVirtualizer({
    count: Math.ceil(deals.length / columns),
    estimateSize: () => CARD_HEIGHT_ESTIMATE,
    gap: columns === 2 ? 24 : 32, // gap-y-6, and gap-y-8 from sm, where 3 columns start
    scrollMargin,
  });

  // Where the grid starts on the page. Content above it (filter chips, the stale banner, a font
  // swap) can change height, and any such change resizes the document, so watch that.
  useLayoutEffect(() => {
    const list = listRef.current!;
    const measure = () =>
      setScrollMargin(Math.round(list.getBoundingClientRect().top + window.scrollY));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={listRef}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- rows are <div>s, which a <ul> can't hold
      role="list"
      className="relative"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((row) => (
        <DealRow
          key={row.key}
          index={row.index}
          offset={row.start - scrollMargin}
          measureRef={virtualizer.measureElement}
          deals={deals}
          columns={columns}
          serverStart={serverStart}
        />
      ))}
    </div>
  );
}

type DealRowProps = {
  index: number;
  offset: number;
  measureRef: (element: HTMLDivElement | null) => void;
  deals: readonly Deal[];
  columns: number;
  serverStart: number;
};

/** Compiled (unlike DealGrid), so a scroll that only moves the window doesn't re-render cards. */
function DealRow({ index, offset, measureRef, deals, columns, serverStart }: DealRowProps) {
  const first = index * columns;
  return (
    <div
      ref={measureRef}
      data-index={index}
      className="absolute inset-x-0 top-0 grid gap-x-3 sm:gap-x-6"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        transform: `translateY(${offset}px)`,
      }}
    >
      {deals.slice(first, first + columns).map((deal, column) => (
        // Position and size, since most cards aren't in the DOM for a screen reader to count.
        <div
          key={deal.id}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see role="list"
          role="listitem"
          aria-posinset={first + column + 1}
          aria-setsize={deals.length}
        >
          <DealCard
            deal={deal}
            serverStart={serverStart}
            priority={first + column < PRIORITY_COUNT}
          />
        </div>
      ))}
    </div>
  );
}

// Created once and shared by subscribe and the snapshot, which runs on every render.
let columnQueries: { query: MediaQueryList; columns: number }[] | undefined;
function columnMediaQueries() {
  columnQueries ??= COLUMNS_AT.map(([media, columns]) => ({
    query: window.matchMedia(media),
    columns,
  }));
  return columnQueries;
}

function subscribeToColumns(onChange: () => void) {
  const queries = columnMediaQueries();
  for (const { query } of queries) query.addEventListener("change", onChange);
  return () => {
    for (const { query } of queries) query.removeEventListener("change", onChange);
  };
}

function currentColumns(): number {
  return columnMediaQueries().find(({ query }) => query.matches)?.columns ?? 2;
}
