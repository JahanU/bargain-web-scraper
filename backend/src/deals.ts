import type { Listing, Product } from '@/retailers/types';

export const GENDERS = ['Male', 'Female', 'Unisex'] as const;
export type Gender = (typeof GENDERS)[number];

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
    private readonly byRetailer = new Map<string, Map<string, StoredProduct>>();
    private readonly heldBack = new Set<string>();

    accept(retailer: string, listing: Listing, now = Date.now()): AcceptResult {
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
        return [...this.byRetailer.values()]
            .flatMap((products) => [...products.values()])
            .filter((product) => product.discount >= minDiscount)
            .sort((a, b) => b.discount - a.discount || a.nowPricePence - b.nowPricePence)
            .map(toDeal);
    }

    private statusFor(retailer: string, complete: boolean, inStock: number, held: number): AcceptStatus {
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

function toDeal(product: StoredProduct): Deal {
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
    };
}
