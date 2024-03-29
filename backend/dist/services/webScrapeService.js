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
const JDService_1 = __importDefault(require("./JDService"));
let allBestItemsMap = new Map(); // <URL, Item>
let allBestItemsSet = new Set();
let cachedAllBestItemsSet = new Set(); // when we reset the set, we use this old one for the UI until the new data is fetched
let discountLimit = 30; // item discount must be greater than this value
let resetCacheFlag = false;
function main() {
    startScraping();
    setInterval(startScraping, 300 * 1000); // every 5 minutes
    setInterval(resetCache, 1000 * 60 * 60 * 24); // every day
}
function startScraping() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const JDItems = yield (0, JDService_1.default)(discountLimit, resetCacheFlag);
            resetCacheFlag = false;
            const newItems = cacheDeals(JDItems);
            sendDeals(newItems);
            setAllBestItemsSet();
        }
        catch (err) {
            console.log(err);
        }
    });
}
function cacheDeals(newBestDeals) {
    let newItems = [];
    newBestDeals.forEach((item) => {
        if (allBestItemsMap.has(item.url))
            return;
        else {
            const url = item.url;
            const newItem = Object.assign({ url }, item);
            if (allBestItemsSet.has(newItem))
                return;
            allBestItemsSet.add(newItem);
            newItems.push(newItem);
        }
        allBestItemsMap.set(item.url, item);
    });
    return newItems;
}
function sendDeals(newDeals) {
    if (newDeals.length) {
        console.log('got new items!: ', newDeals);
        const discountedItems = newDeals.filter((item) => item.discount > 50);
        telegram.sendPhotosToUsers(discountedItems); // only send discount items to telegram users
    }
}
const getBestDealsList = () => {
    if (allBestItemsSet.size === 0)
        return cachedAllBestItemsSet;
    return allBestItemsSet;
};
function setAllBestItemsSet() {
    allBestItemsMap.forEach((item, url) => {
        const newItem = Object.assign({ url }, item);
        if (allBestItemsSet.has(newItem))
            return;
        allBestItemsSet.add(newItem);
    });
    console.log('final list: ', allBestItemsSet);
}
const resetCache = () => {
    console.log('resetting...');
    cachedAllBestItemsSet = new Set(JSON.parse(JSON.stringify([...allBestItemsSet])));
    resetCacheFlag = true;
    allBestItemsMap = new Map();
    allBestItemsSet.clear();
};
module.exports = { main, getBestDealsList };
