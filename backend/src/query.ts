import type { Deal, DealFilter } from '@/deals';

/** A retailer as the query needs it: the id deals are stamped with, and the name shoppers search by. */
export interface Store {
    id: string;
    name: string;
}

type SortField = 'discount' | 'nowPrice';
type Direction = 1 | -1;

/** Each sort as its two fields in order, 1 for low to high and -1 for high to low. `url` ascending always follows. */
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
} as const satisfies Record<string, readonly [[SortField, Direction], [SortField, Direction]]>;

export type SortId = keyof typeof SORTS;
export const SORT_IDS = Object.keys(SORTS) as SortId[];
export const DEFAULT_SORT: SortId = 'discount-high-to-low';

/** A deal's position in one sort: its two field values in that sort's order, then its url. */
export type SortKey = [number, number, string];

/** A validated `/v2/deals` query. An absent field or an empty list means "any". */
export interface DealQuery extends DealFilter {
    stores: string[];
    sizes: string[];
    /** The search words, lowercased. A deal must contain every one. */
    words: string[];
    minDiscount: number;
    sort: SortId;
    limit: number;
    /** The last deal of the previous page: this page starts strictly after it. */
    after?: SortKey;
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
    /** Best discount first, then cheapest: the order the v1 routes serve. */
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
    sizes: { size: string; count: number }[];
    discounts: { minDiscount: number; count: number }[];
}

export interface DealPage {
    items: Deal[];
    total: number;
    nextCursor: string | null;
    trackingSince: number;
    facets?: Facets;
}

function sortKey(deal: Deal, sort: SortId): SortKey {
    const [[first], [second]] = SORTS[sort];
    return [deal[first], deal[second], deal.url];
}

function compareKeys(sort: SortId, a: SortKey, b: SortKey): number {
    const [[, first], [, second]] = SORTS[sort];
    return (a[0] - b[0]) * first || (a[1] - b[1]) * second || (a[2] < b[2] ? -1 : Number(a[2] > b[2]));
}

export function buildSnapshot(deals: Deal[], stores: Store[], minDiscount: number): Snapshot {
    const storeNames = new Map(stores.map(({ id, name }) => [id, name]));
    const discountSteps: number[] = [];
    for (let step = Math.ceil(minDiscount / 10) * 10; step <= 100; step += 10) {
        discountSteps.push(step);
    }

    const rows = deals.map(
        (deal): Row => ({
            deal,
            text: [deal.name, deal.brand, storeNames.get(deal.store) ?? ''].join('\n').toLowerCase(),
            values: {
                store: [deal.store],
                brand: [deal.brand],
                size: deal.sizes ?? [],
                minDiscount: discountSteps.filter((step) => deal.discount >= step).map(String),
            },
        }),
    );
    const inOrder = (sort: SortId) =>
        rows.toSorted((a, b) => compareKeys(sort, sortKey(a.deal, sort), sortKey(b.deal, sort)));

    return {
        deals,
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
    size: ({ deal }, { sizes }) => sizes.length === 0 || (deal.sizes?.some((size) => sizes.includes(size)) ?? false),
    minDiscount: ({ deal }, { minDiscount }) => deal.discount >= minDiscount,
};
const DIMENSION_LIST = Object.entries(DIMENSIONS) as [Dimension, (typeof DIMENSIONS)[Dimension]][];

/** Most deals first, then by name. */
function ranked(counts: Map<string, number>): [string, number][] {
    return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

function encodeCursor(key: SortKey): string {
    return Buffer.from(JSON.stringify(key)).toString('base64url');
}

/** The sort key a cursor holds, or undefined if it is not one of ours. */
export function decodeCursor(cursor: string): SortKey | undefined {
    try {
        const key: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        if (
            Array.isArray(key) &&
            key.length === 3 &&
            typeof key[0] === 'number' &&
            typeof key[1] === 'number' &&
            typeof key[2] === 'string'
        ) {
            return key as SortKey;
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
        if (!after || compareKeys(sort, sortKey(row.deal, sort), after) > 0) {
            remaining++;
            if (items.length < limit) {
                items.push(row.deal);
            }
        }
    }

    const last = items.at(-1);
    const count = (facet: Facet, value: string | number) => counts?.[facet].get(String(value)) ?? 0;
    return {
        items,
        total,
        nextCursor: last && remaining > limit ? encodeCursor(sortKey(last, sort)) : null,
        trackingSince: snapshot.trackingSince,
        facets: counts && {
            stores: snapshot.stores.map(({ id, name }) => ({ store: id, name, count: count('store', id) })),
            brands: ranked(counts.brand).map(([brand, count]) => ({ brand, count })),
            sizes: ranked(counts.size).map(([size, count]) => ({ size, count })),
            discounts: snapshot.discountSteps.map((step) => ({ minDiscount: step, count: count('minDiscount', step) })),
        },
    };
}
