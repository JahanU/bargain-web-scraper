import { useQueryStates } from "nuqs";
import { categoryParser, genderParser, storeParser } from "../model/scope";
import { FILTER_KEYS, filterRegistry, type FilterKey } from "../model/registry";
import { sortParser } from "../model/sort";

const parsers = {
  ...(Object.fromEntries(FILTER_KEYS.map((key) => [key, filterRegistry[key].parser])) as {
    [K in FilterKey]: (typeof filterRegistry)[K]["parser"];
  }),
  sort: sortParser,
  gender: genderParser,
  category: categoryParser,
  store: storeParser,
};

const ALL_FILTERS_CLEARED = Object.fromEntries(FILTER_KEYS.map((key) => [key, null])) as Record<
  FilterKey,
  null
>;

/**
 * Filter state lives in the URL and nowhere else: history is replaced (not pushed), defaults are
 * left out, and search writes are throttled to one per 250 ms.
 */
export function useFilters() {
  const [values, setValues] = useQueryStates(parsers, { history: "replace" });
  const actions = {
    set: setValues,
    /** Resets every filter; the sort, gender, category and store stay. */
    clearAll: () => setValues(ALL_FILTERS_CLEARED),
  };
  return [values, actions] as const;
}
