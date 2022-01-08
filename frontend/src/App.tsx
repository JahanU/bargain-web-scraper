import React, { useEffect, useState } from 'react';
import './App.css';
import { getItemsService } from './services/webScrape.service'
import ItemTable from './component/ItemTable';
import Item from './interfaces/Item';
import HeaderBar from './component/HeaderBar';

export default function App() {

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getItemsService()
      .then((items: any) => setItems(items))
      .catch((err: any) => console.log('err: ', err))
      .finally(() => setLoading(false));
  }, []) // Whenever items change

  const onSliderChange = (discount: number) => {
    console.log(discount + ' from slider change');
    setFilteredItems(items.filter((item: Item) => item.discount >= discount));
  }

  return (
    <div className="App">
      <HeaderBar onSliderChange={onSliderChange} />
      <ItemTable items={filteredItems ? filteredItems : items} isLoading={loading} />
    </div>
  );
}

