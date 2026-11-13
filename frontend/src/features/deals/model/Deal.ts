import type { DealImage } from "./image";

export const GENDERS = ["Male", "Female", "Unisex"] as const;
export type Gender = (typeof GENDERS)[number];

export const CATEGORIES = ["Shoes", "Clothes", "Accessories"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_SCOPES = ["All", ...CATEGORIES] as const;
export type CategoryScope = (typeof CATEGORY_SCOPES)[number];

export const STORES = ["jd", "size"] as const;
export type Store = (typeof STORES)[number];
export const STORE_LABEL: Record<Store, string> = { jd: "JD", size: "Size" };
export const STORE_SCOPES = ["all", ...STORES] as const;
export type StoreScope = (typeof STORE_SCOPES)[number];

/** What one deals request asks for: "All"/"all" send no category/store, no brands means every brand. */
export type DealsRequest = {
  gender: Gender;
  category: CategoryScope;
  store: StoreScope;
  brands: readonly string[];
};

/** A deal as the UI uses it, built once per fetch by api/normalise.ts. */
export type Deal = {
  /** The product URL; unique per product. */
  id: string;
  url: string;
  name: string;
  brand: string;
  store: Store;
  nowPrice: number;
  /** 0 when the retailer gave none. */
  wasPrice: number;
  discount: number;
  image: DealImage | undefined;
  /** Canonical order: clothing XS→XXXL, then other clothing A→Z, then footwear ascending. */
  sizes: readonly string[];
  sizeSet: ReadonlySet<string>;
  /** Lowercased text the search filter matches against. */
  searchText: string;
  /** When the backend first saw it (ms). Resets on backend restarts. */
  foundAt: number;
  gender: Gender;
  category: Category;
};
