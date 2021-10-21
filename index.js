const express = require('express');
const cheerio = require('cheerio'); // JQuery under the hood
const axios = require('axios');
require('dotenv').config()

const urls = require('./logic/urls');
const filterData = require('./logic/filterData');
const telegram = require('./logic/telegram');

const app = express();

setInterval(() => getItems(urls.all), 10 * 1000);

function getItems(url) {
    console.log(new Date().getTime().toLocaleString());
    axios(url)
        .then(response => {
            let allItems = [];
            const html = response.data;
            const $ = cheerio.load(html); // can now access all html elements via cheerio api

            $('.productListItem').each((index, element) => {

                let url = urls.JD + $(element).find('a').attr('href');
                let imageUrl = $(element).find('source').attr('data-srcset').split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                let itemName = $(element).find('.itemTitle').text().trim().toLowerCase();
                let wasPrice = $(element).find('.was').text().substring(3).trim();
                let nowPrice = $(element).find('.now').text().substring(3).trim();
                let discount = $(element).find('.sav').text().trim().substring(5, 7);

                if (filterData.removeUnnecessaryItem(itemName)) return; // Don't like item, continue searching

                allItems.push({
                    itemName,
                    wasPrice,
                    nowPrice,
                    discount,
                    url,
                    imageUrl
                });
            });

            // console.log(filterData.sortByDiscount(allItems)); // personal use, logging
            // if (!foundNewItems()) return; 

            sendBestDeals(allItems);

        }).catch(err => console.log(err));
}

// Items with a discount >= 75%
function sendBestDeals(allItems) {
    const bestDeals = allItems.filter((item) => item.discount > 70).sort((a, b) => a.discount - b.discount)
    console.log('best deals are: ', bestDeals, 'total: ', bestDeals.length);
    telegram.sendPhotosToBot(bestDeals);
}

const PORT = 8000;
app.listen(PORT, () => console.log(`listening on port: ${PORT}`));