import type { Facets } from "@/features/deals";

export const brandOptions = (facets: Facets | undefined) =>
  facets?.brands.map(({ brand, count }) => ({ value: brand, count }));

/** Undefined with one store or none: a filter with a single option is noise. */
export const storeOptions = (facets: Facets | undefined) =>
  facets && facets.stores.length > 1
    ? facets.stores.map(({ store, name, count }) => ({ value: store, label: name, count }))
    : undefined;
