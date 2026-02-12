import * as telegramService from './telegramService';
import JDService from './JDService';
import type { Item } from '../interfaces/Item';

const SCRAPE_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;
const JD_DISCOUNT_LIMIT = 30;
const TELEGRAM_DISCOUNT_THRESHOLD = 50;

const allBestItemsMap = new Map<string, Item>(); // <URL, Item>
let cachedAllBestItems: Item[] = []; // served while daily cache is being rebuilt
let resetCacheFlag = false;
let isScrapeRunning = false;

/**
 * Boots the scraper loop and schedules periodic scraping and cache reset.
 */
export function main() {
    // Kick off immediately so the service does not wait for the first interval tick.
    void startScraping();
    setInterval(() => {
        void startScraping();
    }, SCRAPE_INTERVAL_MS);

    setInterval(resetCache, CACHE_RESET_INTERVAL_MS);
}

/**
 * Runs one scrape cycle and guards against overlapping runs.
 */
async function startScraping() {
    if (isScrapeRunning) {
        console.log('[WebScrape] Skipping scrape because a previous run is still in progress.');
        return;
    }

    console.log('[WebScrape] Starting new scrape run...');
    isScrapeRunning = true;

    try {
        const jdItems = await JDService(JD_DISCOUNT_LIMIT, resetCacheFlag);
        console.log(`[WebScrape] JDService returned ${jdItems.length} items.`);
        resetCacheFlag = false;

        const newItems = cacheDeals(jdItems);
        console.log(`[WebScrape] ${newItems.length} of these items are new and were added to cache.`);

        sendDeals(newItems);
    } catch (error) {
        console.error('[WebScrape] Web scrape run failed:', error);
    } finally {
        isScrapeRunning = false;
        console.log('[WebScrape] Scrape run completed.');
    }
}

/**
 * Adds unseen items to the in-memory cache and returns only newly discovered items.
 */
function cacheDeals(items: Item[]): Item[] {
    if (!items.length) {
        return [];
    }

    const newItems: Item[] = [];

    for (const item of items) {
        if (allBestItemsMap.has(item.url)) {
            continue;
        }

        allBestItemsMap.set(item.url, item);
        newItems.push(item);
    }

    return newItems;
}

/**
 * Sends only high-discount deals to Telegram to reduce notification noise.
 */
function sendDeals(newDeals: Item[]) {
    if (!newDeals.length) {
        return;
    }

    const discountedItems = newDeals.filter((item) => item.discount > TELEGRAM_DISCOUNT_THRESHOLD);
    if (!discountedItems.length) {
        console.log('[WebScrape] No high-discount items to send to Telegram.');
        return;
    }

    console.log(`[WebScrape] Found ${discountedItems.length} new high-discount items. Sending to Telegram...`);
    // telegram.sendPhotosToUsers(discountedItems);
}

/**
 * Returns active cache if available, otherwise returns the previous snapshot.
 */
export const getBestDealsList = (): Item[] => {
    if (allBestItemsMap.size === 0) {
        return cachedAllBestItems;
    }

    return Array.from(allBestItemsMap.values());
};

/**
 * Rotates cache daily so UI keeps serving previous results while scraper rebuilds fresh data.
 */
const resetCache = () => {
    console.log('Resetting cache.');

    // Clone to avoid mutating cached snapshot after reset.
    cachedAllBestItems = Array.from(allBestItemsMap.values()).map(cloneItem);
    resetCacheFlag = true;
    allBestItemsMap.clear();
};

/**
 * Creates a safe item copy for snapshot caching.
 */
function cloneItem(item: Item): Item {
    return {
        ...item,
        // Clone nested arrays to avoid shared references between active and cached copies.
        sizes: item.sizes ? [...item.sizes] : undefined,
    };
}
