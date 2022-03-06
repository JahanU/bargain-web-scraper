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


function priceSort(filter: boolean, array: Item[]) {
  if (filter)   // Sort Desc // TODO: Parse type for quick fix until backend is updated
    return ([...array].sort((a, b) => parseInt(b.nowPrice.substring(1)) - parseInt(a.nowPrice.substring(1))));
  else
    return ([...array].sort((a, b) => parseInt(a.nowPrice.substring(1)) - parseInt(b.nowPrice.substring(1))));
}

export default function App() {

  const dispatch = useDispatch();
  const filterStore = useSelector((state: any) => state.filterStore);
  const { search, discount, discountHighToLow, priceHighToLow, gender, sort } = filterStore;

  let [searchParams, setSearchParams] = useSearchParams();
  let urlSort = searchParams.get("sort") || '';

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Discount Slider
  useEffect(() => {
    if (search)
      setFilteredItems(items.filter((item: Item) => item.name.toLowerCase().includes(search) && item.discount >= discount));
    else
      setFilteredItems(items.filter((item: Item) => item.discount >= discount));
  }, [discount]);

  // Search Input
  useEffect(() => {
    if (search)
      setFilteredItems([...filteredItems].filter((item) => item.name.toLowerCase().includes(search)));
    else
      setFilteredItems([...items].filter((item: Item) => item.discount >= discount));
  }, [search]);

  // Discount
  useEffect(() => {
    if (discountHighToLow)  // Sort Desc
      setFilteredItems([...filteredItems].sort((a, b) => b.discount - a.discount));
    else
      setFilteredItems([...filteredItems].sort((a, b) => a.discount - b.discount))
  }, [discountHighToLow]);

  // Price
  useEffect(() => {
    setFilteredItems(priceSort(priceHighToLow, filteredItems));
  }, [priceHighToLow]);

  // Gender -> male = true, female = false
  useEffect(() => {
    if (gender)
      setFilteredItems([...items].filter((item: Item) => item.gender === 'Male'));
    else
      setFilteredItems([...items].filter((item: Item) => item.gender === 'Female'));
  }, [gender]);

  // For initial loading based on URL input. eg http://localhost:3000/?sort=price-low-to-high
  function sortFromUrl(url: string) {
    if (url === Sort.priceHighToLow) dispatch(filterActions.setPriceHighToLow(true)); // state change isn't triggering
    if (url === Sort.priceLowToHigh) dispatch(filterActions.setPriceHighToLow(false));
    if (url === Sort.discountHighToLow) dispatch(filterActions.setDiscountHighToLow(true));
    if (url === Sort.discountLowToHigh) dispatch(filterActions.setDiscountHighToLow(false));
    dispatch(filterActions.sortSortParams({ sort: url }));
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

        console.log(urlSort);
        console.log(sort);

        sortFromUrl(urlSort);
        setFilteredItems(priceSort(false, items));

        // setFilteredItems(items);

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

