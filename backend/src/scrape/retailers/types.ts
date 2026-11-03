/** One product as a retailer lists it right now, normalised to our shape. */
export interface ProductSnapshot {
    externalId: string;
    name: string;
    url: string;
    imageUrl: string | null;
    gender: string;
    sizes: string[];
    wasPricePence: number;
    nowPricePence: number;
    discount: number;
    inStock: boolean;
}

/** What one fetch of a retailer's sale catalogue produced. */
export interface Listing {
    products: ProductSnapshot[];
    /**
     * True only when `products` is the retailer's whole sale catalogue. Products missing from a
     * complete listing are treated as gone; an incomplete one only adds and refreshes.
     */
    complete: boolean;
}

/** A source of sale products. Throws when nothing usable could be fetched. */
export interface Retailer {
    id: string;
    fetchListings(): Promise<Listing>;
}
