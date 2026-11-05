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
