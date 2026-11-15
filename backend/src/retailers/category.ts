import type { Category } from '@/deals';

// JD Group's product kinds, as JD and Size both name them ("Footwear", "Men > Mens Footwear",
// "size > Men's > Clothing > Hoodies").
const KINDS: [theirs: string, ours: Category][] = [
    ['Footwear', 'Shoes'],
    ['Clothing', 'Clothes'],
    ['Accessories', 'Accessories'],
];

/** The category named in any of a retailer's own labels or category paths, if one is. */
export function categoryIn(labels: string[]): Category | undefined {
    return KINDS.find(([theirs]) => labels.some((label) => label.includes(theirs)))?.[1];
}
