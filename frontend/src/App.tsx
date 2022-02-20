/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import './App.css';
import { getItemsService } from './services/webScrape.service'
import ItemTable from './component/table/ItemTable';
import Item from './interfaces/Item';
import HeaderBar from './component/header/HeaderBar';
import Error from './component/modal/Error';
import { useSelector } from 'react-redux';
import Filters from './component/table/Filters';

export default function App() {

  const filterStore = useSelector((state: any) => state.filterStore);
  const { search, discount, discountHighToLow, priceHighToLow } = filterStore;

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Discount Slider
  useEffect(() => {
    setFilteredItems(items.filter((item: Item) => item.discount >= discount));
  }, [discount]);

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

  // Search Input
  useEffect(() => {
    if (search)
      setFilteredItems([...filteredItems].filter((item) => item.name.toLowerCase().includes(search)));
    else
      setFilteredItems([...items].filter((item: Item) => item.discount >= discount));
  }, [search]);


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


  // const onSliderChange = (discount: number) => {
  //   setFilteredItems(items.filter((item: Item) => item.discount >= discount));
  // }

  return (
    <div className="App">
      <HeaderBar />
      {isError && <Error />}
      <Filters />
      {!isError && <ItemTable items={filteredItems} isLoading={loading} />}
    </div>
  );
}

