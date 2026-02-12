import Item from '../interfaces/Item';
// import mockData from './mock-data.json'; // Import the data 

const getItemsService = async (): Promise<Item[]> => {
    // const url = 'https://bargain-scraper-710da0f863f3.herokuapp.com/webscrape/getBestDeals';
    const url = 'http://localhost:8000/webscrape/getBestDeals';
    const response = await fetch(url);
    const data = await response.json();
    return data;
};

// const getItemsService = async () => mockData;

export { getItemsService };
