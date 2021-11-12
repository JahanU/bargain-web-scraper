const express = require('express');
const cheerio = require('cheerio'); // JQuery under the hood
const axios = require('axios');
require('dotenv').config()

const urls = require('./logic/urls');
const filterData = require('./logic/filterData');
const telegram = require('./logic/telegram');
const { children } = require('cheerio/lib/api/traversing');

const app = express();

var allBestItems = new Map();

console.log('---------------')
console.log('---------------')
console.log('---------------')


checkInStock([]);

// getItems();

// setInterval(getItems, 45 * 1000);
// setInterval(resetCache, 18000 * 1000) // reset cache every 5h

function getItems() {
    let links = Object.values(urls.URLS);

    axios.get(urls.URLS.allMen).then((response) => {
        let items = [];
        const html = response.data;
        const $ = cheerio.load(html); // can now access all html elements via cheerio api

        $('.productListItem').each(async (index, element) => {

            let discount = $(element).find('.sav').text().trim().substring(5, 7);
            if (discount < 65) return; // don't care about items with less than 65% discount

            let itemName = $(element).find('.itemTitle').text().trim().toLowerCase();
            if (filterData.removeUnneededItem(itemName)) return; // Don't like item, continue searching

            let url = urls.JD + $(element).find('a').attr('href');
            let imageUrl = $(element).find('source').attr('data-srcset').split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
            let wasPrice = $(element).find('.was').text().substring(3).trim();
            let nowPrice = $(element).find('.now').text().substring(3).trim();

            items.push({ itemName, wasPrice, nowPrice, discount, url, imageUrl });
        });
        return items;

    }).then(async (items) => {

        const stockedItems = await checkInStock(items);
        const newItems = cacheDeals(stockedItems);
        sendDeals(newItems);

    }).catch(err => console.log(err));
}

async function checkInStock(items) { // get size and if in stock, remove those not in stock

    const test = {
        url: 'https://www.jdsports.co.uk/product/blue-nike-academy-shield-t-shirt/16189460/',
        // url: 'https://www.jdsports.co.uk/product/grey-fred-perry-taped-ringer-t-shirt/16136437/'
    }
    items.push(test);

    let stockedItems = [];
    for await (const item of items) {
        await axios.get(item.url).then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);

            console.log('product:...', item.url);
            let product = $('#productSizeStock')?.children()[1]?.attribs;

            console.log('product: ', product);
            console.log('product children: ', $('#productSizeStock')?.children().length);

            if (!product) return;

            console.log(product['title'], product['data-stock']);

            stockedItems.push({
                itemName: item.itemName,
                wasPrice: item.wasPrice,
                nowPrice: item.nowPrice,
                discount: item.discount,
                url: item.url,
                imageUrl: item.imageUrl,
                // size: product['title'].split(' ')[2] // => e.g. "Select Size M"
            });
        });
    };

    console.log('new Items: ', stockedItems);
    return stockedItems;
}

getBestDeals = (items) => items.sort((a, b) => a.discount - b.discount);

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