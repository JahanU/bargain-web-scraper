const telegram = require('./telegramService');
import JDMain from '../helper/JD';
import { Item } from "../interfaces/Item";

let allBestItemsMap = new Map<string, Item>(); // <URL, Item>
let allBestItemsList = new Set<Item>();
let discountLimit = 10; // item discount must be greater than this value


function main() {
    startScraping();
    setInterval(startScraping, 300 * 1000); // every 5 minutes
    setInterval(resetCache, 43200 * 1000); // every 12 hours
}

async function startScraping() {
    try {
        const JDItems = await JDMain(discountLimit, resetLists());
        const newItems = cacheDeals(JDItems);
        sendDeals(newItems);
        setAllBestItemsList();
    } catch (err) {
        console.log(err);
    }
}

function cacheDeals(newBestDeals: Item[]) { // don't send items we have already seen
    const newItems: Item[] = [];
    newBestDeals.forEach((item) => {
        if (!allBestItemsMap.has(item.url)) { // found new item!
            newItems.push(item);
        }
        allBestItemsMap.set(item.url, item);
    });
    console.log('all best deals: ', allBestItemsMap);
    return newItems;
}

function sendDeals(newDeals: Item[]) {
    if (newDeals.length) {
        console.log('got new items!: ', newDeals);
        // only send discount items to telegram users
        const discountedItems = newDeals.filter((item) => item.discount > 50);
        telegram.sendPhotosToUsers(discountedItems);
    }
}

function setAllBestItemsList() {
    allBestItemsMap.forEach((item, url) => {
        const newItem = { url, ...item }
        allBestItemsList.add(newItem);
    });
    console.log('final list: ', allBestItemsList);
}

const getBestDealsList = () => allBestItemsList;

const resetCache = () => {
    allBestItemsMap = new Map();
    allBestItemsList = new Set<Item>();
}

// pass this function to JDMain, if list length is 0, then we also want to reset the JD cache
const resetLists = () => allBestItemsList.size === 0;

module.exports = { main, getBestDealsList };
