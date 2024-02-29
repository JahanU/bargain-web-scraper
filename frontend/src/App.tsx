/* eslint-disable react-hooks/exhaustive-deps */
import "./App.css";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getItemsService } from "./services/webScrape.service";
import Item from "./interfaces/Item";
import ItemTable from "./component/table/ItemTable";
import HeaderBar from "./component/header/HeaderBar";
import Error from "./component/modal/Error";
import Filters from "./component/filter/Filters";
import { filterActions } from "./store/filterSlice";
import { Sort as SORT } from "./interfaces/Sort";
import { priceSort, discountSort, genderSort, discountSlider, sizeFilter } from './util/sort';

export default function App() {

  const dispatch = useDispatch();
  const filterStore = useSelector((state: any) => state.filterStore);
  const paramStore = useSelector((state: any) => state.paramStore);
  const { search, discount, discountHighToLow, priceHighToLow, gender, sizes } = filterStore;

  const { sortParams, searchInputParams, sizesParams } = paramStore; // genderParams, discountParam
  let [urlParams, setUrlParams] = useSearchParams();
  let urlSort = urlParams.get("sort") || "";
  let urlSearch = urlParams.get("search") || "";
  // let urlSizes = urlParams.get("sizes") || "";

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setFilteredItems(priceSort(priceHighToLow, filteredItems));
  }, [priceHighToLow]);

  useEffect(() => {
    setFilteredItems(discountSort(discountHighToLow, filteredItems));
  }, [discountHighToLow]);

  useEffect(() => {   // Gender -> male = true, female = false
    setFilteredItems(genderSort(gender, filteredItems));
  }, [gender]);

  useEffect(() => {
    setFilteredItems(discountSlider(search, discount, items));
  }, [discount]);

  // useEffect(() => {
  //   setFilteredItems(searchInput(search, discount, items, filteredItems));
  // }, [search]);

  useEffect(() => {
    setFilteredItems(sizeFilter(sizes, discount, items));
  }, [sizes]);

  useEffect(() => {
    setFilteredItems(genderSort(sizes, items));
  }, [gender]);

  useEffect(() => {
    const [search, sort, sizes] = [searchInputParams.input || "", sortParams.sort || "", sizesParams.sizes || ""];

    if (!search) { // User cleared input search
      urlParams.delete("search");
      console.log("setting params:", { urlParams: urlParams.toString() });
      setUrlParams(urlParams);
    }

    if (search && sort && sizes) setUrlParams({ search, sort, sizes });
    else if (search) setUrlParams({ search });
    else if (sort) setUrlParams({ sort });
    else if (sizes) setUrlParams({ sizes });
  }, [sortParams, searchInputParams, sizesParams]);


  // function initialSortOptions(urlSort: string, urlSearch: string, urlSizes: string, items: Item[]) {
  function initialSortOptions(urlSort: string, urlSearch: string, items: Item[]) {
    // For initial loading based on URL input. eg http://localhost:3000/?sort=price-low-to-high or assign default (discount high to low)
    console.log(urlSearch);
    
    // if (urlSearch) {
    //   setFilteredItems(searchInput(urlSearch, discount, items, filteredItems));
    //   dispatch(filterActions.setSearch(urlSearch));
    // }

    // if (urlSizes) {
    //   console.log(urlSizes);
    //   setFilteredItems(sizeFilter(urlSize.split(","), discount, items));
    //   dispatch(filterActions.setSizes(urlSize));
    // }

    if (urlSort === SORT.priceHighToLow) {
      setFilteredItems(priceSort(true, items));
      dispatch(filterActions.setPriceHighToLow(true));
    } else if (urlSort === SORT.priceLowToHigh) {
      setFilteredItems(priceSort(false, items));
      dispatch(filterActions.setPriceHighToLow(false));
    } else if (urlSort === SORT.discountHighToLow) {
      setFilteredItems(discountSort(true, items));
      dispatch(filterActions.setDiscountHighToLow(true));
    } else if (urlSort === SORT.discountLowToHigh) {
      setFilteredItems(discountSort(false, items));
      dispatch(filterActions.setDiscountHighToLow(false));
    } else {
      // TODO - Maybe: check that both search and sort is empty
      setFilteredItems(items);
    }
  }

  // Fetching Data from the API
  useEffect(() => {
    setLoading(true);
    getItemsService()
      .then((items: any) => {
        if (!items.length) {
          console.log(items, " data is empty");
          setIsError(true);
        } else {
          setItems(items);
          initialSortOptions(urlSort, urlSearch, items);
        }
      })
      .catch((err: any) => {
        console.log(err);
        setIsError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  
  return (
    <div className="App">
      <nav>
        {" "}
        <HeaderBar />
      </nav>
      {isError && <Error />}
      {!isError && <Filters />}
      {!isError && <ItemTable items={filteredItems} isLoading={loading} />}
    </div>
  );
}
