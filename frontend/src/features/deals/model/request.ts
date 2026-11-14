import type { CategoryScope, Gender } from "./Deal";

// The ids already in shared links. The default is the backend's own order.
export const SORTS = [
  "discount-high-to-low",
  "discount-low-to-high",
  "price-low-to-high",
  "price-high-to-low",
] as const;
export type SortId = (typeof SORTS)[number];
export const DEFAULT_SORT: SortId = "discount-high-to-low";

/** The backend lists nothing under 30% off, so 30 asks for everything and is never sent. */
export const DEFAULT_DISCOUNT = 30;
/** Full rows at 2, 3, 4 and 5 columns. */
export const PAGE_SIZE = 60;

/** Everything one view asks the backend for. The URL state has exactly this shape. */
export type DealsRequest = {
  gender: Gender;
  category: CategoryScope;
  stores: readonly string[];
  brands: readonly string[];
  sizes: readonly string[];
  search: string;
  discount: number;
  sort: SortId;
};

/**
 * The /v2/deals query string for a request. Canonical (fixed parameter order, repeated values
 * sorted, defaults left out), so equal requests share one URL, one HTTP cache entry and one
 * query key.
 */
export function dealsQuery(request: DealsRequest): string {
  const params = new URLSearchParams({ gender: request.gender });
  if (request.category !== "All") params.set("category", request.category);
  for (const store of [...request.stores].sort()) params.append("store", store);
  for (const brand of [...request.brands].sort()) params.append("brand", brand);
  for (const size of [...request.sizes].sort()) params.append("size", size);
  const q = request.search.trim();
  if (q) params.set("q", q); // a blank q is a 400
  if (request.discount !== DEFAULT_DISCOUNT) params.set("minDiscount", String(request.discount));
  if (request.sort !== DEFAULT_SORT) params.set("sort", request.sort);
  params.set("limit", String(PAGE_SIZE));
  return params.toString();
}

/** True for a dealsQuery() string that no filter narrows: the view worth saving for next time. */
export function isUnfilteredQuery(query: string): boolean {
  return !/(?:^|&)(?:store|brand|size|q|minDiscount)=/.test(query);
}
