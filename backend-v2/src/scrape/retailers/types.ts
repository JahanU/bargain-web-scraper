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

/**
 * A source of sale products. `fetchListings` must return the retailer's whole sale catalogue
 * (anything missing is treated as gone) or throw, never a silently partial list.
 */
export interface Retailer {
    id: string;
    fetchListings(): Promise<ProductSnapshot[]>;
}
