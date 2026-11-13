import { createLoader, parseAsStringLiteral } from "nuqs";
import { CATEGORY_SCOPES, GENDERS, STORE_SCOPES } from "@/features/deals";
import { filterRegistry } from "./registry";

// Scopes, not filters: the backend applies them, and clearing filters keeps them.
export const genderParser = parseAsStringLiteral(GENDERS).withDefault("Male");
export const categoryParser = parseAsStringLiteral(CATEGORY_SCOPES).withDefault("All");
export const storeParser = parseAsStringLiteral(STORE_SCOPES).withDefault("all");

/** The deals request a query string asks for, for the prefetch before React renders. */
export const loadDealsRequest = createLoader({
  gender: genderParser,
  category: categoryParser,
  store: storeParser,
  brands: filterRegistry.brands.parser,
});
