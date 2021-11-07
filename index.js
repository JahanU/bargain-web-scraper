const express = require('express');
const cheerio = require('cheerio'); // JQuery under the hood
const axios = require('axios');
require('dotenv').config()

const urls = require('./logic/urls');
const filterData = require('./logic/filterData');
const telegram = require('./logic/telegram');

const app = express();

var allBestItems = new Map();

// Testing this out
// getInStock('https://www.jdsports.co.uk/product/blue-columbia-assent-t-shirt/16088262/');
// getInStock('https://www.jdsports.co.uk/product/blue-nike-just-do-it-swoosh-t-shirt/16169321/');

getItems();

setInterval(getItems, 45 * 1000);
setInterval(resetCache, 18000 * 1000) // reset cache every 5h

function getItems() {
    let links = Object.values(urls.URLS);
    links.forEach((url) => {
        axios(url)
            .then((response) => {
                let items = [];
                const html = response.data;
                const $ = cheerio.load(html); // can now access all html elements via cheerio api

                $('.productListItem').each((index, element) => {

                    let itemName = $(element).find('.itemTitle').text().trim().toLowerCase();
                    if (filterData.removeUnneededItem(itemName)) return; // Don't like item, continue searching

                    let url = urls.JD + $(element).find('a').attr('href');
                    // if (!getInStock(url)) return;

                    let imageUrl = $(element).find('source').attr('data-srcset').split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                    let wasPrice = $(element).find('.was').text().substring(3).trim();
                    let nowPrice = $(element).find('.now').text().substring(3).trim();
                    let discount = $(element).find('.sav').text().trim().substring(5, 7);

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

function getInStock(itemUrl) {

    axios(itemUrl).
        then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);

            $('h3').each((index, element) => {

                console.log($(element).text().trim());
            });

            // $('#itemOptions').each((index, element) => {

            //     let x = $(element).attr('data-stock');
            //     let y = $(element).find('div').attr('data-stock');

            //     console.log(index, x, y);
            // });
        });

}

getBestDeals = (items) => items.filter((item) => item.discount >= 60).sort((a, b) => a.discount - b.discount);

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

function resetCache() {
    allBestItems = new Map();
}

const PORT = 8000;
app.listen(PORT, () => console.log(`listening on port: ${PORT}`));