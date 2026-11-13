import type { Listing, Product } from '@/retailers/types';

export const GENDERS = ['Male', 'Female', 'Unisex'] as const;
export type Gender = (typeof GENDERS)[number];

export const CATEGORIES = ['Shoes', 'Clothes', 'Accessories'] as const;
export type Category = (typeof CATEGORIES)[number];

/** The shops we read. Called stores, as on the site, though each is a `Retailer` in the code. */
export const STORES = ['jd', 'size', 'end'] as const;
export type Store = (typeof STORES)[number];

/** A deal exactly as the frontend's `Item` expects it. */
export interface Deal {
    name: string;
    wasPrice: number;
    nowPrice: number;
    discount: number;
    url: string;
    imageUrl?: string;
    sizes?: string[];
    /** When this process first saw the product (ms since epoch). */
    timestamp: number;
    gender: Gender;
    brand: string;
    category: Category;
    store: Store;
}

/** What a request narrows the deals by. An absent field (or no brands) means "any". */
export interface DealFilter {
    gender?: Gender;
    category?: Category;
    store?: Store;
    /** A deal matches if its brand is any of these, compared exactly. */
    brands: string[];
}

export interface BrandCount {
    brand: string;
    count: number;
}

export function filterDeals(deals: Deal[], { gender, category, store, brands }: DealFilter): Deal[] {
    return deals.filter(
        (deal) =>
            (gender === undefined || deal.gender === gender) &&
            (category === undefined || deal.category === category) &&
            (store === undefined || deal.store === store) &&
            (brands.length === 0 || brands.includes(deal.brand)),
    );
}

/** How many of these deals each brand has: most deals first, then by name. */
export function brandCounts(deals: Deal[]): BrandCount[] {
    const counts = new Map<string, number>();
    for (const { brand } of deals) {
        counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }
    return [...counts]
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count || (a.brand < b.brand ? -1 : 1));
}

/**
 * - ok: the listing replaced the retailer's products.
 * - incomplete / held: what the listing showed was applied (new, refreshed, out of stock), but
 *   products it didn't mention were kept.
 */
export type AcceptStatus = 'ok' | 'incomplete' | 'held';

export interface AcceptResult {
    status: AcceptStatus;
    products: number;
    added: number;
    removed: number;
}

/**
 * A complete listing with fewer than half the products we hold looks more like a bad fetch than
 * half the sale selling out in five minutes. It is held back once; if the next run confirms the
 * smaller number (even zero), it is accepted.
 */
const MIN_KEPT_RATIO = 0.5;

export const UNISEX: Gender = 'Unisex';

interface StoredProduct extends Product {
    firstSeenAt: number;
}

/**
 * Every retailer's current products, held in memory. The deals served are always the latest
 * accepted listing, so a product that sells out is simply gone.
 */
export class DealStore {
    private readonly byRetailer = new Map<Store, Map<string, StoredProduct>>();
    private readonly heldBack = new Set<Store>();

    accept(retailer: Store, listing: Listing, now = Date.now()): AcceptResult {
        const previous = this.byRetailer.get(retailer) ?? new Map<string, StoredProduct>();
        const listed = dedupe(listing.products);
        const inStock = [...listed.values()].filter((product) => product.inStock);

        const status = this.statusFor(retailer, listing.complete, inStock.length, previous.size);

        // ok: the listing is the whole truth. Otherwise start from what we had, replacing only what
        // the listing mentioned (so out-of-stock products still drop out).
        const next = new Map(status === 'ok' ? [] : previous);
        for (const id of listed.keys()) {
            next.delete(id);
        }
        for (const product of inStock) {
            const firstSeenAt = previous.get(product.externalId)?.firstSeenAt ?? now;
            next.set(product.externalId, { ...product, firstSeenAt });
        }

        this.byRetailer.set(retailer, next);
        return {
            status,
            products: next.size,
            added: [...next.keys()].filter((id) => !previous.has(id)).length,
            removed: [...previous.keys()].filter((id) => !next.has(id)).length,
        };
    }

    /** Deals at or above the discount floor, best discount first, then cheapest. */
    deals(minDiscount: number): Deal[] {
        const deals = [...this.byRetailer]
            .flatMap(([store, products]) => [...products.values()].map((product) => ({ store, product })))
            .filter(({ product }) => product.discount >= minDiscount)
            .sort(
                (a, b) => b.product.discount - a.product.discount || a.product.nowPricePence - b.product.nowPricePence,
            )
            .map(({ store, product }) => toDeal(product, store));
        return withOneSpellingPerBrand(deals);
    }

    private statusFor(retailer: Store, complete: boolean, inStock: number, held: number): AcceptStatus {
        if (!complete) {
            return 'incomplete';
        }

        const suspiciousDrop = held > 0 && inStock < held * MIN_KEPT_RATIO;
        if (suspiciousDrop && !this.heldBack.has(retailer)) {
            this.heldBack.add(retailer);
            return 'held';
        }

        this.heldBack.delete(retailer);
        return 'ok';
    }
}

/**
 * One entry per product. A product listed more than once is in stock if any copy is, and one
 * listed under different genders (men's and women's sales) is unisex.
 */
function dedupe(products: Product[]): Map<string, Product> {
    const byId = new Map<string, Product>();
    for (const product of products) {
        const existing = byId.get(product.externalId);
        if (!existing) {
            byId.set(product.externalId, product);
            continue;
        }

        const preferred = product.inStock && !existing.inStock ? product : existing;
        const gender = existing.gender === product.gender ? preferred.gender : UNISEX;
        byId.set(product.externalId, { ...preferred, gender });
    }
    return byId;
}

/**
 * Shops spell some brands differently ("adidas", "Adidas"), and the brand filter matches exactly.
 * Every deal takes the spelling most deals use, so a brand is one entry across all stores.
 */
function withOneSpellingPerBrand(deals: Deal[]): Deal[] {
    const spellings = new Map<string, Map<string, number>>();
    for (const { brand } of deals) {
        const counts = spellings.get(brand.toLowerCase()) ?? new Map<string, number>();
        spellings.set(brand.toLowerCase(), counts.set(brand, (counts.get(brand) ?? 0) + 1));
    }
    const preferred = (brand: string) =>
        [...(spellings.get(brand.toLowerCase()) ?? [])].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
    return deals.map((deal) => ({ ...deal, brand: preferred(deal.brand) ?? deal.brand }));
}

function toDeal(product: StoredProduct, store: Store): Deal {
    return {
        name: product.name,
        wasPrice: product.wasPricePence / 100,
        nowPrice: product.nowPricePence / 100,
        discount: product.discount,
        url: product.url,
        imageUrl: product.imageUrl ?? undefined,
        sizes: product.sizes.length ? product.sizes : undefined,
        timestamp: product.firstSeenAt,
        gender: product.gender,
        brand: product.brand,
        category: product.category,
        store,
    };
}
