import type { ProductSnapshot } from '../scrape/retailers/types';

/** A product we have seen, plus what we know about its history. */
export interface StoredProduct {
    retailer: string;
    externalId: string;
    name: string;
    url: string;
    imageUrl: string | null;
    gender: string;
    sizes: string[];
    wasPricePence: number;
    nowPricePence: number;
    discount: number;
    status: 'active' | 'sold_out';
    firstSeenAt: number;
    lastSeenAt: number;
    soldOutAt: number | null;
}

/** Everything the scraper knows. Small enough to live in memory. */
export interface Catalogue {
    /** Every known product, keyed by `retailer:externalId`. */
    products: Map<string, StoredProduct>;
    /**
     * How many in-stock products each retailer's last complete listing had, including zero.
     * Stored explicitly so the shrink guard always has a true baseline to compare against.
     */
    lastInStock: Map<string, number>;
}

export const createCatalogue = (): Catalogue => ({ products: new Map(), lastInStock: new Map() });

/** A deal exactly as the frontend's `Item` expects it. */
export interface Deal {
    name: string;
    wasPrice: number;
    nowPrice: number;
    discount: number;
    url: string;
    imageUrl?: string;
    sizes?: string[];
    inStock: 'IN STOCK';
    timestamp: number;
    gender: string;
}

export interface ReconcileResult {
    status: 'ok' | 'partial';
    hits: number;
    upserted: number;
    soldOut: number;
}

// If a run sees fewer than half the products the previous complete run saw, hold back removals
// once: a sudden drop is more often a bad fetch than half the catalogue selling out in five
// minutes. The new count becomes the baseline, so if the next run confirms it (even at zero),
// it was real and removals go ahead.
export const MIN_SEEN_RATIO = 0.5;

export const SOLD_OUT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const keyOf = (retailer: string, externalId: string) => `${retailer}:${externalId}`;

/**
 * Brings one retailer's products in line with what it lists right now: add or refresh what
 * is in stock, and mark out-of-stock and disappeared products sold out. Synchronous, so it
 * can never be observed half-done.
 *
 * Disappeared products are only removed when the listing is `complete` and not suspiciously
 * smaller than the previous run's; otherwise the run is 'partial' and only adds and refreshes.
 */
export function reconcile(
    catalogue: Catalogue,
    retailer: string,
    snapshots: ProductSnapshot[],
    now = Date.now(),
    complete = true,
): ReconcileResult {
    // The same product can appear in more than one listing. If any copy is in stock, it is.
    const byId = new Map<string, ProductSnapshot>();
    for (const snapshot of snapshots) {
        const existing = byId.get(snapshot.externalId);
        if (!existing || (snapshot.inStock && !existing.inStock)) {
            byId.set(snapshot.externalId, snapshot);
        }
    }

    const listed = [...byId.values()];
    const inStock = listed.filter((snapshot) => snapshot.inStock);
    const { products } = catalogue;
    const baseline = catalogue.lastInStock.get(retailer) ?? countActive(catalogue, retailer);

    let soldOut = 0;
    const markSoldOut = (product: StoredProduct) => {
        product.status = 'sold_out';
        product.soldOutAt = now;
        soldOut++;
    };

    for (const snapshot of inStock) {
        const key = keyOf(retailer, snapshot.externalId);
        products.set(key, {
            retailer,
            externalId: snapshot.externalId,
            name: snapshot.name,
            url: snapshot.url,
            imageUrl: snapshot.imageUrl,
            gender: snapshot.gender,
            sizes: snapshot.sizes,
            wasPricePence: snapshot.wasPricePence,
            nowPricePence: snapshot.nowPricePence,
            discount: snapshot.discount,
            status: 'active',
            firstSeenAt: products.get(key)?.firstSeenAt ?? now,
            lastSeenAt: now,
            soldOutAt: null,
        });
    }

    for (const snapshot of listed) {
        const product = products.get(keyOf(retailer, snapshot.externalId));
        if (!snapshot.inStock && product?.status === 'active') {
            markSoldOut(product);
        }
    }

    const removeMissing = complete && inStock.length >= baseline * MIN_SEEN_RATIO;
    if (removeMissing) {
        for (const product of products.values()) {
            if (product.retailer === retailer && product.status === 'active' && !byId.has(product.externalId)) {
                markSoldOut(product);
            }
        }
    }

    // Only a complete listing is a trustworthy count; a truncated one would lower the baseline.
    if (complete) {
        catalogue.lastInStock.set(retailer, inStock.length);
    }

    return { status: removeMissing ? 'ok' : 'partial', hits: byId.size, upserted: inStock.length, soldOut };
}

/** Fallback baseline for a retailer with no recorded count yet (e.g. an older data file). */
function countActive(catalogue: Catalogue, retailer: string): number {
    let count = 0;
    for (const product of catalogue.products.values()) {
        if (product.retailer === retailer && product.status === 'active') {
            count++;
        }
    }
    return count;
}

/** Forgets products that have been sold out for longer than the retention window. */
export function purgeSoldOut(catalogue: Catalogue, now = Date.now(), retentionMs = SOLD_OUT_RETENTION_MS): number {
    let purged = 0;
    for (const [key, product] of catalogue.products) {
        if (product.status === 'sold_out' && product.soldOutAt !== null && now - product.soldOutAt > retentionMs) {
            catalogue.products.delete(key);
            purged++;
        }
    }
    return purged;
}

/** Active deals at or above the discount floor, best first, in the API's shape. */
export function listActiveDeals(catalogue: Catalogue, minDiscount: number): Deal[] {
    return [...catalogue.products.values()]
        .filter((product) => product.status === 'active' && product.discount >= minDiscount)
        .sort((a, b) => b.discount - a.discount || a.nowPricePence - b.nowPricePence)
        .map((product) => ({
            name: product.name,
            wasPrice: product.wasPricePence / 100,
            nowPrice: product.nowPricePence / 100,
            discount: product.discount,
            url: product.url,
            imageUrl: product.imageUrl ?? undefined,
            sizes: product.sizes.length ? product.sizes : undefined,
            inStock: 'IN STOCK',
            timestamp: product.firstSeenAt,
            gender: product.gender,
        }));
}
