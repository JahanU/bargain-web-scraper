export { ApiError } from "./api/ApiError";
export type { Facets, WireDeal } from "./api/dealSchema";
export { dealsKeys } from "./api/queryKeys";
export { DealGrid } from "./components/DealGrid";
export { DealGridSkeleton } from "./components/DealGridSkeleton";
export { EmptyState } from "./components/EmptyState";
export { ErrorState } from "./components/ErrorState";
export { LastUpdated } from "./components/LastUpdated";
export { ResultsSummary } from "./components/ResultsSummary";
export { StaleBanner } from "./components/StaleBanner";
export { dealsQueryOptions, useDealsQuery } from "./hooks/useDealsQuery";
export { CATEGORY_SCOPES, type CategoryScope, type Deal, GENDERS, type Gender } from "./model/Deal";
export { GENDER_LABEL } from "./model/describe";
export {
  DEFAULT_DISCOUNT,
  DEFAULT_SORT,
  isUnfilteredQuery,
  SORTS,
  type SortId,
} from "./model/request";
export { compareSizes, type SizeGroup, sizeGroup } from "./model/sizes";
