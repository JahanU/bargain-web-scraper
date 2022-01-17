const telegram = require('./telegramService');
import JDMain from '../helper/JD';
import { Item } from "../interfaces/Item";

let allBestItemsMap = new Map<string, Item>(); // <URL, Item>
let allBestItemsList: Item[] = [];
let discountLimit = 10; // item discount must be greater than this value


function main() {
    startScraping();
    setInterval(startScraping, 600 * 1000); // every 10 minutes
    setInterval(resetCache, 10800 * 1000); // reset cache every 3h
}

async function startScraping() {
    try {
        const JDItems = await JDMain(discountLimit);
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
        allBestItemsList.push(newItem);
    });
    console.log('final list: ', allBestItemsList);
}

const getBestDealsList = () => allBestItemsList;
const resetCache = () => allBestItemsMap = new Map();

module.exports = { main, getBestDealsList };
