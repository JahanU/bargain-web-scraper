/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import './App.css';
import { getItemsService } from './services/webScrape.service'
import ItemTable from './component/table/ItemTable';
import Item from './interfaces/Item';
import HeaderBar from './component/header/HeaderBar';
import Error from './component/modal/Error';
import { useDispatch, useSelector } from 'react-redux';
import Filters from './component/filter/Filters';
import { useSearchParams } from "react-router-dom";
import { filterActions } from './store/filterSlice';
import { Sort } from './interfaces/Sort';


function priceSort(filter: boolean, items: Item[]) {
  console.log('price sort: ', items.length);
  if (filter)   // Sort Desc // TODO: Parse type for quick fix until backend is updated
    return ([...items].sort((a, b) => parseInt(b.nowPrice.substring(1)) - parseInt(a.nowPrice.substring(1))));
  else
    return ([...items].sort((a, b) => parseInt(a.nowPrice.substring(1)) - parseInt(b.nowPrice.substring(1))));
}
function discountSort(discountHighToLow: boolean, items: Item[]) {
  if (discountHighToLow)  // Sort Desc
    return ([...items].sort((a, b) => b.discount - a.discount));
  else
    return ([...items].sort((a, b) => a.discount - b.discount))
}
function genderSort(gender: boolean, items: Item[]) {
  if (gender) // Gender -> male = true, female = false
    return ([...items].filter((item: Item) => item.gender === 'Male'));
  else
    return ([...items].filter((item: Item) => item.gender === 'Female'));
}
function discountSlider(search: string, discount: number, array: Item[]) {
  // Discount Slider
  if (search)
    return ([...array].filter((item: Item) => item.name.toLowerCase().includes(search) && item.discount >= discount));
  else
    return ([...array].filter((item: Item) => item.discount >= discount));
}
function searchInput(search: string, discount: number, items: Item[]) {
  if (search)
    return ([...items].filter((item: Item) => item.name.toLowerCase().includes(search)));
  else
    return ([...items].filter((item: Item) => item.discount >= discount));;
}

export default function App() {

  const dispatch = useDispatch();
  const filterStore = useSelector((state: any) => state.filterStore);
  const { search, discount, discountHighToLow, priceHighToLow, gender } = filterStore;

  let [searchParams,] = useSearchParams();
  let urlSort = searchParams.get("sort") || '';

  const [, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setFilteredItems(priceSort(priceHighToLow, filteredItems));
  }, [priceHighToLow]);

  useEffect(() => {
    setFilteredItems(discountSort(discountHighToLow, filteredItems));
  }, [discountHighToLow]);

  // Gender -> male = true, female = false
  useEffect(() => {
    setFilteredItems(genderSort(gender, filteredItems));
  }, [gender]);

  useEffect(() => {
    setFilteredItems(discountSlider(search, discount, filteredItems));
  }, [discount]);

  useEffect(() => {
    setFilteredItems(searchInput(search, discount, filteredItems));
  }, [search]);


  function initialSortOptions(url: string, items: Item[]) {
    // For initial loading based on URL input. eg http://localhost:3000/?sort=price-low-to-high or assign default (discount high to low)
    if (url === Sort.priceHighToLow) {
      setFilteredItems(priceSort(true, items));
      dispatch(filterActions.setPriceHighToLow(true));
    }
    else if (url === Sort.priceLowToHigh) {
      setFilteredItems(priceSort(false, items));
      dispatch(filterActions.setPriceHighToLow(false));
    }
    else if (url === Sort.discountHighToLow) {
      setFilteredItems(discountSort(true, items));
      dispatch(filterActions.setDiscountHighToLow(true));
    }
    else if (url === Sort.discountLowToHigh) {
      setFilteredItems(discountSort(false, items));
      dispatch(filterActions.setDiscountHighToLow(false));
    }
    else {
      setFilteredItems(items);
    }
    dispatch(filterActions.sortParams({ sort: url }));
  };

  // Fetching Data from the API
  useEffect(() => {
    setLoading(true);
    getItemsService()
      .then((items: Item[]) => {
        if (!items.length) {
          console.log(items, ' data is empty');
          setIsError(true);
        }
        setItems(items);
        initialSortOptions(urlSort, items);
      })
      .catch((err: any) => {
        console.log(err);
        setIsError(true);
      })
      .finally(() =>
        setLoading(false));
  }, []);


  return (
    <div className="App">
      <nav> <HeaderBar /></nav>
      {isError && <Error />}
      {!isError && <Filters />}
      {!isError && <ItemTable items={filteredItems} isLoading={loading} />}
    </div>
  );
}

