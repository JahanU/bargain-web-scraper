import * as cheerio from 'cheerio';
import { filterData } from '../helper/filterData';
import type { Item } from '../interfaces/Item';

const JD_BASE_URL = 'https://www.jdsports.co.uk';
const LISTING_URLS = [
    'https://www.jdsports.co.uk/men/brand/nike/sale/?sort=price-low-high&max=5',
    // 'https://www.jdsports.co.uk/men/brand/adidas-originals,adidas,nike,champion,under-armour,the-north-face,new-balance,lacoste,tommy-hilfiger,calvin-klein-underwear,levis,columbia,jordan,emporio-armani-ea7,berghaus,polo-ralph-lauren,boss,fred-perry,asics/sale/?sort=price-low-high&max=200',
    // 'https://www.jdsports.co.uk/men/mens-footwear/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,vans,tommy-hilfiger,calvin-klein-underwear,levis,columbia,reebok,jordan,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics,converse/sale/?max=100&sort=price-low-high&max=200',
] as const;

const DETAIL_FETCH_CONCURRENCY = 20;
const REQUEST_TIMEOUT_MS = 15000;

const seenItemsCache = new Set<string>();

const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; bargain-web-scraper/1.0)',
};

/**
 * Entry point for JD scraping:
 * 1) scrape listing pages
 * 2) enrich with item detail pages
 * 3) sort by highest discount
 */
async function JDMain(discountLimit: number, resetCacheFlag: boolean): Promise<Item[]> {
    console.log('[JDService] Starting JD scrape...');
    if (resetCacheFlag) {
        console.log('[JDService] Reset cache flag detected. Clearing seen items cache.');
        seenItemsCache.clear();
        return [];
    }

    const listingItems = await collectListingItems(discountLimit);
    console.log(`[JDService] Found ${listingItems.length} potential items on listing pages.`);

    if (!listingItems.length) {
        return [];
    }

    console.log(`[JDService] Fetching details for ${listingItems.length} items...`);
    const detailedItems = await mapConcurrent(listingItems, DETAIL_FETCH_CONCURRENCY, getStockAndSize);

    const finalItems = detailedItems
        .filter((item): item is Item => item !== undefined)
        .sort((a, b) => b.discount - a.discount);

    console.log(`[JDService] Successfully processed ${finalItems.length} items with full details.`);
    return finalItems;
}

/**
 * Fetches all listing URLs in parallel and flattens the results.
 */
async function collectListingItems(discountLimit: number): Promise<Item[]> {
    const batches = await Promise.all(LISTING_URLS.map((url) => scrapeListingPage(url, discountLimit)));
    // Flattens the batches into a single array
    return batches.reduce<Item[]>((acc, items) => {
        acc.push(...items);
        return acc;
    }, []);
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

/**
 * Extracts candidate items from a single listing page.
 */
async function scrapeListingPage(url: string, discountLimit: number): Promise<Item[]> {
    try {
        console.log(`[JDService] Scraping listing page: ${url}`);
        const html = await fetchWithTimeout(url);
        const $ = cheerio.load(html);
        const gender = getGenderFromUrl(url);
        const pageItems: Item[] = [];

        $('.productListItem').each((_: number, element: any) => {
            const item = parseListingItem($, element, gender, discountLimit);
            if (item) {
                pageItems.push(item);
            }
        });

        console.log(`[JDService] Extracted ${pageItems.length} items from listing: ${url}`);
        return pageItems;
    } catch (error) {
        console.error(`[JDService] Failed to scrape JD listing page: ${url}`, error);
        return [];
    }
}

/**
 * Parses one listing tile and returns an item only if it passes all filters.
 */
function parseListingItem(
    $: any,
    element: any,
    gender: string,
    discountLimit: number
): Item | undefined {
    const href = $(element).find('a').attr('href');
    if (!href) {
        return undefined;
    }

    const productUrl = toAbsoluteUrl(href);
    if (!productUrl || seenItemsCache.has(productUrl)) {
        return undefined;
    }

    const discount = extractDiscount($(element).find('.sav').text());
    if (discount < discountLimit) {
        return undefined;
    }

    const name = $(element).find('.itemTitle').text().trim();
    if (!name || filterData(name.toLowerCase())) {
        return undefined;
    }

    seenItemsCache.add(productUrl);

    const imageUrl = extractImageUrl($(element));
    const wasPrice = extractPrice($(element).find('.was').text());
    const nowPrice = extractPrice($(element).find('.now').text());

    return {
        name,
        wasPrice,
        nowPrice,
        discount,
        url: productUrl,
        imageUrl,
        timestamp: Date.now(),
        gender,
    };
}

/**
 * Enriches an item with stock and size details from the product page.
 */
async function getStockAndSize(item: Item): Promise<Item | undefined> {
    try {
        const html = await fetchWithTimeout(item.url);
        const $ = cheerio.load(html);

        const inStock = extractStockStatus($);
        const sizes = extractSizes($);

        if (shouldExcludeAsOutOfStock($, inStock, sizes)) {
            return undefined;
        }

        return {
            ...item,
            sizes: sizes.length ? sizes : undefined,
            inStock,
        };
    } catch (error) {
        console.error(`Failed to scrape JD item details: ${item.url}`, error);
        return undefined;
    }
}

/**
 * Determines stock status from explicit availability metadata.
 * Returns UNKNOWN when the page has no reliable stock signal.
 */
function extractStockStatus($: any): string {
    const metaAvailabilityRaw =
        $('meta[property="product:availability"]').attr('content') ||
        $('meta[itemprop="availability"]').attr('content') ||
        $('meta[name="availability"]').attr('content');

    const metaAvailability = normalizeAvailability(metaAvailabilityRaw);
    if (metaAvailability !== 'UNKNOWN') {
        return metaAvailability;
    }

    const jsonLdAvailability = extractAvailabilityFromJsonLd($);
    if (jsonLdAvailability !== 'UNKNOWN') {
        return jsonLdAvailability;
    }

    return 'UNKNOWN';
}

/**
 * Extracts sizes from dropdown options first, then falls back to script content parsing.
 */
function extractSizes($: any): string[] {
    const sizes = new Set<string>();

    $('select option').each((_: number, option: any) => {
        const value = $(option).text().trim();
        if (isValidSize(value)) {
            sizes.add(value);
        }
    });

    if (!sizes.size) {
        const scriptText = $('script')
            .map((_: number, script: any) => $(script).html() || '')
            .get()
            .join('\n');

        const patterns = [
            /name:\s*["']([^"']+)["']/g,
            /"displaySize"\s*:\s*"([^"]+)"/g,
            /"size"\s*:\s*"([^"]+)"/g,
            /'size'\s*:\s*'([^']+)'/g,
        ];

        for (const pattern of patterns) {
            // Iteratively execute regex to collect multiple matches from a single script blob.
            let match = pattern.exec(scriptText);
            while (match) {
                if (match[1]) {
                    const value = match[1].trim();
                    if (isValidSize(value)) {
                        sizes.add(value);
                    }
                }
                match = pattern.exec(scriptText);
            }
        }
    }

    return Array.from(sizes);
}

/**
 * Accepts common clothing and footwear size formats while filtering non-size strings.
 */
function isValidSize(value: string): boolean {
    const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!normalized) {
        return false;
    }

    if (
        normalized.includes('select') ||
        normalized.includes('size guide') ||
        normalized.includes('out of stock')
    ) {
        return false;
    }

    const namedSizes = new Set([
        'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl',
        'small', 'medium', 'large', 'x large', 'xx large', 'one size', 'one-size',
    ]);

    if (namedSizes.has(normalized)) {
        return true;
    }

    if (/^(?:uk|us|eu|w|m)?\s*\d{1,3}(?:\.\d)?(?:\s*\/\s*\d{1,3}(?:\.\d)?)?$/.test(normalized)) {
        return true;
    }

    return /^(?:\d?x?s|s|m|l|xl|xxl|xxxl)(?:\s*\/\s*(?:\d?x?s|s|m|l|xl|xxl|xxxl))?$/.test(normalized);
}

/**
 * Excludes items only when out-of-stock evidence is strong.
 * This avoids dropping valid items because of weak/ambiguous page markup.
 */
function shouldExcludeAsOutOfStock($: any, inStock: string, sizes: string[]): boolean {
    if (inStock === 'OUT OF STOCK') {
        return true;
    }

    if (sizes.length > 0) {
        return false;
    }

    const outOfStockSelectors = [
        '.outOfStock',
        '.out-of-stock',
        '.qa-out-of-stock',
        '[data-qa="out-of-stock"]',
        '[data-testid*="out-of-stock"]',
    ];

    return outOfStockSelectors.some((selector) => $(selector).length > 0);
}

/**
 * Reads structured JSON-LD blocks to infer product availability.
 */
function extractAvailabilityFromJsonLd($: any): string {
    const jsonLdScripts = $('script[type="application/ld+json"]')
        .map((_: number, script: any) => $(script).html() || '')
        .get()
        .filter(Boolean);

    for (const scriptText of jsonLdScripts) {
        try {
            const parsed = JSON.parse(scriptText);
            const candidates = Array.isArray(parsed) ? parsed : [parsed];
            for (const entry of candidates) {
                const availability = normalizeAvailability(entry?.offers?.availability || entry?.availability);
                if (availability !== 'UNKNOWN') {
                    return availability;
                }
            }
        } catch {
            continue;
        }
    }

    return 'UNKNOWN';
}

/**
 * Normalizes different availability representations into one enum-like string.
 */
function normalizeAvailability(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
        return 'UNKNOWN';
    }

    const normalized = value.trim().toLowerCase();
    if (normalized.includes('outofstock') || normalized.includes('out of stock')) {
        return 'OUT OF STOCK';
    }

    if (normalized.includes('instock') || normalized.includes('in stock')) {
        return 'IN STOCK';
    }

    return 'UNKNOWN';
}

/**
 * Extracts numeric discount percent from listing text.
 */
function extractDiscount(text: string): number {
    const match = text.match(/(\d{1,3})\s*%/);
    return (match && match[1]) ? parseInt(match[1], 10) : 0;
}

/**
 * Extracts first numeric price token from mixed text.
 */
function extractPrice(text: string): string {
    const match = text.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/);
    return match ? match[0] : '';
}

/**
 * Chooses the highest-resolution image URL from srcset when available.
 */
function extractImageUrl(element: any): string | undefined {
    const sourceSet = element.find('source').attr('data-srcset') || element.find('img').attr('srcset');

    if (sourceSet) {
        const urls = sourceSet
            .split(',')
            .map((entry: string) => entry.trim().split(' ')[0])
            .filter(Boolean);

        if (urls.length) {
            return toAbsoluteUrl(urls[urls.length - 1]);
        }
    }

    const fallback = element.find('img').attr('src');
    return fallback ? toAbsoluteUrl(fallback) : undefined;
}

/**
 * Infers gender segment from listing URL.
 */
function getGenderFromUrl(url: string): string {
    return /\b(men|male)\b/i.test(url) ? 'Male' : 'Female';
}

/**
 * Safely normalizes relative URLs into absolute JD URLs.
 */
function toAbsoluteUrl(pathOrUrl: string): string {
    try {
        return new URL(pathOrUrl, JD_BASE_URL).toString();
    } catch {
        return '';
    }
}

/**
 * Applies an async mapper to `input` with a fixed worker-pool model.
 *
 * Why this exists:
 * - `Promise.all(input.map(mapper))` can create a large burst of parallel requests.
 * - This keeps only `concurrency` mapper calls in flight at a time.
 *
 * How it works:
 * 1) Pre-allocate `output` to preserve original input order.
 * 2) Spawn N workers (`N = resolvedConcurrency`).
 * 3) Each worker atomically claims the next index via the shared `nextIndex` counter.
 * 4) Worker runs `mapper` and stores result in `output[currentIndex]`.
 * 5) When all indexes are claimed, workers exit and `Promise.all(workers)` resolves.
 *
 * Guarantees:
 * - Max in-flight mapper calls <= `resolvedConcurrency`.
 * - Output order matches input order, even though completion order may differ.
 */

async function mapConcurrent<TInput, TOutput>(
    input: TInput[], // listingItems
    concurrency: number, // DETAIL_FETCH_CONCURRENCY (10)
    mapper: (item: TInput) => Promise<TOutput> // getStockAndSize
): Promise<TOutput[]> {
    if (!input.length) {
        return [];
    }

    // Clamp concurrency so we always have at least one worker and never more workers than jobs.
    const resolvedConcurrency = Math.max(1, Math.min(concurrency, input.length));
    // Pre-sized array lets us write each result back to its original slot.
    const output = new Array<TOutput>(input.length);
    let nextIndex = 0;

    // Start a worker pool. Each worker keeps pulling indexes until no work remains.
    const workers = new Array(resolvedConcurrency).fill(0).map(async () => {
        while (true) {
            // Each worker claims the next available index; this keeps output order deterministic.
            const currentIndex = nextIndex;
            nextIndex += 1;

            if (currentIndex >= input.length) {
                break;
            }

            const currentInput = input[currentIndex];
            if (currentInput !== undefined) {
                output[currentIndex] = await mapper(currentInput);
            }
        }
    });

    await Promise.all(workers);
    return output;
}

export default JDMain;
