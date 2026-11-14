import type { Deal } from "../model/Deal";
import { buildImage } from "../model/image";
import { sortSizes } from "../model/sizes";
import type { Facets, WireDeal, WirePage } from "./dealSchema";

export function normaliseDeal(wire: WireDeal): Deal {
  return {
    id: wire.url,
    url: wire.url,
    name: wire.name,
    brand: wire.brand,
    store: wire.store,
    nowPrice: wire.nowPrice,
    wasPrice: wire.wasPrice,
    discount: wire.discount,
    image: wire.imageUrl ? buildImage(wire.imageUrl) : undefined,
    sizes: sortSizes(wire.sizes ?? []),
    foundAt: wire.timestamp,
    gender: wire.gender,
    category: wire.category,
  };
}

/** What the page shows for one request: every loaded deal, and the first page's facts. */
export type DealsResult = {
  deals: Deal[];
  /** Matches across all pages, loaded or not. */
  total: number;
  trackingSince: number;
  facets: Facets | undefined;
};

export function normalisePages({ pages }: { pages: readonly WirePage[] }): DealsResult {
  const first = pages[0]!; // a loaded query has at least its first page
  // A deal whose price changed between two page fetches can come back on the later page.
  const seen = new Set<string>();
  const deals: Deal[] = [];
  for (const page of pages) {
    for (const wire of page.items) {
      if (seen.has(wire.url)) continue;
      seen.add(wire.url);
      deals.push(normaliseDeal(wire));
    }
  }
  return { deals, total: first.total, trackingSince: first.trackingSince, facets: first.facets };
}
