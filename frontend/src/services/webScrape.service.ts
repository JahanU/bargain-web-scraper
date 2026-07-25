import Item from '../interfaces/Item';
// import mockData from './mock-data.json'; // Import the data 

const BASE_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : 'https://bargain-web-scraper-8bbn.onrender.com';

// Older backends sent prices as formatted strings ("£10.00"). Coerce here so a backend
// that has not been redeployed yet cannot turn every price into NaN downstream.
const toPrice = (value: unknown): number =>
    typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;

const getItemsService = async (): Promise<Item[]> => {
    const url = `${BASE_URL}/webscrape/getBestDeals`;
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data)) {
        return data;
    }

    return data.map((item: Item) => ({
        ...item,
        wasPrice: toPrice(item.wasPrice),
        nowPrice: toPrice(item.nowPrice),
    }));
};

// const getItemsService = async (): Promise<Item[]> => mockData;

export { getItemsService };
