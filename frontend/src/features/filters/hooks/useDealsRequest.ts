import { useEffect, useState } from "react";
import type { FilterState } from "../model/registry";

const SEARCH_SETTLE_MS = 300;

/**
 * The deals request the URL state asks for. It follows every control at once except search,
 * which it follows once typing pauses, so a word costs one request and not one per letter.
 * Clearing the search applies at once: there is nothing more to wait for.
 */
export function useDealsRequest(values: FilterState): FilterState {
  const [settled, setSettled] = useState(values.search);
  const blank = values.search.trim() === "";
  if (blank && settled !== "") setSettled("");
  useEffect(() => {
    if (blank || values.search === settled) return;
    const timer = setTimeout(() => setSettled(values.search), SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [blank, values.search, settled]);
  return { ...values, search: blank ? "" : settled };
}
