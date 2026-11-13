import type { Category, Gender, Store } from '@/deals';

/** One product as a retailer lists it right now, normalised to our shape. */
export interface Product {
    externalId: string;
    name: string;
    url: string;
    imageUrl: string | null;
    gender: Gender;
    brand: string;
    category: Category;
    sizes: string[];
    wasPricePence: number;
    nowPricePence: number;
    discount: number;
    inStock: boolean;
}

/** What one fetch of a retailer's sale catalogue produced. */
export interface Listing {
    products: Product[];
    /**
     * True only when `products` is the whole sale catalogue. Products missing from a complete
     * listing are gone; an incomplete one can only add, refresh, or drop what it says is out of stock.
     */
    complete: boolean;
}

/** A source of sale products. Throws when nothing usable could be fetched. */
export interface Retailer {
    id: Store;
    fetchListing(): Promise<Listing>;
}
