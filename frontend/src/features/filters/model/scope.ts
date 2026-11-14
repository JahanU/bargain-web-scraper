import { createLoader, parseAsStringLiteral } from "nuqs";
import { CATEGORY_SCOPES, GENDERS } from "@/features/deals";
import { FILTER_KEYS, type FilterKey, filterRegistry } from "./registry";
import { sortParser } from "./sort";

/** Every URL parameter. Gender, category and sort aren't filters: clearing filters keeps them. */
export const urlParsers = {
  ...(Object.fromEntries(FILTER_KEYS.map((key) => [key, filterRegistry[key].parser])) as {
    [K in FilterKey]: (typeof filterRegistry)[K]["parser"];
  }),
  sort: sortParser,
  gender: parseAsStringLiteral(GENDERS).withDefault("Male"),
  category: parseAsStringLiteral(CATEGORY_SCOPES).withDefault("All"),
};

/** The deals request a query string asks for, for the prefetch before React renders. */
export const loadDealsRequest = createLoader(urlParsers);
