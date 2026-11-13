import type { CategoryScope, DealsRequest, Gender, StoreScope } from "../model/Deal";

export const dealsKeys = {
  all: ["deals"] as const,
  // Brands are sorted, so the same selection in any order is the same cache entry.
  list: ({ gender, category, store, brands }: DealsRequest) =>
    [...dealsKeys.all, gender, category, store, [...brands].sort()] as const,
  brands: (gender: Gender, category: CategoryScope, store: StoreScope) =>
    ["brands", gender, category, store] as const,
};
