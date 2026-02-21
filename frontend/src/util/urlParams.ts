import { Sort } from "../interfaces/Sort";

const VALID_SORTS = new Set(Object.values(Sort));

export function parseSizesParam(value: string | null): string[] {
    if (!value) {
        return [];
    }

    // Split the string by comma, trim whitespace from each element, and remove empty strings
    const sizes = value
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean);

    // Remove duplicates by converting to a Set and back to an array
    return Array.from(new Set(sizes));
}

// Check if the value is a valid sort
export function parseSortParam(value: string | null): Sort | null {
    if (value && VALID_SORTS.has(value as Sort)) {
        return value as Sort;
    }
    return null;
}
