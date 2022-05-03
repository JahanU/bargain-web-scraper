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
const telegram = require('./telegramService');
const JDService_1 = __importDefault(require("../services/JDService"));
let allBestItemsMap = new Map(); // <URL, Item>
let allBestItemsSet = new Set();
let cachedAllBestItemsSet = new Set(); // when we reset the set, we use this old one for the UI until the new data is fetched
let discountLimit = 60; // item discount must be greater than this value
let resetCacheFlag = false;
let resetCounter = 0;
function main() {
    startScraping();
    // setInterval(startScraping, 300 * 1000); // every 5 minutes
    // setInterval(resetCache, 86400 * 1000); // every day
    setInterval(startScraping, 10 * 1000); // every 10 seconds
    setInterval(resetCache, 20 * 1000); // every 20 seconds
}
function startScraping() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const JDItems = yield (0, JDService_1.default)(discountLimit, resetCacheFlag);
            resetCacheFlag = false;
            const newItems = cacheDeals(JDItems);
            sendDeals(newItems);
            setallBestItemsSet();
        }
        catch (err) {
            console.log(err);
        }
    });
}
function cacheDeals(newBestDeals) {
    const newItems = [];
    newBestDeals.forEach((item) => {
        if (allBestItemsMap.has(item.url))
            return;
        else
            allBestItemsSet.add(item);
        allBestItemsMap.set(item.url, item);
    });
    console.log('all best deals: ', allBestItemsMap);
    console.log(newItems);
    return newItems;
}
function sendDeals(newDeals) {
    if (newDeals.length) {
        console.log('got new items!: ', newDeals);
        const discountedItems = newDeals.filter((item) => item.discount > 55);
        telegram.sendPhotosToUsers(discountedItems); // only send discount items to telegram users
    }
}
function setallBestItemsSet() {
    allBestItemsMap.forEach((item, url) => {
        const newItem = Object.assign({ url }, item);
        if (allBestItemsSet.has(newItem))
            return;
        allBestItemsSet.add(newItem);
    });
    console.log('final list: ', allBestItemsSet);
}
const getBestDealsList = () => {
    if (allBestItemsSet.size === 0)
        return cachedAllBestItemsSet;
    return allBestItemsSet;
};
const resetCache = () => {
    cachedAllBestItemsSet = new Set(JSON.parse(JSON.stringify([...allBestItemsSet])));
    resetCacheFlag = true;
    allBestItemsMap = new Map();
    allBestItemsSet.clear();
};
module.exports = { main, getBestDealsList };
