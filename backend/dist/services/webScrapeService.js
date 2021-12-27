"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable newline-per-chained-call */
// const cheerio = require('cheerio'); // JQuery under the hood
const cheerio_1 = __importDefault(require("cheerio"));
const axios = require('axios');
const filterData = require('../helper/filterData');
const telegram = require('./telegramService');
let allBestItems = new Map();
function main() {
    startScraping();
    setInterval(startScraping, 60 * 1000);
    setInterval(resetCache, 21600 * 1000); // reset cache every 6h
}
function startScraping() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const JDItems = yield getJDItems();
            const newItems = cacheDeals(JDItems);
            sendDeals(newItems);
        }
        catch (err) {
            console.log(err, 'error in startScraping()');
        }
    });
}
function getJDItems() {
    const JD = 'https://www.jdsports.co.uk';
    // JD_ALL_MEN, SHOES 
    const urls = [
        'https://www.jdsports.co.uk/men/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,tommy-hilfiger,calvin-klein-underwear,levis,columbia,jordan,emporio-armani-ea7,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics/sale/?sort=price-low-high&max=200',
        'https://www.jdsports.co.uk/men/mens-footwear/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,vans,tommy-hilfiger,calvin-klein-underwear,levis,columbia,reebok,jordan,fila,emporio-armani-ea7,puma,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics,converse/sale/?max=100&sort=price-low-high&max=200'
    ];
    return new Promise((resolve, reject) => {
        urls.forEach((url) => {
            axios.get(url).then((response) => {
                const items = [];
                const html = response.data;
                const $ = cheerio_1.default.load(html); // can now access all html elements via cheerio api
                $('.productListItem').each((index, element) => {
                    var _a;
                    let discount = parseInt($(element).find('.sav').text().trim().substring(5, 7)); // Just get the tenth column number
                    if (discount < 50)
                        return; // don't care about items with less than 50% discount
                    const name = $(element).find('.itemTitle').text().trim().toLowerCase();
                    if (filterData(name))
                        return; // Don't like item, continue searching
                    const url = JD + $(element).find('a').attr('href');
                    const imageUrl = (_a = $(element).find('source').attr('data-srcset')) === null || _a === void 0 ? void 0 : _a.split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                    const wasPrice = $(element).find('.was').text().substring(3).trim();
                    const nowPrice = $(element).find('.now').text().substring(3).trim();
                    items.push({ name, wasPrice, nowPrice, discount, url, imageUrl });
                });
                if (!items.length)
                    console.error('No items found from JD');
                return items;
            }).then((items) => __awaiter(this, void 0, void 0, function* () {
                const detailedItems = yield getStockAndSize(items);
                if (!detailedItems)
                    console.error('Nothing in stock');
                return resolve(detailedItems);
            })).catch((err) => {
                console.error(err);
                return reject(err);
            });
        });
    });
}
function getStockAndSize(items) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            Promise.all(items.map((item) => __awaiter(this, void 0, void 0, function* () {
                const html = yield axios.get(item.url);
                const $ = cheerio_1.default.load(html.data);
                // get stock
                const metaTag = $('meta')[28];
                const inStock = metaTag.attribs.content;
                if (inStock === 'OUT OF STOCK')
                    return;
                // get sizes
                const scriptTag = $('script')[3];
                const objectStr = scriptTag.children[0].data;
                const regex = /name:("\w+")/g;
                const sizes = [...objectStr.matchAll(regex)].map((i) => i[1].substring(1, i[1].length - 1));
                if (!sizes.length)
                    return;
                return Object.assign(Object.assign({}, item), { sizes, inStock });
            }))).then((items) => {
                return resolve(items.filter((item) => item !== undefined));
            }).catch((err) => {
                console.error(err);
                return reject(err);
            });
        });
    });
}
function cacheDeals(newBestDeals) {
    const newItems = [];
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
    if (newDeals.length === 0) {
        console.log('no new items');
    }
    else {
        console.log('got new items!: ', newDeals);
        telegram.sendPhotosToUsers(newDeals);
    }
}
function resetCache() {
    allBestItems = new Map();
}
const getBestDeals = () => allBestItems;
module.exports = { main, getBestDeals };
