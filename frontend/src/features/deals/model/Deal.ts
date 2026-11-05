import type { DealImage } from "./image";

export const GENDERS = ["Male", "Female", "Unisex"] as const;
export type Gender = (typeof GENDERS)[number];

/** A deal as the UI uses it, built once per fetch by api/normalise.ts. */
export type Deal = {
  /** The product URL; unique per product. */
  id: string;
  url: string;
  name: string;
  brand: string;
  /** Retailer host, e.g. "jdsports.co.uk". */
  store: string;
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
};
