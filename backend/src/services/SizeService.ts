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
    shogunPluRef: string;
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
/**
 * Extracts the items array from the embedded dataObject in the page HTML.
 *
 * The site embeds a JS object literal (not strict JSON) via a pattern like:
 *   window.dataObject = { ... items: [{ plu: "...", ... }, ...] }
 *
 * We use regex to find each item block and then extract individual fields.
 */
function extractDataObject(html: string): SizeRawItem[] {
    const items: SizeRawItem[] = [];

    // 1. Find the dataObject assignment in the script
    // Supports: window.dataObject = { ... } or var dataObject = { ... }
    const dataObjectMatch = html.match(/dataObject\s*=\s*(\{[\s\S]*?\});/);
    if (!dataObjectMatch || !dataObjectMatch[1]) {
        return [];
    }

    const dataObjectStr = dataObjectMatch[1];

    // 2. Find the items array start: "items": [
    const itemsStartMatch = dataObjectStr.match(/"?items"?\s*:\s*\[/i);
    if (!itemsStartMatch) {
        return [];
    }

    const itemsStartIndex = dataObjectStr.indexOf(itemsStartMatch[0]) + itemsStartMatch[0].length;

    // 3. Find the LAST closing bracket ']' in the dataObjectStr
    // Since the items array is typically the last major block in MESH dataObject
    const itemsEndIndex = dataObjectStr.lastIndexOf(']');

    if (itemsEndIndex <= itemsStartIndex) {
        return [];
    }

    const itemsContent = dataObjectStr.substring(itemsStartIndex, itemsEndIndex);

    // 4. Split content into individual item blocks.
    const itemBlocks = itemsContent.match(/\{[\s\S]*?\}/g);
    if (!itemBlocks) {
        return [];
    }

    for (const block of itemBlocks) {
        const item = extractFieldsFromBlock(block);
        if (item.plu && item.description) {
            items.push(item as SizeRawItem);
        }
    }

    return items;
}

/**
 * Extracts key-value pairs from a JS object literal block using regex.
 * Handles unquoted and quoted keys, and strings in double/single quotes.
 */
function extractFieldsFromBlock(block: string): Partial<SizeRawItem> {
    const result: any = {};

    // Helper to extract a single string field
    const getString = (key: string) => {
        const regex = new RegExp(`"?${key}"?\\s*:\\s*["']([^"']*)["']`, 'i');
        return block.match(regex)?.[1];
    };

    // Helper to extract a boolean field
    const getBool = (key: string) => {
        const regex = new RegExp(`"?${key}"?\\s*:\\s*(true|false)`, 'i');
        const match = block.match(regex);
        return match?.[1] ? match[1].toLowerCase() === 'true' : false;
    };

    result.plu = getString('plu');
    result.shogunPluRef = getString('shogunPluRef');
    result.description = getString('description');
    result.colour = getString('colour');
    result.unitPrice = getString('unitPrice');
    result.wasPrice = getString('wasPrice');
    result.saving = getString('saving');
    result.category = getString('category');
    result.categoryId = getString('categoryId');
    result.brand = getString('brand');
    result.sale = getBool('sale');

    return result;
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
            imageUrl: buildImageUrl(raw.shogunPluRef),
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
 * Constructs the product image URL from the shogunPluRef using Amplience CDN.
 * size.co.uk serves images at: https://i8.amplience.net/i/jpl/sz_SHOGUNPLUREF_a
 */
function buildImageUrl(shogunPluRef: string): string {
    return `${IMAGE_CDN_BASE}/sz_${shogunPluRef}_a`;
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
