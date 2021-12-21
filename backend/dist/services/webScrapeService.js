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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable newline-per-chained-call */
// const cheerio = require('cheerio'); // JQuery under the hood
const cheerio_1 = __importDefault(require("cheerio"));
const axios = require('axios');
const urls = require('../helper/urls');
const filterData = require('../helper/filterData');
const telegram = require('./telegramService');
let allBestItems = new Map();
function startScraping() {
    getItems();
    setInterval(getItems, 60 * 1000);
    setInterval(resetCache, 21600 * 1000); // reset cache every 6h
}
function getItems() {
    console.log(new Date().toLocaleString());
    const links = Object.values(urls);
    links.forEach((link) => {
        console.log(link);
        axios.get(link).then((response) => {
            const items = [];
            const html = response.data;
            const $ = cheerio_1.default.load(html); // can now access all html elements via cheerio api
            $('.productListItem').each((index, element) => {
                var _a;
                let discount = parseInt($(element).find('.sav').text().trim().substring(5, 6)); // Just get the tenth column number
                if (discount < 7)
                    return; // don't care about items with less than 50% discount
                discount *= 10;
                const name = $(element).find('.itemTitle').text().trim().toLowerCase();
                if (filterData(name))
                    return; // Don't like item, continue searching
                const url = urls.JD + $(element).find('a').attr('href');
                const imageUrl = (_a = $(element).find('source').attr('data-srcset')) === null || _a === void 0 ? void 0 : _a.split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                const wasPrice = $(element).find('.was').text().substring(3).trim();
                const nowPrice = $(element).find('.now').text().substring(3).trim();
                items.push({
                    name, wasPrice, nowPrice, discount, url, imageUrl,
                });
            });
            if (!items.length)
                console.error('Item length from .productListItem is 0');
            return items;
        }).then((items) => __awaiter(this, void 0, void 0, function* () {
            const detailedItems = yield getStockAndSize(items);
            if (!detailedItems)
                console.error('DetailedItems length is 0, nothing in stock');
            return detailedItems;
        })).then((detailedItems) => {
            const newItems = cacheDeals(detailedItems);
            sendDeals(newItems);
        }).catch((err) => console.error(`${err.name}, in getItems():  ${err.message}`));
    });
}
function getStockAndSize(items) {
    var items_1, items_1_1;
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        const stockedItems = [];
        try {
            // eslint-disable-next-line no-restricted-syntax
            for (items_1 = __asyncValues(items); items_1_1 = yield items_1.next(), !items_1_1.done;) {
                const item = items_1_1.value;
                yield axios.get(item.url).then((response) => {
                    const html = response.data;
                    const $ = cheerio_1.default.load(html);
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
                    stockedItems.push(Object.assign(Object.assign({}, item), { sizes }));
                }).catch((err) => console.log(`${err.name}, in getStockAndSize():  ${err.message}`));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (items_1_1 && !items_1_1.done && (_a = items_1.return)) yield _a.call(items_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.log('new Items: ', stockedItems);
        return stockedItems;
    });
}
// eslint-disable-next-line no-undef
// const sortByDiscount = (items: Item[]) => items?.sort((a, b) => a.discount - b.discount);
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
module.exports = { startScraping, getBestDeals };
