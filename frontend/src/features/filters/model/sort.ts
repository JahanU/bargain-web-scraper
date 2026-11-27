import { parseAsStringLiteral } from "nuqs";
import { DEFAULT_SORT, SORTS, type SortId } from "@/features/deals";

export const SORT_LABELS: Record<SortId, string> = {
  "discount-high-to-low": "Best discount",
  "price-low-to-high": "Lowest price",
  "price-high-to-low": "Highest price",
  "found-new-to-old": "Newest found",
  "found-old-to-new": "Oldest found",
};

export const sortParser = parseAsStringLiteral(SORTS).withDefault(DEFAULT_SORT);
