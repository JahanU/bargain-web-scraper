/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import './App.css';
import { getItemsService } from './services/webScrape.service'
import ItemTable from './component/table/ItemTable';
import Item from './interfaces/Item';
import HeaderBar from './component/header/HeaderBar';
import Error from './component/modal/Error';
import { useSelector } from 'react-redux';
import Filters from './component/filter/Filters';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Outlet,
  useSearchParams,
} from "react-router-dom";

export default function App() {

  let [searchParams, setSearchParams] = useSearchParams();

  const filterStore = useSelector((state: any) => state.filterStore);
  const { search, discount, discountHighToLow, priceHighToLow, gender } = filterStore;

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Discount Slider
  useEffect(() => {
    if (search) {
      setFilteredItems(items.filter((item: Item) => item.name.toLowerCase().includes(search) && item.discount >= discount));
    }
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
    if (priceHighToLow)  // Sort Desc // TODO: Parse type for quick fix until backend is updated
      setFilteredItems([...filteredItems].sort((a, b) => parseInt(b.nowPrice.substring(1)) - parseInt(a.nowPrice.substring(1))));
    else
      setFilteredItems([...filteredItems].sort((a, b) => parseInt(a.nowPrice.substring(1)) - parseInt(b.nowPrice.substring(1))));
  }, [priceHighToLow]);

  // Gender -> male = true, female = false
  useEffect(() => {
    if (gender)
      setFilteredItems([...items].filter((item: Item) => item.gender === 'Male'));
    else
      setFilteredItems([...items].filter((item: Item) => item.gender === 'Female'));

  }, [gender]);

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
        setFilteredItems(items);
      })
      .catch((err: any) => {
        console.log(err);
        setIsError(true);
      })
      .finally(() =>
        setLoading(false));
  }, [])


  return (
    <div className="App">


      <label>Input
        <input style={{ borderWidth: '2px' }}
          value={searchParams.get("filter") || ""}
          onChange={(event) => {
            let filter = event.target.value;
            console.log(filter);
            if (filter) {
              setSearchParams({ filter });
            } else {
              setSearchParams({});
            }
          }}
        />
      </label>

      <nav> <HeaderBar /></nav>

      {/* <Link to="/expenses">Expenses</Link> */}

      {isError && <Error />}
      {!isError && <Filters />}
      {!isError && <ItemTable items={filteredItems} isLoading={loading} />}
    </div>
  );
}

