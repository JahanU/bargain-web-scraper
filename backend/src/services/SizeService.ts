import type { Item } from '../interfaces/Item';

const SIZE_BASE_URL = 'https://www.size.co.uk';
const LISTING_URL = 'https://www.size.co.uk/mens/footwear/?sort=price-low-high';
const IMAGE_CDN_BASE = 'https://i8.amplience.net/i/jpl';
const REQUEST_TIMEOUT_MS = 15000;

const seenItemsCache = new Set<string>();

const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; bargain-web-scraper/1.0)',
};

/**
 * Shape of a single item embedded in window.dataObject.items on size.co.uk.
 */
interface SizeRawItem {
    plu: string;
    description: string;
    colour: string;
    unitPrice: string;
    wasPrice?: string;
    saving?: string;
    category: string;
    categoryId: string;
    sale: boolean;
    brand: string;
    ownbrand: boolean;
    exclusive: boolean;
    onlineexlusive: boolean;
}

/**
 * Entry point for size.co.uk scraping.
 * Fetches the listing page, extracts the embedded dataObject,
 * and maps items to the shared Item interface.
 */
async function SizeMain(resetCacheFlag: boolean): Promise<Item[]> {
    console.log('[SizeService] Starting Size scrape...');

    if (resetCacheFlag) {
        console.log('[SizeService] Reset cache flag detected. Clearing seen items cache.');
        seenItemsCache.clear();
        return [];
    }

    try {
        const items = await scrapeListingPage(LISTING_URL);
        console.log(`[SizeService] Successfully processed ${items.length} items.`);
        return items;
    } catch (error) {
        console.error('[SizeService] Scrape failed:', error);
        return [];
    }
}

/**
 * Fetches the listing page HTML and extracts product data
 * from the embedded window.dataObject variable.
 */
async function scrapeListingPage(url: string): Promise<Item[]> {
    console.log(`[SizeService] Fetching listing page: ${url}`);
    const html = await fetchWithTimeout(url);

    const rawItems = extractDataObject(html);
    if (!rawItems.length) {
        console.log('[SizeService] No items found in dataObject.');
        return [];
    }

    console.log(`[SizeService] Extracted ${rawItems.length} raw items from dataObject.`);

    const gender = getGenderFromUrl(url);
    return parseItems(rawItems, gender);
}

/**
 * Extracts the items array from the embedded dataObject in the page HTML.
 *
 * The site embeds a JS object via a pattern like:
 *   var defined in a <script> tag that populates window.dataObject = { ... items: [...] }
 *
 * We use a regex to capture the items array from the raw HTML source.
 */
function extractDataObject(html: string): SizeRawItem[] {
    // The dataObject is assigned in a script tag. We look for the items array directly.
    // Pattern: "items":[...array of objects...]
    const itemsMatch = html.match(/"items"\s*:\s*(\[[\s\S]*?\])\s*(?:,\s*"|\})/);
    if (!itemsMatch || !itemsMatch[1]) {
        // Fallback: try to find the full dataObject and parse it
        const dataObjectMatch = html.match(/dataObject\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|var\s)/);
        if (dataObjectMatch && dataObjectMatch[1]) {
            try {
                const dataObject = JSON.parse(dataObjectMatch[1]);
                return Array.isArray(dataObject.items) ? dataObject.items : [];
            } catch {
                console.error('[SizeService] Failed to parse dataObject JSON.');
                return [];
            }
        }
        return [];
    }

    try {
        return JSON.parse(itemsMatch[1]);
    } catch {
        console.error('[SizeService] Failed to parse items JSON from dataObject.');
        return [];
    }
}

/**
 * Maps raw size.co.uk items to the shared Item interface.
 */
function parseItems(rawItems: SizeRawItem[], gender: string): Item[] {
    const items: Item[] = [];

    for (const raw of rawItems) {
        if (!raw.plu || !raw.description) {
            continue;
        }

        const productUrl = buildProductUrl(raw.description, raw.plu);
        if (seenItemsCache.has(productUrl)) {
            continue;
        }
        seenItemsCache.add(productUrl);

        const discount = parseDiscount(raw.saving);

        items.push({
            name: raw.description,
            wasPrice: raw.wasPrice || '',
            nowPrice: raw.unitPrice || '',
            discount,
            url: productUrl,
            imageUrl: buildImageUrl(raw.plu),
            timestamp: Date.now(),
            gender,
        });
    }

    return items;
}

/**
 * Constructs a product URL from the description and PLU.
 * size.co.uk uses the pattern: /product/slugified-description/PLU
 */
function buildProductUrl(description: string, plu: string): string {
    const slug = description
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `${SIZE_BASE_URL}/product/${slug}/${plu}`;
}

/**
 * Constructs the product image URL from the PLU using Amplience CDN.
 * size.co.uk serves images at: https://i8.amplience.net/i/jpl/sz_PLU_a
 */
function buildImageUrl(plu: string): string {
    return `${IMAGE_CDN_BASE}/sz_${plu}_a`;
}

/**
 * Parses the discount/saving value from the raw item.
 * The saving field may be a percentage string like "20" or "20%" or absent.
 */
function parseDiscount(saving: string | undefined): number {
    if (!saving) {
        return 0;
    }
    const match = saving.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : 0;
}

/**
 * Infers gender segment from listing URL.
 */
function getGenderFromUrl(url: string): string {
    return /\b(mens?|male)\b/i.test(url) ? 'Male' : 'Female';
}

/**
 * Fetches a URL with timeout and custom headers using native fetch.
 */
async function fetchWithTimeout(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: defaultHeaders,
        signal: (AbortSignal as any).timeout(REQUEST_TIMEOUT_MS),
    });
    return response.text();
}

export const __test__ = {
    extractDataObject,
    parseItems,
    buildProductUrl,
    buildImageUrl,
    parseDiscount,
    getGenderFromUrl,
};

export default SizeMain;
