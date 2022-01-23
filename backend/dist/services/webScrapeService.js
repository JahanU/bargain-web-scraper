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
let allBestItemsList = [];
let discountLimit = 40; // item discount must be greater than this value
function main() {
    startScraping();
    setInterval(startScraping, 120 * 1000); // every 2 minutes
    setInterval(resetCache, 3600 * 1000); // every hour
}
function startScraping() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('start scraping: ' + new Date().getTime().toLocaleString());
        try {
            const JDItems = yield (0, JD_1.default)(discountLimit);
            const newItems = cacheDeals(JDItems);
            sendDeals(newItems);
            setAllBestItemsList();
        }
        catch (err) {
            console.log(err);
        }
    });
}
function cacheDeals(newBestDeals) {
    const newItems = [];
    newBestDeals.forEach((item) => {
        if (!allBestItemsMap.has(item.url)) { // found new item!
            newItems.push(item);
        }
        allBestItemsMap.set(item.url, item);
    });
    console.log('all best deals: ', allBestItemsMap);
    return newItems;
}
function sendDeals(newDeals) {
    if (newDeals.length) {
        console.log('got new items!: ', newDeals);
        // only send discount items to telegram users
        const discountedItems = newDeals.filter((item) => item.discount > 50);
        telegram.sendPhotosToUsers(discountedItems);
    }
}
function setAllBestItemsList() {
    allBestItemsMap.forEach((item, url) => {
        const newItem = Object.assign({ url }, item);
        allBestItemsList.push(newItem);
    });
    console.log('final list: ', allBestItemsList);
}
const getBestDealsList = () => allBestItemsList;
const resetCache = () => allBestItemsMap = new Map();
module.exports = { main, getBestDealsList };
