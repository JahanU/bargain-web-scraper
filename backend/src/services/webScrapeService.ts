const telegram = require('./telegramService');
import JDService from '../services/JDService';
import { Item } from "../interfaces/Item";

let allBestItemsMap = new Map<string, Item>(); // <URL, Item>
let allBestItemsSet = new Set<Item>();
let cachedAllBestItemsSet = new Set<Item>(); // when we reset the set, we use this old one for the UI until the new data is fetched

let discountLimit = 10; // item discount must be greater than this value
let resetCacheFlag = false;

function main() {
    startScraping();
    setInterval(startScraping, 300 * 1000); // every 5 minutes
    setInterval(resetCache, 86400 * 1000); // every day
    // setInterval(startScraping, 10 * 1000); // every 10 seconds
    // setInterval(resetCache, 20 * 1000); // every 20 seconds
}

async function startScraping() {
    try { 
        const JDItems = await JDService(discountLimit, resetCacheFlag);
        resetCacheFlag = false;
        const newItems = cacheDeals(JDItems);
        sendDeals(newItems);
    } catch (err) {
        console.log(err);
    }
}

function cacheDeals(newBestDeals: Item[]) { // don't send items we have already seen

    let newItems: Item[] = [];

    newBestDeals.forEach((item: Item) => {
        if (allBestItemsMap.has(item.url)) return;
        else {
            const url = item.url;
            const newItem = { url, ...item };
            if (allBestItemsSet.has(newItem)) return;
            allBestItemsSet.add(newItem);  
            newItems.push(newItem);
        }
        allBestItemsMap.set(item.url, item);
    });
    return newItems;
}

function sendDeals(newDeals: Item[]) {
    if (newDeals.length) {
        console.log('got new items!: ', newDeals);
        const discountedItems = newDeals.filter((item) => item.discount > 55);
        telegram.sendPhotosToUsers(discountedItems); // only send discount items to telegram users
    }
}

const getBestDealsList = () => {
    if (allBestItemsSet.size === 0) 
        return cachedAllBestItemsSet;
    return allBestItemsSet;
}

const resetCache = () => {
    cachedAllBestItemsSet = new Set(JSON.parse(JSON.stringify([...allBestItemsSet])))
    resetCacheFlag = true;
    allBestItemsMap = new Map();
    allBestItemsSet.clear();
}

module.exports = { main, getBestDealsList };
