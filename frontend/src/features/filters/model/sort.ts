import { parseAsStringLiteral } from "nuqs";
import type { Deal } from "@/features/deals";

// The ids already in shared links. The default matches the backend's own order.
export const SORTS = [
  "discount-high-to-low",
  "discount-low-to-high",
  "price-low-to-high",
  "price-high-to-low",
] as const;
export type SortId = (typeof SORTS)[number];
export const DEFAULT_SORT: SortId = "discount-high-to-low";

export const sortParser = parseAsStringLiteral(SORTS).withDefault(DEFAULT_SORT);

// Each sort breaks its own ties with the other key; equal deals keep their incoming order.
const COMPARATORS: Record<SortId, (a: Deal, b: Deal) => number> = {
  "discount-high-to-low": (a, b) => b.discount - a.discount || a.nowPrice - b.nowPrice,
  "discount-low-to-high": (a, b) => a.discount - b.discount || a.nowPrice - b.nowPrice,
  "price-low-to-high": (a, b) => a.nowPrice - b.nowPrice || b.discount - a.discount,
  "price-high-to-low": (a, b) => b.nowPrice - a.nowPrice || b.discount - a.discount,
};

export function compareDeals(sort: SortId): (a: Deal, b: Deal) => number {
  return COMPARATORS[sort];
}
