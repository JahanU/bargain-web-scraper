/* eslint-disable newline-per-chained-call */
// const cheerio = require('cheerio'); // JQuery under the hood
import cheerio, { xml } from 'cheerio';
const axios = require('axios');

const urls = require('../helper/urls');
const filterData = require('../helper/filterData');
const telegram = require('./telegramService');

import { Item } from "../interfaces/Item";

let allBestItems = new Map();

module.exports = () => { // main method
    getItems();
    setInterval(getItems, 60 * 1000);
    setInterval(resetCache, 21600 * 1000); // reset cache every 6h
};

function getItems() {
    console.log(new Date().toLocaleString());
    const links = Object.values(urls);

    links.forEach((link) => {
        axios.get(link).then((response: cheerio.Element) => {
            const items: Item[] = [];
            const html: cheerio.Element['data'] = response.data!;
            const $ = cheerio.load(html); // can now access all html elements via cheerio api

            $('.productListItem').each((index, element) => {
                let discount = parseInt($(element).find('.sav').text().trim().substring(5, 6)); // Just get the tenth column number
                if (discount < 5) return; // don't care about items with less than 50% discount
                discount *= 10;

                const name = $(element).find('.itemTitle').text().trim().toLowerCase();
                if (filterData(name)) return; // Don't like item, continue searching

                const url = urls.JD + $(element).find('a').attr('href');
                const imageUrl = $(element).find('source').attr('data-srcset')?.split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                const wasPrice = $(element).find('.was').text().substring(3).trim();
                const nowPrice = $(element).find('.now').text().substring(3).trim();

                items.push({
                    name, wasPrice, nowPrice, discount, url, imageUrl,
                });
            });
            if (!items.length) console.error('Item length from .productListItem is 0');
            return items;
        }).then(async (items: Item[]) => {
            const detailedItems = await getStockAndSize(items);
            if (!detailedItems) console.error('DetailedItems length is 0, nothing in stock');
            return detailedItems;
        }).then((detailedItems: Item[]) => {
            const newItems = cacheDeals(detailedItems);
            sendDeals(newItems);
        }).catch((err: Error) => console.error(`${err.name}, in getItems():  ${err.message}`));
    });
}

async function getStockAndSize(items: Item[]) { // get size and if in stock, remove those not in stock
    const stockedItems: Item[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of items) {
        await axios.get(item.url).then((response: cheerio.Element) => {
            const html = response.data!;
            const $ = cheerio.load(html);


            // get stock
            const metaTag = $('meta')[28] as cheerio.TagElement;
            const inStock = metaTag.attribs.content;
            if (inStock === 'OUT OF STOCK') return;

            // get sizes
            const scriptTag = $('script')[3] as cheerio.TagElement;
            const objectStr = scriptTag.children[0].data!;
            const regex = /name:("\w+")/g;
            const sizes = [...objectStr.matchAll(regex)].map((i) => i[1].substring(1, i[1].length - 1));

            stockedItems.push({ ...item, sizes });

        }).catch((err: Error) => console.log(`${err.name}, in getStockAndSize():  ${err.message}`));
    }
    console.log('new Items: ', stockedItems);
    return stockedItems;
}

// eslint-disable-next-line no-undef
const sortByDiscount = (items: Item[]) => items?.sort((a, b) => a.discount - b.discount);

function cacheDeals(newBestDeals: Item[]) { // don't send items we have already seen
    const newItems: Item[] = [];
    newBestDeals.forEach((item) => {
        if (!allBestItems.has(item.url)) { // found new item!
            newItems.push(item);
        }
        allBestItems.set(item.url, item);
    });
    console.log('all best deals: ', allBestItems);
    return newItems;
}

function sendDeals(newDeals: Item[]) {
    if (newDeals.length === 0) {
        console.log('no new items');
    } else {
        console.log('got new items!: ', newDeals);
        telegram.sendPhotosToUsers(newDeals);
    }
}

function resetCache() {
    allBestItems = new Map();
}
