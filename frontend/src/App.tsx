import "./App.css";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getItemsService } from "./services/webScrape.service";
import Item from "./interfaces/Item";
import ItemTable from "./component/table/ItemTable";
import HeaderBar from "./component/header/HeaderBar";
import Error from "./component/modal/Error";
import Filters from "./component/filter/Filters";
import { filterActions } from "./store/filterSlice";
import { Sort } from "./interfaces/Sort";
import { applyItemFilters } from "./util/sort";
import { AppDispatch, RootState } from "./store";

const SEARCH_PARAM_DEBOUNCE_MS = 300;
const VALID_SORTS = new Set(Object.values(Sort));

interface QueryFilterState {
  search: string;
  sort: Sort | null;
  sizes: string[];
}

function parseSizesParam(value: string | null): string[] {
  if (!value) {
    return [];
  }

  const sizes = value
    .split(",")
    .map((size) => size.trim())
    .filter(Boolean);

  return Array.from(new Set(sizes));
}

function parseSortParam(value: string | null): Sort | null {
  if (value && VALID_SORTS.has(value as Sort)) {
    return value as Sort;
  }

  return null;
}

function parseQueryFilterState(urlParams: URLSearchParams): QueryFilterState {
  return {
    search: urlParams.get("search") ?? "",
    sort: parseSortParam(urlParams.get("sort")),
    sizes: parseSizesParam(urlParams.get("sizes")),
  };
}

function toUrlSearchParams(filters: QueryFilterState): URLSearchParams {
  const nextParams = new URLSearchParams();

  if (filters.search) {
    nextParams.set("search", filters.search);
  }

  if (filters.sort) {
    nextParams.set("sort", filters.sort);
  }

  if (filters.sizes.length) {
    nextParams.set("sizes", filters.sizes.join(","));
  }

  return nextParams;
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const [urlParams, setUrlParams] = useSearchParams();

  const { search, discount, sort, sizes } = useSelector((state: RootState) => state.filterStore);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [hasHydratedFromUrl, setHasHydratedFromUrl] = useState(false);

  const queryFilters = useMemo(() => parseQueryFilterState(urlParams), [urlParams]);

  useEffect(() => {
    const queryMatchesStore =
      queryFilters.search === search &&
      queryFilters.sort === sort &&
      areStringArraysEqual(queryFilters.sizes, sizes);

    if (!queryMatchesStore) {
      dispatch(filterActions.hydrateFromQuery(queryFilters));
    }

    if (!hasHydratedFromUrl) {
      setHasHydratedFromUrl(true);
    }
  }, [dispatch, queryFilters, search, sort, sizes, hasHydratedFromUrl]);

  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    getItemsService()
      .then((responseItems: Item[]) => {
        if (!isMounted) {
          return;
        }

        if (!Array.isArray(responseItems) || responseItems.length === 0) {
          setIsError(true);
          return;
        }

        setItems(responseItems);
      })
      .catch(() => {
        if (isMounted) {
          setIsError(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedFromUrl) {
      return;
    }

    const nextQueryFilters: QueryFilterState = { search, sort, sizes };
    const nextParams = toUrlSearchParams(nextQueryFilters);
    const nextQueryString = nextParams.toString();

    const currentQueryFilters = parseQueryFilterState(urlParams);
    const currentQueryString = toUrlSearchParams(currentQueryFilters).toString();

    if (nextQueryString === currentQueryString) {
      return;
    }

    const shouldDebounceSearchUpdate =
      sort === currentQueryFilters.sort &&
      areStringArraysEqual(sizes, currentQueryFilters.sizes) &&
      search !== currentQueryFilters.search;

    if (shouldDebounceSearchUpdate) {
      const timeoutId = window.setTimeout(() => {
        setUrlParams(nextParams, { replace: true });
      }, SEARCH_PARAM_DEBOUNCE_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setUrlParams(nextParams, { replace: true });
  }, [hasHydratedFromUrl, search, sort, sizes, urlParams, setUrlParams]);

  const filteredItems = useMemo(
    () =>
      applyItemFilters(items, {
        search,
        minDiscount: discount,
        sizes,
        sort,
      }),
    [items, search, discount, sizes, sort]
  );

  return (
    <div className="App">
      <nav>
        <HeaderBar />
      </nav>
      {isError && <Error />}
      {!isError && <Filters />}
      {!isError && <ItemTable items={filteredItems} isLoading={loading} />}
    </div>
  );
}
