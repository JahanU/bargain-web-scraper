export { ActiveFilterChips } from "./components/ActiveFilterChips";
export { FilterBar } from "./components/FilterBar";
export { useFilteredDeals } from "./hooks/useFilteredDeals";
export { useFilters } from "./hooks/useFilters";
export { type FilterState, applyFilters } from "./model/applyFilters";
export { type EmptyExplanation, explainEmpty } from "./model/explainEmpty";
export {
  type ActiveChip,
  activeChips,
  DEFAULT_DISCOUNT,
  DISCOUNT_STOPS,
  discountCounts,
  type FilterKey,
  type FilterValues,
  SEARCH_MAX_LENGTH,
} from "./model/registry";
export { DEFAULT_SORT, SORTS, type SortId } from "./model/sort";
