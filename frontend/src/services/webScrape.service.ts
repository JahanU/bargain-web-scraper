import Item from "../interfaces/Item";
import mockData from './mock-data.json'; // Import the data 

// const getItemsService = async () => {

//     // const url = 'https://bargain-scraper-710da0f863f3.herokuapp.com/webscrape/getBestDeals';
//     const url = 'http://localhost:8000/webscrape/getBestDeals';

//     return fetch(url)
//     .then((response) => response.json())
//     .then((arr: Item[]) => arr.filter((arr, index, self) => index === self.findIndex((t: Item) => (t.url && t.url === arr.url))))
//     .catch((error) => console.error(error));
// };

const getItemsService = async () => mockData;

export { getItemsService };
