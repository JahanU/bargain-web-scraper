const getItemsService = async () => {

    const url = process.env.REACT_APP_BACKEND_URL + '/webscrape/getBestDeals';
    // const url = 'http://localhost:8000/webscrape/getBestDeals';

    return fetch(url)
        .then((response) => response.json())
        .catch((error) => console.error(error));

};

export { getItemsService };
