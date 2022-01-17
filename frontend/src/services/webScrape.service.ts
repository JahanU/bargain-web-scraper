


const getItemsService = async () => {

    const url = 'http://localhost:8000/webscrape/getBestDeals';
    return fetch(url)
        .then((response) => response.json())
        .then((data) => data)
        .catch((error) => console.error(error));

};

export { getItemsService };