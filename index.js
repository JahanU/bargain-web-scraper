// libs
const express = require('express');
const cheerio = require('cheerio'); // JQuery under the hood
const axios = require('axios');
const app = express();
require('dotenv').config()

// classes
const urls = require('./logic/urls');
const filterData = require('./logic/filterData');
const telegram = require('./logic/telegram');


var allBestItems = new Map();
getItems();

setInterval(getItems, 60 * 1000);
setInterval(resetCache, 21600 * 1000) // reset cache every 6h

function getItems() {
    console.log(new Date().toLocaleString());

    let links = Object.values(urls.URLS);
    links.forEach((link) => {
        axios.get(link).then((response) => {
            let items = [];
            const html = response.data;
            const $ = cheerio.load(html); // can now access all html elements via cheerio api

            $('.productListItem').each((index, element) => {
                let discount = $(element).find('.sav').text().trim().substring(5, 6); // Just get the tenth column number
                if (discount < 5) return; // don't care about items with less than 50% discount
                discount *= 10;

                let itemName = $(element).find('.itemTitle').text().trim().toLowerCase();
                if (filterData.removeUnneededItem(itemName)) return; // Don't like item, continue searching

                let url = urls.JD + $(element).find('a').attr('href');
                let imageUrl = $(element).find('source').attr('data-srcset').split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                let wasPrice = $(element).find('.was').text().substring(3).trim();
                let nowPrice = $(element).find('.now').text().substring(3).trim();

                items.push({ itemName, wasPrice, nowPrice, discount, url, imageUrl });
            });
            if (!items.length) throw new Error('Item length from .productListItem is 0');
            return items;

        }).then(async (items) => {
            const detailedItems = await getStockAndSize(items);
            if (!detailedItems) throw new Error('DetailedItems length is 0, nothing in stock');
            return detailedItems;

        }).then((detailedItems) => {
            const newItems = cacheDeals(detailedItems);
            sendDeals(newItems);

        }).catch(err => console.log(`${err.name}, in getItems():  ${err.message}`));
    });
}


async function getStockAndSize(items) { // get size and if in stock, remove those not in stock

    let stockedItems = [];

    for await (const item of items) {
        await axios.get(item.url).then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);

            // get stock
            const inStock = $('meta')[28].attribs.content;
            // if (inStock === 'OUT OF STOCK') throw new Error(`${item.itemName} Out of stock`);
            if (inStock === 'OUT OF STOCK') return;
            // get sizes
            const objectStr = $('script')[3].children[0].data;
            const regex = /name:("\w+")/g;
            const sizes = [...objectStr.matchAll(regex)].map(item => item[1].substring(1, item[1].length - 1));

            stockedItems.push({ ...item, inStock, sizes });

        }).catch(err => console.log(`${err.name}, in getStockAndSize():  ${err.message}`));
    }
    console.log('new Items: ', stockedItems);
    return stockedItems;
}

sortByDiscount = (items) => items?.sort((a, b) => a.discount - b.discount);

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