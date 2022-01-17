


const getItemsService = async () => {

    const url = 'https://bargain-scraper.herokuapp.com/webscrape/getBestDeals';

    return fetch(url)
        .then((response) => response.json())
        .then((data) => data)
        .catch((error) => console.error(error));

};

export { getItemsService };