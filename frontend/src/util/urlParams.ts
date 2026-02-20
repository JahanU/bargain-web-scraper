import { Sort } from "../interfaces/Sort";

const VALID_SORTS = new Set(Object.values(Sort));

export function parseSizesParam(value: string | null): string[] {
    if (!value) {
        return [];
    }

    const sizes = value
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean);

    return Array.from(new Set(sizes));
}

export function parseSortParam(value: string | null): Sort | null {
    if (value && VALID_SORTS.has(value as Sort)) {
        return value as Sort;
    }

    return null;
}
