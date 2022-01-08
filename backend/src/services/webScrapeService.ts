const telegram = require('./telegramService');
import getJDItems from '../helper/JD';
import { Item } from "../interfaces/Item";

let allBestItems = new Map<string, Item>(); // <URL, Item>
let discountLimit = 70; // item discount must be greater than this value

const getBestDeals = () => allBestItems;
const resetCache = () => allBestItems = new Map();

function main() {
    startScraping();
    // setInterval(startScraping, 60 * 1000);
    // setInterval(resetCache, 21600 * 1000); // reset cache every 6h
}

async function startScraping() {
    try {
        const JDItems = await getJDItems(discountLimit);
        const newItems = cacheDeals(JDItems);
        sendDeals(newItems);
    } catch (err) {
        console.log(err, 'error in startScraping()');
    }
}




function cacheDeals(newBestDeals: Item[]) { // don't send items we have already seen
    const newItems: Item[] = [];
    newBestDeals.forEach((item) => {
        if (!allBestItems.has(item.url)) { // found new item!
            newItems.push(item);
        }
        allBestItems.set(item.url, item);
    });
    console.log('all best deals: ', allBestItems);
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

module.exports = { main, getBestDeals }
