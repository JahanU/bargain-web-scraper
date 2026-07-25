import Item from '../interfaces/Item';

const getItemsService = async (): Promise<Item[]> => {
    const isLocal = process.env.NODE_ENV === 'development';
    const baseUrl = isLocal
        ? 'http://localhost:8000'
        : 'https://bargain-web-scraper-8bbn.onrender.com';

    const url = `${baseUrl}/webscrape/getBestDeals`;

    const response = await fetch(url);
    const data = await response.json();
    return data;
};

export { getItemsService };
