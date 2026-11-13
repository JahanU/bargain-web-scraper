type Row = { gender: string; category: string; brand: string };

/** The backend's deal filtering: gender and category narrow, brands are OR. */
export function filterDeals<T extends Row>(deals: readonly T[], params: URLSearchParams): T[] {
  const gender = params.get("gender");
  const category = params.get("category");
  const brands = params.getAll("brand");
  return deals.filter(
    (deal) =>
      (gender === null || deal.gender === gender) &&
      (category === null || deal.category === category) &&
      (brands.length === 0 || brands.includes(deal.brand)),
  );
}

/** The backend's /v1/brands: counts for the gender and category, biggest first. */
export function brandCounts(deals: readonly Row[], params: URLSearchParams) {
  const scope = new URLSearchParams(params);
  scope.delete("brand");
  const counts = new Map<string, number>();
  for (const { brand } of filterDeals(deals, scope))
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  return [...counts].map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count);
}
