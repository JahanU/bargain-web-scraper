import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Deal } from "../model/Deal";
import { DealCard } from "./DealCard";

const PRIORITY_COUNT = 10; // roughly the first two rows on any screen
const TOP_DEAL_KEY = "top-deal";

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
  // The deal in the top visible row. Pixels mean nothing once rows change, so this is what a
  // reload or a column change puts back. It starts as the one saved before a reload.
  const [top] = useState(() => ({ columns: 0, id: savedTopDeal() }));
  // The virtualizer is one mutable object, so the compiler leaves DealGrid unmemoised (as it
  // should); DealRow gets only plain values and the stable measureElement.
  // oxlint-disable-next-line react/incompatible-library -- intended, see above
  const virtualizer = useWindowVirtualizer({
    count: Math.ceil(deals.length / columns),
    estimateSize: () => (columns === 2 ? 350 : 410), // a card; real rows are measured
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
    // The virtualizer scrolls on mount, which cancels the browser's own restore; do it here.
    history.scrollRestoration = "manual";
    const save = () => {
      try {
        sessionStorage.setItem(TOP_DEAL_KEY, top.id ?? "");
      } catch {
        // storage blocked: a reload starts at the top
      }
    };
    window.addEventListener("pagehide", save);
    return () => {
      observer.disconnect();
      window.removeEventListener("pagehide", save);
    };
  }, [top]);

  // After every render: note the top deal, or, when the columns just changed (and on mount,
  // from 0), scroll its new row to the top. Row 0 is left alone so the page top stays put.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- no deps on purpose
  useLayoutEffect(() => {
    if (top.columns === columns) {
      top.id = deals[(virtualizer.range?.startIndex ?? 0) * columns]?.id;
      return;
    }
    top.columns = columns;
    const index = deals.findIndex((deal) => deal.id === top.id);
    if (index >= columns)
      virtualizer.scrollToIndex(Math.floor(index / columns), { align: "start" });
  });

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

/** The deal a reload (or back/forward) should return to; a fresh visit starts at the top. */
function savedTopDeal(): string | undefined {
  const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (navigation?.type !== "reload" && navigation?.type !== "back_forward") return undefined;
  try {
    return sessionStorage.getItem(TOP_DEAL_KEY) || undefined;
  } catch {
    return undefined; // storage blocked
  }
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
