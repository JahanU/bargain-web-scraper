import { useQueryStates } from "nuqs";
import { FILTER_KEYS, type FilterKey } from "../model/registry";
import { urlParsers } from "../model/scope";

const ALL_FILTERS_CLEARED = Object.fromEntries(FILTER_KEYS.map((key) => [key, null])) as Record<
  FilterKey,
  null
>;

/**
 * Filter state lives in the URL and nowhere else: history is replaced (not pushed), defaults are
 * left out, and search writes are throttled to one per 250 ms.
 */
export function useFilters() {
  const [values, setValues] = useQueryStates(urlParsers, { history: "replace" });
  const actions = {
    set: setValues,
    /** Resets every filter; the sort, gender and category stay. */
    clearAll: () => setValues(ALL_FILTERS_CLEARED),
  };
  return [values, actions] as const;
}
