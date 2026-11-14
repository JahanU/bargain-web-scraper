import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Facets } from "../api/dealSchema";
import type { Deal } from "../model/Deal";
import { PAGE_SIZE } from "../model/request";
import { DealCard } from "./DealCard";

const PRIORITY_COUNT = 10; // roughly the first two rows on any screen
const TOP_DEAL_KEY = "top-deal";
const LOAD_AHEAD_ROWS = 3; // ask for the next page this many rows before the last one shows
const RESTORE_LIMIT = 10 * PAGE_SIZE; // a reload fetches at most this far to find its deal

// The virtualizer scrolls on mount, which cancels the browser's own scroll restore (and restored
// pixels would point at other deals anyway), so DealGrid restores by deal: see savedTopDeal.
history.scrollRestoration = "manual";

// Tailwind's sm, lg and xl breakpoints (see GRID_SIZES in DealImage), widest first.
const COLUMNS_AT = [
  ["(min-width: 80rem)", 5],
  ["(min-width: 64rem)", 4],
  ["(min-width: 40rem)", 3],
] as const;

type DealGridProps = {
  /** The pages loaded so far. */
  deals: readonly Deal[];
  /** Deals the request matches, loaded or not. */
  total: number;
  /** Names the store on each card; until it arrives a card shows the store's id. */
  stores?: Facets["stores"];
  /** The response's `trackingSince`: see foundTime. */
  serverStart: number;
  /** More pages exist and may be asked for now. */
  hasMore: boolean;
  loadingMore: boolean;
  /** Asks for the next page. Called again while it is still wanted, so it must not restart a fetch. */
  onLoadMore: () => void;
};

/**
 * Only the rows near the viewport are in the DOM and only the pages scrolled to are loaded, so the
 * page costs the same at 80 deals or 80,000. The window scrolls (not an inner box), so the header,
 * filters and footer are unchanged.
 */
export function DealGrid({
  deals,
  total,
  stores,
  serverStart,
  hasMore,
  loadingMore,
  onLoadMore,
}: DealGridProps) {
  const columns = useSyncExternalStore(subscribeToColumns, currentColumns);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // The deal in the top visible row. Pixels mean nothing once rows change, so this is what a
  // reload or a column change puts back. It starts as the one saved before a reload, with how
  // many deals were loaded then: the saved one may sit pages below the first.
  const [top] = useState(() => ({ columns: 0, ...savedTopDeal() }));
  const rows = Math.ceil(deals.length / columns);
  // The virtualizer is one mutable object, so the compiler leaves DealGrid unmemoised (as it
  // should); DealRow gets only plain values and the stable measureElement.
  // oxlint-disable-next-line react/incompatible-library -- intended, see above
  const virtualizer = useWindowVirtualizer({
    count: rows,
    // Row heights are cached by key; a row of another column count is a different row.
    getItemKey: useCallback((index: number) => `${columns}:${index}`, [columns]),
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
    const save = () => {
      try {
        sessionStorage.setItem(TOP_DEAL_KEY, JSON.stringify({ id: top.id, loaded: top.loaded }));
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
      top.loaded = deals.length;
    } else {
      const index = deals.findIndex((deal) => deal.id === top.id);
      // Not loaded yet: fetch as far as the reload had, then give up and stay at the top.
      const within = Math.min(top.loaded, RESTORE_LIMIT);
      if (index === -1 && top.id !== undefined && hasMore && deals.length < within) {
        onLoadMore();
        return;
      }
      top.columns = columns;
      if (index >= columns)
        virtualizer.scrollToIndex(Math.floor(index / columns), { align: "start" });
    }
    if (hasMore && (virtualizer.range?.endIndex ?? 0) >= rows - 1 - LOAD_AHEAD_ROWS) onLoadMore();
  });

  return (
    <>
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
            total={total}
            columns={columns}
            stores={stores}
            serverStart={serverStart}
          />
        ))}
      </div>
      {hasMore && (
        // Always there while more can load, so its text changing is what gets announced.
        <output className="flex h-12 items-center justify-center text-xs text-text-muted">
          {loadingMore && "Loading more deals…"}
        </output>
      )}
    </>
  );
}

type DealRowProps = {
  index: number;
  offset: number;
  measureRef: (element: HTMLDivElement | null) => void;
  deals: readonly Deal[];
  total: number;
  columns: number;
  stores: Facets["stores"] | undefined;
  serverStart: number;
};

/** Compiled (unlike DealGrid), so a scroll that only moves the window doesn't re-render cards. */
function DealRow({
  index,
  offset,
  measureRef,
  deals,
  total,
  columns,
  stores,
  serverStart,
}: DealRowProps) {
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
          aria-setsize={total}
        >
          <DealCard
            deal={deal}
            store={stores?.find((row) => row.store === deal.store)?.name ?? deal.store}
            serverStart={serverStart}
            priority={first + column < PRIORITY_COUNT}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The deal a reload (or back/forward) should return to, and how many deals were loaded with it; a
 * fresh visit starts at the top. Read once: a grid that mounts again later (after an empty
 * result, say) must not jump back to it.
 */
function savedTopDeal(): { id: string | undefined; loaded: number } {
  const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  try {
    const saved = sessionStorage.getItem(TOP_DEAL_KEY);
    sessionStorage.removeItem(TOP_DEAL_KEY); // on a fresh visit too, so it can't go stale
    if (saved && (navigation?.type === "reload" || navigation?.type === "back_forward")) {
      const { id, loaded } = JSON.parse(saved) as { id?: unknown; loaded?: unknown };
      if (typeof id === "string" && typeof loaded === "number") return { id, loaded };
    }
  } catch {
    // storage blocked, or not what save() wrote: start at the top
  }
  return { id: undefined, loaded: 0 };
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
