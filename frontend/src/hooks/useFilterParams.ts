import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sort } from "../interfaces/Sort";
import { parseSizesParam, parseSortParam } from "../util/urlParams";

const SEARCH_DEBOUNCE_MS = 300;

interface FilterParams {
    search: string;
    sort: Sort | null;
    sizes: string[];
    setSearch: (value: string) => void;
    setSort: (value: Sort) => void;
    toggleSize: (size: string) => void;
}

export function useFilterParams(): FilterParams {
    const [searchParams, setSearchParams] = useSearchParams();

    const search = searchParams.get("search") ?? "";
    const sort = parseSortParam(searchParams.get("sort"));
    const sizes = parseSizesParam(searchParams.get("sizes"));

    // --- Search: local input state + debounced URL write ---
    const [localSearch, setLocalSearch] = useState(search);
    const isInitialMount = useRef(true);

    // Sync local search when URL changes externally (e.g. back/forward nav)
    useEffect(() => {
        setLocalSearch(search);
    }, [search]);

    // Debounce local search → URL
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (localSearch === search) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            const next = new URLSearchParams(searchParams);
            if (localSearch) {
                next.set("search", localSearch);
            } else {
                next.delete("search");
            }
            setSearchParams(next, { replace: true });
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [localSearch, search, searchParams, setSearchParams]);

    // --- Sort: toggle behaviour (click same sort again → clear) ---
    const setSort = useCallback(
        (value: Sort) => {
            const next = new URLSearchParams(searchParams);
            const current = parseSortParam(next.get("sort"));

            if (current === value) {
                next.delete("sort");
            } else {
                next.set("sort", value);
            }

            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    // --- Sizes: toggle individual size ---
    const toggleSize = useCallback(
        (size: string) => {
            const next = new URLSearchParams(searchParams);
            const current = parseSizesParam(next.get("sizes"));

            const updated = current.includes(size)
                ? current.filter((s) => s !== size)
                : [...current, size];

            if (updated.length > 0) {
                next.set("sizes", updated.join(","));
            } else {
                next.delete("sizes");
            }

            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    return {
        search: localSearch,
        sort,
        sizes,
        setSearch: setLocalSearch,
        setSort,
        toggleSize,
    };
}
