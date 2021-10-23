const express = require('express');
const cheerio = require('cheerio'); // JQuery under the hood
const axios = require('axios');
require('dotenv').config()

const urls = require('./logic/urls');
const filterData = require('./logic/filterData');
const telegram = require('./logic/telegram');

const app = express();

var allBestItems = new Map();

getItems(); // first init 

setInterval(getItems, 60 * 1000);

function getItems() {
    let links = Object.values(urls.URLS);
    links.forEach((url) => {
        axios(url)
            .then(response => {
                let items = [];
                const html = response.data;
                const $ = cheerio.load(html); // can now access all html elements via cheerio api

                $('.productListItem').each((index, element) => {

                    let url = urls.URLS.jd + $(element).find('a').attr('href');
                    let imageUrl = $(element).find('source').attr('data-srcset').split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                    let itemName = $(element).find('.itemTitle').text().trim().toLowerCase();
                    let wasPrice = $(element).find('.was').text().substring(3).trim();
                    let nowPrice = $(element).find('.now').text().substring(3).trim();
                    let discount = $(element).find('.sav').text().trim().substring(5, 7);

                    if (filterData.removeUnnecessaryItem(itemName)) return; // Don't like item, continue searching

                    items.push({
                        itemName,
                        wasPrice,
                        nowPrice,
                        discount,
                        url,
                        imageUrl
                    });
                });

                const newItems = cacheDeals(getBestDeals(items));
                sendDeals(newItems);
            }).catch(err => console.log(err));
    });
}


getBestDeals = (items) => items.filter((item) => item.discount > 65).sort((a, b) => a.discount - b.discount);

function cacheDeals(newBestDeals) { // don't send items we have already seen
    let newItems = [];
    newBestDeals.forEach((item) => {
        if (!allBestItems.has(item.url)) { // found new item!
            newItems.push(item);
        }
        allBestItems.set(item.url, item);
    });
    console.log('all best deals: ', allBestItems);

    return newItems;
}

function sendDeals(newDeals) {
    console.log(new Date().toLocaleString());
    if (newDeals.length == 0) {
        console.log('no new items');
        return;
    }
    else {
        console.log('got new items!: ', newDeals);
        telegram.sendPhotosToBot(newDeals);
    }

}


const PORT = 8000;
app.listen(PORT, () => console.log(`listening on port: ${PORT}`));