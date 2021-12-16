import React, { useEffect, useState } from 'react';
import { getItems } from '../services/webScrape.service';
import ItemCard from './ItemCard';
import Item from '../interfaces/Item';


function ItemTable(props: any) {

    const [items, setItems] = useState([]);

    useEffect(() => {
        console.log('in useEffect');
        // HTTP request
        getItems().then((items: any) => {
            console.log('res: ', items);
            setItems(items);
        }).catch((err: any) => console.log('err: ', err));
        return () => { } // cleanup
    }, []) // Whenever items change

    return (
        <>
            <div className="bg-white">
                <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
                    <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Latest Picks</h2>
                    <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                        {items.map((item: any) => <ItemCard key={item[0]} item={item} />)}
                    </div>
                </div>
            </div>
        </>
    )
}

export default ItemTable;
