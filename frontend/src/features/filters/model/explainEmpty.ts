import type { Deal } from "@/features/deals";
import { type FilterState, applyFilters } from "./applyFilters";
import { DEFAULT_DISCOUNT, DISCOUNT_STOPS, type FilterValues } from "./registry";

export type Suggestion = { label: string; next: Partial<FilterValues> };
export type EmptyExplanation = { title: string; hint?: string; suggestions: Suggestion[] };

const count = (deals: readonly Deal[], values: FilterState) => applyFilters(deals, values).length;
const plural = (n: number) => `${n} ${n === 1 ? "deal" : "deals"}`;

/** Why nothing shows, worked out by relaxing one filter at a time. */
export function explainEmpty(deals: readonly Deal[], values: FilterState): EmptyExplanation {
  const term = values.search.trim();
  const suggestions: Suggestion[] = [];

  // The highest discount that would show something, keeping everything else.
  if (values.discount > DISCOUNT_STOPS[0]) {
    const lower = [...DISCOUNT_STOPS]
      .reverse()
      .filter((stop) => stop < values.discount)
      .map((stop) => ({ stop, found: count(deals, { ...values, discount: stop }) }))
      .find(({ found }) => found > 0);
    if (lower)
      suggestions.push({
        label: `Show ${plural(lower.found)} at ${lower.stop}% or more`,
        next: { discount: lower.stop },
      });
  }
  if (values.sizes.length > 0) {
    const found = count(deals, { ...values, sizes: [] });
    if (found > 0)
      suggestions.push({ label: `Show ${plural(found)} in any size`, next: { sizes: [] } });
  }
  if (term) {
    const found = count(deals, { ...values, search: "" });
    if (found > 0)
      suggestions.push({ label: `Show ${plural(found)} without the search`, next: { search: "" } });
  }

  const onlySearch =
    term !== "" && values.sizes.length === 0 && values.discount === DEFAULT_DISCOUNT;
  if (onlySearch) {
    return {
      title: `Nothing matches “${term}”`,
      hint: "Try a shorter or different search.",
      suggestions,
    };
  }

  const parts = [
    ...(term ? [`for “${term}”`] : []),
    `at ${values.discount}% or more`,
    ...(values.sizes.length > 0 ? [`in size ${values.sizes.join(" or ")}`] : []),
  ];
  return { title: `No deals ${parts.join(" ")}`, suggestions };
}
