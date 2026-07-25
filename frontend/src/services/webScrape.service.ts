import Item from '../interfaces/Item';
// import mockData from './mock-data.json'; // Import the data 

const BASE_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : 'https://bargain-web-scraper-8bbn.onrender.com';

const getItemsService = async (): Promise<Item[]> => {
    const url = `${BASE_URL}/webscrape/getBestDeals`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
};

// const getItemsService = async (): Promise<Item[]> => mockData;

export { getItemsService };
