import Item from "../interfaces/Item";

const getItemsService = async () => {

    const url = 'https://bargain-scraper.herokuapp.com/webscrape/getBestDeals';
    // const url = 'http://localhost:8000/webscrape/getBestDeals';

    return fetch(url)
        .then((response) => response.json())
        .then((arr: Item[]) => arr.filter((arr, index, self) => index === self.findIndex((t: Item) => (t.url === arr.url))))
        .catch((error) => console.error(error));

};

export { getItemsService };
