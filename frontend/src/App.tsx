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
      .then((items: any) => {
        console.log(items);
        setItems(items);
      })
      .catch((err: any) => console.log('err: ', err))
      .finally(() => setLoading(false));
  }, []) // Whenever items change

  useEffect(() => {
    console.log('fittered Items; ', filteredItems);
  }, [filteredItems]);


  const onSliderChange = (discount: number) => {
    console.log('onslider');
    setFilteredItems(items.filter((item: Item) => item.discount >= discount));
  }

  return (
    <div className="App">
      <HeaderBar onSliderChange={onSliderChange} />
      {!filteredItems.length && <ItemTable items={items} isLoading={loading} />}
      {filteredItems.length && <ItemTable items={filteredItems} isLoading={loading} />}

    </div>
  );
}

