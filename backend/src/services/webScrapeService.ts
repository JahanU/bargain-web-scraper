const telegram = require('./telegramService');
import getJDItems from '../helper/JD';
import { Item } from "../interfaces/Item";

let allBestItemsMap = new Map<string, Item>(); // <URL, Item>
let allBestItemsList: Item[] = [];
let discountLimit = 50; // item discount must be greater than this value

const getBestDeals = () => allBestItemsMap;
const getBestDealsList = () => allBestItemsList;
const resetCache = () => allBestItemsMap = new Map();

function main() {
    startScraping();
    // setInterval(startScraping, 60 * 1000);
    // setInterval(resetCache, 21600 * 1000); // reset cache every 6h
}

async function startScraping() {
    try {
        const JDItems = await getJDItems(discountLimit);
        console.log('JD items', JDItems);
        const newItems = cacheDeals(JDItems);
        sendDeals(newItems);
        setAllBestItemsList();
    } catch (err) {
        console.log(err, 'error in startScraping()');
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
    if (newDeals.length === 0) {
        console.log('no new items');
    } else {
        console.log('got new items!: ', newDeals);
        telegram.sendPhotosToUsers(newDeals);
    }
}

function setAllBestItemsList() {
    allBestItemsMap.forEach((item, url) => {
        const newItem = { url, ...item }
        allBestItemsList.push(newItem);
    });

    console.log('final list: ', allBestItemsList);
}

module.exports = { main, getBestDealsList };
