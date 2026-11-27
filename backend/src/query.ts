import type { Category, Deal, Gender, ListedDeal } from '@/deals';
import { splitSizeKeys } from '@/sizes';

/** A retailer as the query needs it: the id deals are stamped with, and the name shoppers search by. */
export interface Store {
    id: string;
    name: string;
}

type SortField = 'discount' | 'nowPrice' | 'timestamp';
type Direction = 1 | -1;

/**
 * Each sort as its two fields in order, 1 for low to high and -1 for high to low. `url` ascending always follows.
 * Keep each pair of opposites together: the snapshot builds each order from the one before it, and a
 * reversed order is the cheapest to sort from.
 */
export const SORTS = {
    'discount-high-to-low': [
        ['discount', -1],
        ['nowPrice', 1],
    ],
    'discount-low-to-high': [
        ['discount', 1],
        ['nowPrice', 1],
    ],
    'price-low-to-high': [
        ['nowPrice', 1],
        ['discount', -1],
    ],
    'price-high-to-low': [
        ['nowPrice', -1],
        ['discount', -1],
    ],
    // Deals found at the same moment, which after a deploy is every deal, read as the default sort does.
    'found-new-to-old': [
        ['timestamp', -1],
        ['discount', -1],
    ],
    'found-old-to-new': [
        ['timestamp', 1],
        ['discount', -1],
    ],
} as const satisfies Record<string, readonly [[SortField, Direction], [SortField, Direction]]>;

export type SortId = keyof typeof SORTS;
export const SORT_IDS = Object.keys(SORTS) as SortId[];
export const DEFAULT_SORT: SortId = 'discount-high-to-low';

/** What places a deal in every sort. A cursor holds the position of a page's last deal. */
export type Position = Pick<Deal, SortField | 'url'>;

/** A validated `/v2/deals` query. An absent field or an empty list means "any". */
export interface DealQuery {
    gender?: Gender;
    category?: Category;
    /** A deal matches if its brand is any of these, compared exactly. */
    brands: string[];
    stores: string[];
    sizes: string[];
    /** The search words, lowercased. A deal must contain every one. */
    words: string[];
    minDiscount: number;
    sort: SortId;
    limit: number;
    /** The last deal of the previous page: this page starts strictly after it. */
    after?: Position;
}

// The dimensions whose values are counted, each ignoring its own filter.
const FACETS = ['store', 'brand', 'size', 'minDiscount'] as const;
type Facet = (typeof FACETS)[number];

/** A deal plus what the query needs from it, worked out once per scrape. */
interface Row {
    deal: Deal;
    /** Lowercased name, brand and store name, one per line so a search word cannot span two of them. */
    text: string;
    /** The facet rows this deal counts towards. */
    values: Record<Facet, readonly string[]>;
}

/** Everything a request reads: built once per accepted scrape, never changed afterwards. */
export interface Snapshot {
    /** Every deal served. */
    deals: Deal[];
    stores: Store[];
    /** The discount facet's rows: every multiple of 10 from the configured floor up to 100. */
    discountSteps: number[];
    trackingSince: number;
    /** The rows in each sort's order, so a request only filters. */
    sorted: Record<SortId, Row[]>;
}

export interface Facets {
    stores: { store: string; name: string; count: number }[];
    brands: { brand: string; count: number }[];
    /** Clothing sizes (accessories included), in filter order. */
    sizes: { size: string; count: number }[];
    /** Footwear sizes, UK, ascending. */
    shoeSizes: { size: string; count: number }[];
    discounts: { minDiscount: number; count: number }[];
}

export interface DealPage {
    items: Deal[];
    total: number;
    nextCursor: string | null;
    trackingSince: number;
    facets?: Facets;
}

/** The sort's comparison: negative when `a` comes before `b`. */
function comparator(sort: SortId) {
    const [[first, firstWay], [second, secondWay]] = SORTS[sort];
    return (a: Position, b: Position) =>
        (a[first] - b[first]) * firstWay ||
        (a[second] - b[second]) * secondWay ||
        (a.url < b.url ? -1 : Number(a.url > b.url));
}

export function buildSnapshot(deals: ListedDeal[], stores: Store[], minDiscount: number): Snapshot {
    const storeNames = new Map(stores.map(({ id, name }) => [id, name]));
    const discountSteps: number[] = [];
    for (let step = Math.ceil(minDiscount / 10) * 10; step <= 100; step += 10) {
        discountSteps.push(step);
    }

    const rows = deals.map(
        ({ sizeKeys, ...deal }): Row => ({
            deal,
            text: [deal.name, deal.brand, storeNames.get(deal.store) ?? ''].join('\n').toLowerCase(),
            values: {
                store: [deal.store],
                brand: [deal.brand],
                size: sizeKeys,
                minDiscount: discountSteps.filter((step) => deal.discount >= step).map(String),
            },
        }),
    );
    // Each order starts from the one before it, which is already partly in order: a third of the work of four separate sorts.
    let previous = rows;
    const inOrder = (sort: SortId) => {
        const compare = comparator(sort);
        previous = previous.toSorted((a, b) => compare(a.deal, b.deal));
        return previous;
    };

    return {
        deals: rows.map((row) => row.deal),
        stores,
        discountSteps,
        // 0 when there are no deals, so the field is always a number.
        trackingSince: deals.reduce((earliest, deal) => Math.min(earliest, deal.timestamp), deals[0]?.timestamp ?? 0),
        sorted: Object.fromEntries(SORT_IDS.map((sort) => [sort, inOrder(sort)])) as Record<SortId, Row[]>,
    };
}

const anyOf = (wanted: string[], value: string) => wanted.length === 0 || wanted.includes(value);

type Dimension = Facet | 'gender' | 'category' | 'q';

/** One predicate per filter. A deal matches the query when every one passes. */
const DIMENSIONS: Record<Dimension, (row: Row, query: DealQuery) => boolean> = {
    gender: ({ deal }, { gender }) => gender === undefined || deal.gender === gender,
    category: ({ deal }, { category }) => category === undefined || deal.category === category,
    q: ({ text }, { words }) => words.every((word) => text.includes(word)),
    store: ({ deal }, { stores }) => anyOf(stores, deal.store),
    brand: ({ deal }, { brands }) => anyOf(brands, deal.brand),
    // The one size dimension, clothing and footwear together: a deal matches if it has any of the sizes.
    size: ({ values }, { sizes }) => sizes.length === 0 || values.size.some((key) => sizes.includes(key)),
    minDiscount: ({ deal }, { minDiscount }) => deal.discount >= minDiscount,
};
const DIMENSION_LIST = Object.entries(DIMENSIONS) as [Dimension, (typeof DIMENSIONS)[Dimension]][];

/** Most deals first, then by name. */
function ranked(counts: Map<string, number>): [string, number][] {
    return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

function encodeCursor({ discount, nowPrice, timestamp, url }: Position): string {
    return Buffer.from(JSON.stringify([discount, nowPrice, timestamp, url])).toString('base64url');
}

/** The position a cursor holds, or undefined if it is not one of ours. */
export function decodeCursor(cursor: string): Position | undefined {
    try {
        const key: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        if (Array.isArray(key) && key.length === 4) {
            const [discount, nowPrice, timestamp, url] = key;
            if (
                typeof discount === 'number' &&
                typeof nowPrice === 'number' &&
                typeof timestamp === 'number' &&
                typeof url === 'string'
            ) {
                return { discount, nowPrice, timestamp, url };
            }
        }
    } catch {
        // Not JSON: not a cursor.
    }
    return undefined;
}

/**
 * One page of the deals matching the query, with the total and, on the first page, the facet
 * counts. Each facet counts the deals that pass every filter except its own, so its rows say what
 * choosing them would give.
 */
export function queryDeals(snapshot: Snapshot, query: DealQuery): DealPage {
    const { sort, limit, after } = query;
    const compare = comparator(sort);
    const counts: Record<Facet, Map<string, number>> | undefined = after
        ? undefined
        : { store: new Map(), brand: new Map(), size: new Map(), minDiscount: new Map() };
    const items: Deal[] = [];
    let total = 0;
    let remaining = 0;

    // shortcut: linear scan per request, fine to tens of thousands of deals on one instance; move the snapshot behind an index or a database past ~100k or when running more than one instance
    for (const row of snapshot.sorted[sort]) {
        let failed: Dimension | undefined;
        let failures = 0;
        for (const [name, matches] of DIMENSION_LIST) {
            if (!matches(row, query)) {
                failed = name;
                // A deal failing two filters counts towards nothing.
                if (++failures > 1) {
                    break;
                }
            }
        }
        if (failures > 1) {
            continue;
        }
        if (counts) {
            // Passing everything counts towards every facet; failing one filter, only towards that filter's own.
            for (const facet of FACETS) {
                if (failures === 0 || failed === facet) {
                    for (const value of row.values[facet]) {
                        counts[facet].set(value, (counts[facet].get(value) ?? 0) + 1);
                    }
                }
            }
        }
        if (failures > 0) {
            continue;
        }

        total++;
        if (!after || compare(row.deal, after) > 0) {
            remaining++;
            if (items.length < limit) {
                items.push(row.deal);
            }
        }
    }

    const last = items.at(-1);
    const count = (facet: Facet, value: string | number) => counts?.[facet].get(String(value)) ?? 0;
    const sizes = splitSizeKeys(counts?.size.keys() ?? []);
    return {
        items,
        total,
        nextCursor: last && remaining > limit ? encodeCursor(last) : null,
        trackingSince: snapshot.trackingSince,
        facets: counts && {
            stores: snapshot.stores.map(({ id, name }) => ({ store: id, name, count: count('store', id) })),
            brands: ranked(counts.brand).map(([brand, count]) => ({ brand, count })),
            sizes: sizes.clothing.map((size) => ({ size, count: count('size', size) })),
            shoeSizes: sizes.footwear.map((size) => ({ size, count: count('size', size) })),
            discounts: snapshot.discountSteps.map((step) => ({ minDiscount: step, count: count('minDiscount', step) })),
        },
    };
}
