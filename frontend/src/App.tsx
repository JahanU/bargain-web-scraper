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

function getSortParam(
  priceHighToLow: boolean | null,
  discountHighToLow: boolean | null
): Sort | "" {
  if (priceHighToLow !== null) {
    return priceHighToLow ? Sort.priceHighToLow : Sort.priceLowToHigh;
  }

  if (discountHighToLow !== null) {
    return discountHighToLow ? Sort.discountHighToLow : Sort.discountLowToHigh;
  }

  return "";
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const [urlParams, setUrlParams] = useSearchParams();

  const { search, discount, discountHighToLow, priceHighToLow, sizes } = useSelector(
    (state: RootState) => state.filterStore
  );

  const [initialParams] = useState(() => ({
    search: urlParams.get("search") ?? "",
    sort: urlParams.get("sort") ?? "",
    sizes: parseSizesParam(urlParams.get("sizes")),
  }));

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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

        if (initialParams.search) {
          dispatch(filterActions.setSearch(initialParams.search));
        }

        initialParams.sizes.forEach((size) => {
          dispatch(filterActions.setSizes(size));
        });

        if (initialParams.sort === Sort.priceHighToLow) {
          dispatch(filterActions.setPriceHighToLow(true));
        } else if (initialParams.sort === Sort.priceLowToHigh) {
          dispatch(filterActions.setPriceHighToLow(false));
        } else if (initialParams.sort === Sort.discountHighToLow) {
          dispatch(filterActions.setDiscountHighToLow(true));
        } else if (initialParams.sort === Sort.discountLowToHigh) {
          dispatch(filterActions.setDiscountHighToLow(false));
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsError(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, initialParams]);

  const filteredItems = useMemo(
    () =>
      applyItemFilters(items, {
        search,
        minDiscount: discount,
        sizes,
        priceHighToLow,
        discountHighToLow,
      }),
    [items, search, discount, sizes, priceHighToLow, discountHighToLow]
  );

  const activeSortParam = getSortParam(priceHighToLow, discountHighToLow);
  const currentParamString = urlParams.toString();

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const nextParams = new URLSearchParams();

    if (search) {
      nextParams.set("search", search);
    }

    if (activeSortParam) {
      nextParams.set("sort", activeSortParam);
    }

    if (sizes.length) {
      nextParams.set("sizes", sizes.join(","));
    }

    const nextParamString = nextParams.toString();
    if (nextParamString !== currentParamString) {
      setUrlParams(nextParams);
    }
  }, [isInitialized, search, activeSortParam, sizes, currentParamString, setUrlParams]);

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
