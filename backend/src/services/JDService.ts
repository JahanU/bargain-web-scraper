import { filterData } from '../helper/filterData';
import type { Item } from '../interfaces/Item';

const JD_BASE_URL = 'https://www.jdsports.co.uk';
const LISTING_URLS = [
    'https://www.jdsports.co.uk/men/brand/nike/sale/',
    // 'https://www.jdsports.co.uk/men/brand/adidas-originals,adidas,nike,champion,under-armour,the-north-face,new-balance,lacoste,tommy-hilfiger,calvin-klein-underwear,levis,columbia,jordan,emporio-armani-ea7,berghaus,polo-ralph-lauren,boss,fred-perry,asics/sale/',
    // 'https://www.jdsports.co.uk/men/mens-footwear/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,vans,tommy-hilfiger,calvin-klein-underwear,levis,columbia,reebok,jordan,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics,converse/sale/',
] as const;

const REQUEST_TIMEOUT_MS = 15000;

// Algolia's per-request maximum. JD categories run to a few hundred products, so one request covers them.
const HITS_PER_PAGE = 1000;

// Without this the response carries every merchandising field JD holds: 85KB instead of ~2MB.
const PRODUCT_ATTRIBUTES = [
    'name', 'slug', 'objectID', 'discountPct', 'price', 'wasPrice', 'image', 'size', 'inStock',
];

// A JD listing page server-renders only its first 24 products; the browser fetches the rest from
// Algolia as you scroll. This script tag holds the credentials and filters needed to ask Algolia
// for the whole category in one request.
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

const seenItemsCache = new Set<string>();

// Learned from a listing page, then reused. Dropped whenever a search fails so the next run relearns it.
const searchConfigCache = new Map<string, JDSearchConfig>();

const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; bargain-web-scraper/1.0)',
};

/** Everything needed to query one listing's products directly. */
interface JDSearchConfig {
    applicationId: string;
    searchApiKey: string;
    indexName: string;
    facetFilters: unknown;
}

/** The Algolia hit fields this scraper reads. */
interface JDHit {
    name?: string;
    slug?: string;
    objectID?: string;
    discountPct?: string;
    price?: number;
    wasPrice?: number;
    image?: string;
    size?: string[];
    inStock?: boolean;
}

/**
 * Entry point for JD scraping: reads every listing and sorts by highest discount.
 */
async function JDMain(discountLimit: number, resetCacheFlag: boolean): Promise<Item[]> {
    console.log('[JDService] Starting JD scrape...');
    if (resetCacheFlag) {
        console.log('[JDService] Reset cache flag detected. Clearing seen items cache.');
        seenItemsCache.clear();
        return [];
    }

    const listings = await Promise.all(LISTING_URLS.map((url) => scrapeListing(url, discountLimit)));
    const items = listings.flat().sort((a, b) => b.discount - a.discount);

    console.log(`[JDService] Found ${items.length} items across ${LISTING_URLS.length} listings.`);
    return items;
}

/**
 * Fetches one listing's products and maps them to items.
 */
async function scrapeListing(url: string, discountLimit: number): Promise<Item[]> {
    try {
        console.log(`[JDService] Scraping listing: ${url}`);
        const hits = await fetchHits(url);
        const gender = getGenderFromUrl(url);

        const items = hits
            .map((hit) => parseHit(hit, gender, discountLimit))
            .filter((item): item is Item => item !== undefined);

        console.log(`[JDService] Extracted ${items.length} of ${hits.length} products from: ${url}`);
        return items;
    } catch (error) {
        console.error(`[JDService] Failed to scrape JD listing: ${url}`, error);
        return [];
    }
}

/**
 * Queries Algolia for a listing's products, learning the search config from the
 * listing page on first use and any time the cached config stops working.
 */
async function fetchHits(url: string): Promise<JDHit[]> {
    const config = searchConfigCache.get(url) ?? await bootstrapSearchConfig(url);

    try {
        const hits = await runSearch(config);
        searchConfigCache.set(url, config);
        return hits;
    } catch (error) {
        // Rotated key, renamed index or an unreadable response: forget the config so the next run
        // bootstraps a fresh one instead of repeating a request that can no longer succeed.
        searchConfigCache.delete(url);
        throw error;
    }
}

/**
 * Reads a listing's products straight from Algolia, the same source the site's own grid uses.
 */
async function runSearch(config: JDSearchConfig): Promise<JDHit[]> {
    const response = await fetch(
        `https://${config.applicationId}-dsn.algolia.net/1/indexes/${config.indexName}/query`,
        {
            method: 'POST',
            headers: {
                ...defaultHeaders,
                'x-algolia-application-id': config.applicationId,
                'x-algolia-api-key': config.searchApiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                facetFilters: config.facetFilters,
                hitsPerPage: HITS_PER_PAGE,
                attributesToRetrieve: PRODUCT_ATTRIBUTES,
                attributesToHighlight: [],
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
    );

    if (!response.ok) {
        throw new Error(`Algolia search failed with status ${response.status}`);
    }

    // Throws on a soft-200 non-JSON body, which the caller treats as a stale config.
    const { hits, nbHits } = await response.json() as { hits?: JDHit[], nbHits?: number };
    if (!Array.isArray(hits)) {
        throw new Error('Algolia response contained no hits');
    }

    if (typeof nbHits === 'number' && nbHits > hits.length) {
        console.warn(`[JDService] Listing has ${nbHits} products but only ${hits.length} were returned.`);
    }

    return hits;
}

/**
 * Learns the Algolia credentials and filters for a listing from the listing page itself,
 * so a rotated key or an edited category is picked up without a code change.
 */
async function bootstrapSearchConfig(url: string): Promise<JDSearchConfig> {
    console.log(`[JDService] Reading search config from listing page: ${url}`);
    const response = await fetch(url, {
        headers: defaultHeaders,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Listing page returned status ${response.status}`);
    }

    const config = extractSearchConfig(await response.text());
    if (!config) {
        throw new Error('Listing page payload had no usable Algolia search config');
    }

    return config;
}

/**
 * Pulls the Algolia credentials, product index and category filters out of a listing page.
 */
function extractSearchConfig(html: string): JDSearchConfig | undefined {
    const payload = html.match(NEXT_DATA_PATTERN)?.[1];
    if (!payload) {
        return undefined;
    }

    try {
        const pageProps = JSON.parse(payload)?.props?.pageProps;
        const { applicationId, searchApiKey, indices } = pageProps?.algoliaConfig ?? {};
        const indexName = indices?.find((index: any) => index?.type === 'main')?.name;

        // The server-rendered search carries the exact filters behind this listing's URL.
        const searches = Object.values<any>(pageProps?.searchServerState?.initialResults ?? {});
        const facetFilters = searches[0]?.requestParams?.[0]?.facetFilters;

        if (!applicationId || !searchApiKey || !indexName || !facetFilters) {
            return undefined;
        }

        return { applicationId, searchApiKey, indexName, facetFilters };
    } catch {
        return undefined;
    }
}

/**
 * Maps one hit to an item, returning nothing if it fails any filter.
 * Filters run cheapest-first so most rejects cost almost nothing.
 */
function parseHit(hit: JDHit, gender: string, discountLimit: number): Item | undefined {
    if (!hit.slug || !hit.objectID || !hit.inStock) {
        return undefined;
    }

    const discount = Number.parseInt(hit.discountPct ?? '', 10) || 0;
    if (discount < discountLimit) {
        return undefined;
    }

    const name = hit.name?.trim();
    if (!name || filterData(name.toLowerCase())) {
        return undefined;
    }

    const url = `${JD_BASE_URL}/product/${hit.slug}/${hit.objectID}/`;
    if (seenItemsCache.has(url)) {
        return undefined;
    }
    seenItemsCache.add(url);

    // JD occasionally ships a truncated size facet, e.g. "6 (EU 39".
    const sizes = hit.size?.filter((size) => !size.includes('('));

    return {
        name,
        wasPrice: hit.wasPrice ?? 0,
        nowPrice: hit.price ?? 0,
        discount,
        url,
        imageUrl: hit.image,
        sizes: sizes?.length ? sizes : undefined,
        inStock: 'IN STOCK',
        timestamp: Date.now(),
        gender,
    };
}

/**
 * Infers gender segment from listing URL.
 */
function getGenderFromUrl(url: string): string {
    return /\b(men|male)\b/i.test(url) ? 'Male' : 'Female';
}

export const __test__ = {
    extractSearchConfig,
    parseHit,
    getGenderFromUrl,
    seenItemsCache,
    searchConfigCache,
};

export default JDMain;
