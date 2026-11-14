import { DEFAULT_DISCOUNT, type Facets } from "@/features/deals";
import type { FilterState, FilterValues } from "./registry";

export type Suggestion = { label: string; next: Partial<FilterValues> };
export type EmptyExplanation = { title: string; hint?: string; suggestions: Suggestion[] };

const some = (rows: readonly { count: number }[]) => rows.some((row) => row.count > 0);

/**
 * Why nothing shows, and the single filters whose removal would show something. Each facet is
 * counted without its own filter, so a facet with any deals says dropping that filter works.
 */
export function explainEmpty(values: FilterState, facets: Facets | undefined): EmptyExplanation {
  const term = values.search.trim();
  const suggestions: Suggestion[] = [];

  // The highest discount that would show something, keeping everything else.
  const lower = facets?.discounts
    .filter((stop) => stop.minDiscount < values.discount && stop.count > 0)
    .sort((a, b) => b.minDiscount - a.minDiscount)[0];
  if (lower)
    suggestions.push({
      label: `Show ${lower.count} ${lower.count === 1 ? "deal" : "deals"} at ${lower.minDiscount}% or more`,
      next: { discount: lower.minDiscount },
    });
  if (values.sizes.length > 0 && facets && some(facets.sizes))
    suggestions.push({ label: "Show deals in any size", next: { sizes: [] } });
  if (values.brands.length > 0 && facets && some(facets.brands))
    suggestions.push({ label: "Show deals from any brand", next: { brands: [] } });
  if (values.stores.length > 0 && facets && some(facets.stores))
    suggestions.push({ label: "Show deals at any store", next: { stores: [] } });
  // No facet says what a search hides, so this one is always offered.
  if (term) suggestions.push({ label: "Clear search", next: { search: "" } });

  const onlySearch =
    term !== "" &&
    values.sizes.length === 0 &&
    values.brands.length === 0 &&
    values.stores.length === 0 &&
    values.discount === DEFAULT_DISCOUNT;
  if (onlySearch) {
    return {
      title: `Nothing matches “${term}”`,
      hint: "Try a shorter or different search.",
      suggestions,
    };
  }

  const storeName = (id: string) => facets?.stores.find((row) => row.store === id)?.name ?? id;
  const parts = [
    ...(term ? [`for “${term}”`] : []),
    `at ${values.discount}% or more`,
    ...(values.sizes.length > 0 ? [`in size ${values.sizes.join(" or ")}`] : []),
    ...(values.brands.length > 0 ? [`from ${values.brands.join(" or ")}`] : []),
    ...(values.stores.length > 0 ? [`at ${values.stores.map(storeName).join(" or ")}`] : []),
  ];
  return { title: `No deals ${parts.join(" ")}`, suggestions };
}
