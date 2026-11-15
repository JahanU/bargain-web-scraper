import type { DealImage } from "./image";

export const GENDERS = ["Male", "Female", "Unisex"] as const;
export type Gender = (typeof GENDERS)[number];

export const CATEGORIES = ["Shoes", "Clothes", "Accessories"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_SCOPES = ["All", ...CATEGORIES] as const;
export type CategoryScope = (typeof CATEGORY_SCOPES)[number];

/** A deal as the UI uses it, built once per fetch by api/normalise.ts. */
export type Deal = {
  /** The product URL; unique per product. */
  id: string;
  url: string;
  name: string;
  brand: string;
  /** Retailer id, e.g. "jd". */
  store: string;
  nowPrice: number;
  /** 0 when the retailer gave none. */
  wasPrice: number;
  discount: number;
  image: DealImage | undefined;
  /** What the card prints, in the backend's order. */
  sizes: readonly string[];
  /** When the backend first saw it (ms). Resets on backend restarts. */
  foundAt: number;
  gender: Gender;
  category: Category;
};
