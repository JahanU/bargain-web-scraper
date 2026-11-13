import { parseAsStringLiteral } from "nuqs";
import { GENDERS } from "@/features/deals";

// A scope, not a filter: the backend applies it, and clearing filters keeps it.
export const genderParser = parseAsStringLiteral(GENDERS).withDefault("Male");
