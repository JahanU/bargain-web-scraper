/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import './App.css';
import { getItemsService } from './services/webScrape.service'
import ItemTable from './component/table/ItemTable';
import Item from './interfaces/Item';
import HeaderBar from './component/header/HeaderBar';
import Error from './component/modal/Error';
import { useSelector } from 'react-redux';

export default function App() {

  const filterStore = useSelector((state: any) => state.filterStore);
  console.log(filterStore);
  const { search, latest, discountHighToLow, priceHighToLow } = filterStore;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  console.log(items);

  useEffect(() => {
    if (discountHighToLow)  // Sort Desc
      setItems([...items].sort((a, b) => b.discount - a.discount));
    else
      setItems([...items].sort((a, b) => a.discount - b.discount))
  }, [discountHighToLow]);

  useEffect(() => {
    if (priceHighToLow)  // Sort Desc // TODO: Parse type for quick fix until backend is updated
      setItems([...items].sort((a, b) => parseInt(b.nowPrice.substring(1)) - parseInt(a.nowPrice.substring(1))));
    else
      setItems([...items].sort((a, b) => parseInt(a.nowPrice.substring(1)) - parseInt(b.nowPrice.substring(1))));
  }, [priceHighToLow]);

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
      })
      .catch((err: any) => {
        console.log(err);
        setIsError(true);
      })
      .finally(() =>
        setLoading(false));
  }, [])


  const onSliderChange = (discount: number) => {
    setItems(items.filter((item: Item) => item.discount >= discount));
  }

  return (
    <div className="App">
      <HeaderBar onSliderChange={onSliderChange} />
      {isError && <Error />}
      {!isError && <ItemTable items={items} isLoading={loading} />}
    </div>
  );
}

