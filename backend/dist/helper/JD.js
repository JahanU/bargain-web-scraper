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
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio = require('cheerio');
const axios = require('axios');
const filterData = require('./filterData');
let seenItemsCache = new Set(); // stores url 
const JD = 'https://www.jdsports.co.uk';
const urls = [
    'https://www.jdsports.co.uk/men/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,tommy-hilfiger,calvin-klein-underwear,levis,columbia,jordan,emporio-armani-ea7,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics/sale/?sort=price-low-high&max=200',
    'https://www.jdsports.co.uk/men/mens-footwear/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,vans,tommy-hilfiger,calvin-klein-underwear,levis,columbia,reebok,jordan,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics,converse/sale/?max=100&sort=price-low-high&max=200'
];
function JDMain(discountLimit, resetCache) {
    if (resetCache)
        resetList();
    return getJDItems(discountLimit);
}
const resetList = () => seenItemsCache = new Set();
function getJDItems(discountLimit) {
    const items = [];
    return new Promise((resolve, reject) => {
        Promise.all(urls.map((url) => __awaiter(this, void 0, void 0, function* () {
            console.log('url', url);
            const html = yield axios.get(url);
            const $ = cheerio.load(html.data);
            $('.productListItem').each((index, element) => {
                var _a;
                const url = JD + $(element).find('a').attr('href');
                if (seenItemsCache.has(url))
                    return; // don't add items we've already seen
                seenItemsCache.add(url);
                let discount = parseInt($(element).find('.sav').text().trim().substring(5, 7));
                if (discount < discountLimit)
                    return; // don't care about items with less than x% discount
                const name = $(element).find('.itemTitle').text().trim();
                if (filterData(name.toLowerCase()))
                    return; // Don't like item, continue searching
                const imageUrl = (_a = $(element).find('source').attr('data-srcset')) === null || _a === void 0 ? void 0 : _a.split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                const wasPrice = $(element).find('.was').text().substring(3).trim();
                const nowPrice = $(element).find('.now').text().substring(3).trim();
                items.push({ name, wasPrice, nowPrice, discount, url, imageUrl });
            });
            if (!items.length)
                reject('No items found from JD');
            return items;
        }))).then((items) => __awaiter(this, void 0, void 0, function* () {
            const detailedItems = yield bufferHandler(items.flat());
            if (!detailedItems.length)
                reject('Nothing in stock');
            return resolve(detailedItems);
        })).catch((err) => {
            return reject(err);
        });
    });
}
function bufferHandler(items) {
    return __awaiter(this, void 0, void 0, function* () {
        // crashes when trying to make 100s of http calls at once, using buffer to reduce load
        let totalItems = [];
        while (items.length) {
            let buffer = items.splice(0, 50);
            let bufferItems = yield getStockAndSize(buffer);
            totalItems = totalItems.concat(bufferItems);
        }
        return totalItems.sort((a, b) => b.discount - a.discount);
    });
}
function getStockAndSize(items) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('getting stock and size for ', items.length);
        return new Promise((resolve, reject) => {
            Promise.all(items.map((item) => __awaiter(this, void 0, void 0, function* () {
                const html = yield axios.get(item.url);
                const $ = cheerio.load(html.data);
                console.log('getting stock and size: ', item.name);
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
                return reject(err);
            });
        });
    });
}
exports.default = JDMain;
