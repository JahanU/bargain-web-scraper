export type SizeGroup = "clothing" | "footwear";

const CLOTHING_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Numeric sizes (6, 8.5, 070) are footwear; everything else is clothing. */
export function sizeGroup(size: string): SizeGroup {
  return /^\d+(\.\d+)?$/.test(size) ? "footwear" : "clothing";
}

/** Clothing XS→XXXL, then other clothing (LXL, OS…) A→Z, then footwear ascending. */
export function compareSizes(a: string, b: string): number {
  const groupA = sizeGroup(a);
  const groupB = sizeGroup(b);
  if (groupA !== groupB) return groupA === "clothing" ? -1 : 1;
  if (groupA === "footwear") return Number(a) - Number(b) || a.localeCompare(b);

  const rankA = CLOTHING_ORDER.indexOf(a);
  const rankB = CLOTHING_ORDER.indexOf(b);
  if (rankA !== -1 && rankB !== -1) return rankA - rankB;
  if (rankA !== -1) return -1;
  if (rankB !== -1) return 1;
  return a.localeCompare(b);
}

/** Deduplicated and in canonical order. */
export function sortSizes(sizes: Iterable<string>): string[] {
  return [...new Set(sizes)].sort(compareSizes);
}

export type SizeFacet = { size: string; count: number };

/** How many of these deals come in each size, grouped and in canonical order. Absent sizes are left out. */
export function sizeFacets(
  deals: readonly { sizes: readonly string[] }[],
): Record<SizeGroup, SizeFacet[]> {
  const counts = new Map<string, number>();
  for (const deal of deals) {
    for (const size of deal.sizes) counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  const facets = [...counts]
    .sort(([a], [b]) => compareSizes(a, b))
    .map(([size, count]) => ({ size, count }));
  return {
    clothing: facets.filter((facet) => sizeGroup(facet.size) === "clothing"),
    footwear: facets.filter((facet) => sizeGroup(facet.size) === "footwear"),
  };
}
