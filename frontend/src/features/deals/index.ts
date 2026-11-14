export { ApiError } from "./api/ApiError";
export type { BrandCount } from "./api/brandSchema";
export type { WireDeal } from "./api/dealSchema";
export { dealsKeys } from "./api/queryKeys";
export { DealGrid } from "./components/DealGrid";
export { DealGridSkeleton } from "./components/DealGridSkeleton";
export { EmptyState } from "./components/EmptyState";
export { ErrorState } from "./components/ErrorState";
export { LastUpdated } from "./components/LastUpdated";
export { ResultsSummary } from "./components/ResultsSummary";
export { StaleBanner } from "./components/StaleBanner";
export { useBrandsQuery } from "./hooks/useBrandsQuery";
export { useDealFacets } from "./hooks/useDealFacets";
export { dealsQueryOptions, useDealsQuery } from "./hooks/useDealsQuery";
export {
  CATEGORY_SCOPES,
  type CategoryScope,
  type Deal,
  type DealsRequest,
  GENDERS,
  type Gender,
} from "./model/Deal";
export { GENDER_LABEL, serverStartOf } from "./model/describe";
export { compareSizes, type SizeFacet, type SizeGroup, sizeGroup } from "./model/sizes";
