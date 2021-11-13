const express = require('express');
const cheerio = require('cheerio'); // JQuery under the hood
const axios = require('axios');
require('dotenv').config()

const urls = require('./logic/urls');
const filterData = require('./logic/filterData');
const telegram = require('./logic/telegram');
const { children } = require('cheerio/lib/api/traversing');

const app = express();

console.log('---------------')
console.log('---------------')
console.log('---------------\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n')


// let d = parsedHTML('script')[2].children[0].data;
// const regex = /name:("\w{1,3}")/g;
// const sizes = [...d.matchAll(regex)];
// console.log(sizes);

var allBestItems = new Map();

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

checkInStock([]);
async function checkInStock(items) { // get size and if in stock, remove those not in stock

    const test = {
        url: 'https://www.jdsports.co.uk/product/white-nike-2-pack-lounge-t-shirts/16033100/'
        // url: 'https://www.jdsports.co.uk/product/adidas-wales-2020-home-goalkeeper-shorts/15963545/',
        // url: 'https://www.jdsports.co.uk/product/black-nike-futura-short-sleeve-t-shirt/1314199/'
    }
    items.push(test);

    let stockedItems = [];
    for await (const item of items) {
        await axios.get(item.url).then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);

            // console.log('product:...', item.url);
            // let product = $('#productSizeStock')?.children()[0].attribs;
            // // let product = $('#productSizeStock').find('button').text();
            // // let product2 = $('#productSizeStock').find('button').next().text();
            // // console.log('product: ', product)
            // // console.log('product2: ', product2)

            const objectStr = $('script')[3].children[0].data;
            console.log(objectStr);
            const regex = /name:("\w{1,3}")/g;
            const sizes = [...objectStr.matchAll(regex)].map(item => item[1]);
            console.log(sizes);


            stockedItems.push({
                itemName: item.itemName,
                wasPrice: item.wasPrice,
                nowPrice: item.nowPrice,
                discount: item.discount,
                url: item.url,
                imageUrl: item.imageUrl,
                // size: product['title']
            });
        });

        console.log('new Items: ', stockedItems);
        return stockedItems;
    }
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