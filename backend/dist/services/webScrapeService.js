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
const JD_1 = __importDefault(require("../helper/JD"));
let allBestItemsMap = new Map(); // <URL, Item>
let allBestItemsSet = new Set();
let discountLimit = 10; // item discount must be greater than this value
function main() {
    startScraping();
    setInterval(startScraping, 300 * 1000); // every 5 minutes
    setInterval(resetCache, 172800 * 1000); // every day
}
function startScraping() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const JDItems = yield (0, JD_1.default)(discountLimit, resetLists());
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
    const newItems = [];
    newBestDeals.forEach((item) => {
        if (!allBestItemsMap.has(item.url)) // found new item!
            newItems.push(item);
        allBestItemsMap.set(item.url, item);
    });
    console.log('all best deals: ', allBestItemsMap);
    return newItems;
}
function sendDeals(newDeals) {
    if (newDeals.length) {
        console.log('got new items!: ', newDeals);
        const discountedItems = newDeals.filter((item) => item.discount > 55);
        telegram.sendPhotosToUsers(discountedItems); // only send discount items to telegram users
    }
}
function setAllBestItemsSet() {
    allBestItemsMap.forEach((item, url) => {
        if (allBestItemsSet.has(item))
            return;
        const newItem = Object.assign({ url }, item);
        allBestItemsSet.add(newItem);
    });
    console.log('final list: ', allBestItemsSet);
}
const getBestDealsList = () => allBestItemsSet;
const resetCache = () => {
    allBestItemsMap = new Map();
    allBestItemsSet = new Set();
};
// pass this function to JDMain, if list length is 0, then we also want to reset the JD cache
const resetLists = () => allBestItemsSet.size === 0;
module.exports = { main, getBestDealsList };
