import type { CategoryScope, DealsRequest, Gender } from "../model/Deal";

export const dealsKeys = {
  all: ["deals"] as const,
  // Brands are sorted, so the same selection in any order is the same cache entry.
  list: ({ gender, category, brands }: DealsRequest) =>
    [...dealsKeys.all, gender, category, [...brands].sort()] as const,
  brands: (gender: Gender, category: CategoryScope) => ["brands", gender, category] as const,
};
