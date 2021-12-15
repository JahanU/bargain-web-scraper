import React, { useState } from 'react';
import './App.css';
import Table from './Table';


const tempItem = [
  { name: 'nike', price: 20, link: 'http://nike' },
  { name: 'addidas', price: 30, link: 'http://addias' },
  { name: 'levi', price: 30, link: 'http://levi' },
  { name: 'amrani', price: 50, link: 'http://amrani' },
]

function App() {

  const [items, setItems] = useState(tempItem);

  return (
    <div className="App">
      <Table items={items} />
    </div>
  );
}

export default App;
