


const getItems = () => {
    // Where we're fetching data from
    // return fetch("https://api.github.com/users/jahanu")

    const url = 'http://localhost:8000/webscrape/getBestDeals';

    return fetch(url)
        // We get the API response and receive data in JSON format
        .then((response) => response.json())
        .then((data) => data)
        .catch((error) => console.error(error));
};


export { getItems };

// DUMMY DATA
// [
//     [
//         "https://www.jdsports.co.uk/product/grey-adidas-tech-joggers/16211055/",
//         {
//             "name": "adidas tech joggers",
//             "wasPrice": "£60.00",
//             "nowPrice": "£55.00",
//             "discount": 80,
//             "url": "https://www.jdsports.co.uk/product/grey-adidas-tech-joggers/16211055/",
//             "imageUrl": "https://i8.amplience.net/t/jpl/jd_product_list?plu=jd_466294_al&qlt=92&w=726&h=726&v=1&fmt=auto",
//             "sizes": [
//                 "XS",
//                 "S",
//                 "M",
//                 "L",
//                 "XL",
//                 "XXL"
//             ]
//         }
//     ],
//     [
//         "https://www.jdsports.co.uk/product/brown-adidas-originals-handball-spezial/16052400/",
//         {
//             "name": "adidas originals handball spezial",
//             "wasPrice": "£75.00",
//             "nowPrice": "£70.00",
//             "discount": 70,
//             "url": "https://www.jdsports.co.uk/product/brown-adidas-originals-handball-spezial/16052400/",
//             "imageUrl": "https://i8.amplience.net/t/jpl/jd_product_list?plu=jd_388209_al&qlt=92&exclusive=1&wid=726&hei=726&v=1&fmt=auto",
//             "sizes": [
//                 "6",
//                 "7"
//             ]
//         }
//     ],
//     [
//         "https://www.jdsports.co.uk/product/black-boss-hadiko-pixel-joggers/16205168/",
//         {
//             "name": "boss hadiko pixel joggers",
//             "wasPrice": "£130.00",
//             "nowPrice": "£120.00",
//             "discount": 80,
//             "url": "https://www.jdsports.co.uk/product/black-boss-hadiko-pixel-joggers/16205168/",
//             "imageUrl": "https://i8.amplience.net/t/jpl/jd_product_list?plu=jd_468489_al&qlt=92&w=726&h=726&v=1&fmt=auto",
//             "sizes": [
//                 "S",
//                 "M"
//             ]
//         }
//     ]
// ]
