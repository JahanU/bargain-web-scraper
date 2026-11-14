import { parseAsStringLiteral } from "nuqs";
import { DEFAULT_SORT, SORTS, type SortId } from "@/features/deals";

export const SORT_LABELS: Record<SortId, string> = {
  "discount-high-to-low": "Best discount",
  "discount-low-to-high": "Smallest discount",
  "price-low-to-high": "Lowest price",
  "price-high-to-low": "Highest price",
};

export const sortParser = parseAsStringLiteral(SORTS).withDefault(DEFAULT_SORT);
