const telegram = require('./telegramService');
import JDService from '../services/JDService';
import { Item } from "../interfaces/Item";

let allBestItemsMap = new Map<string, Item>(); // <URL, Item>
let allBestItemsSet = new Set<Item>();
let discountLimit = 50; // item discount must be greater than this value
let resetCacheFlag = false;

function main() {
    startScraping();
    setInterval(startScraping, 300 * 1000); // every 5 minutes
    setInterval(resetCache, 86400 * 1000); // every day

    // setInterval(startScraping, 30 * 1000); // every 30 seconds
    // setInterval(resetCache, 180 * 1000); // every 3 minutes
}

async function startScraping() {
    try {
        const JDItems = await JDService(discountLimit, resetCacheFlag);
        const newItems = cacheDeals(JDItems);
        sendDeals(newItems);
        setallBestItemsSet();
        resetCacheFlag = false;
    } catch (err) {
        console.log(err);
    }
}

function cacheDeals(newBestDeals: Item[]) { // don't send items we have already seen
    const newItems: Item[] = [];
    newBestDeals.forEach((item) => {
        if (!allBestItemsMap.has(item.url)) // found new item!
            newItems.push(item); 
        allBestItemsMap.set(item.url, item);
    });
    console.log('all best deals: ', allBestItemsMap);
    return newItems;
}

function sendDeals(newDeals: Item[]) {
    if (newDeals.length) {
        console.log('got new items!: ', newDeals);
        const discountedItems = newDeals.filter((item) => item.discount > 55);
        telegram.sendPhotosToUsers(discountedItems); // only send discount items to telegram users

    }
}

function setallBestItemsSet() {
    allBestItemsMap.forEach((item, url) => {
        const newItem = { url, ...item }
        allBestItemsSet.add(newItem);
    });
    console.log('final list: ', allBestItemsSet);
}

const getBestDealsList = () => allBestItemsSet;

const resetCache = () => {
    resetCacheFlag = true;
    allBestItemsMap = new Map();
    allBestItemsSet = new Set<Item>();
}

module.exports = { main, getBestDealsList };
