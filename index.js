const express = require('express');
const cheerio = require('cheerio'); // JQuery under the hood
const axios = require('axios');

const app = express();
const PORT = 8000;

const url = 'https://www.jdsports.co.uk/men/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,tommy-hilfiger,calvin-klein-underwear,columbia,emporio-armani-ea7,berghaus,polo-ralph-lauren,boss,levis,fred-perry,asics/sale/?sort=price-low-high';

axios(url)
    .then(response => {
        const allItems = [];
        const html = response.data;
        const $ = cheerio.load(html); // can now access all html elements via cheerio api

        $('.productListItem').each((index, element) => {

            const url = $(element).find('a').attr('href');
            const itemName = $(element).find('.itemTitle').text().trim();
            const wasPrice = $(element).find('.was').text().substring(3).trim();
            const nowPrice = $(element).find('.now').text().substring(3).trim();
            const discount = $(element).find('.sav').text().trim();

            allItems.push({
                itemName,
                wasPrice,
                nowPrice,
                discount,
                url,
            });
        });


        console.log(allItems);

    }).catch(err => console.log(err));


// TODO remove unneeded elements (football t shirts, caps etc)
// TODO Create highest discount filter/sort
// TODO Ping (telegram bot) when discount is v high (say 75%+)
// 

app.listen(PORT, () => console.log(`listening on port: ${PORT}`));