import { filterData } from '../helper/filterData';
import type { Item } from '../interfaces/Item';

const JD_BASE_URL = 'https://www.jdsports.co.uk';
const JD_LOCALE = 'en-gb';

// Still capped at 24 items per listing — that's the Algolia pagination limit, unchanged by any of this.
const LISTING_URLS = [
    'https://www.jdsports.co.uk/men/brand/nike/sale/',
    // 'https://www.jdsports.co.uk/men/brand/adidas-originals,adidas,nike,champion,under-armour,the-north-face,new-balance,lacoste,tommy-hilfiger,calvin-klein-underwear,levis,columbia,jordan,emporio-armani-ea7,berghaus,polo-ralph-lauren,boss,fred-perry,asics/sale/',
    // 'https://www.jdsports.co.uk/men/mens-footwear/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,vans,tommy-hilfiger,calvin-klein-underwear,levis,columbia,reebok,jordan,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics,converse/sale/',
] as const;

const REQUEST_TIMEOUT_MS = 15000;

// JD is a Next.js app: the listing HTML carries no product markup, only a
// server-rendered Algolia payload embedded in this script tag.
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

const seenItemsCache = new Set<string>();

// Identifies the current JD deployment. Cached across runs and refreshed when JD redeploys.
let cachedBuildId: string | undefined;

const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; bargain-web-scraper/1.0)',
};

/** The Algolia hit fields this scraper reads. JD sends many more. */
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
 * Entry point for JD scraping: reads every listing page and sorts by highest discount.
 */
async function JDMain(discountLimit: number, resetCacheFlag: boolean): Promise<Item[]> {
    console.log('[JDService] Starting JD scrape...');
    if (resetCacheFlag) {
        console.log('[JDService] Reset cache flag detected. Clearing seen items cache.');
        seenItemsCache.clear();
        return [];
    }

    const pages = await Promise.all(LISTING_URLS.map((url) => scrapeListingPage(url, discountLimit)));
    const items = pages.flat().sort((a, b) => b.discount - a.discount);

    console.log(`[JDService] Found ${items.length} items on listing pages.`);
    return items;
}

/**
 * Fetches one listing page and maps its product payload to items.
 */
async function scrapeListingPage(url: string, discountLimit: number): Promise<Item[]> {
    try {
        console.log(`[JDService] Scraping listing page: ${url}`);
        const hits = await fetchHits(url);

        if (!hits.length) {
            console.warn(`[JDService] No product data found in page payload: ${url}`);
            return [];
        }

        const gender = getGenderFromUrl(url);
        const items = hits
            .map((hit) => parseHit(hit, gender, discountLimit))
            .filter((item): item is Item => item !== undefined);

        console.log(`[JDService] Extracted ${items.length} of ${hits.length} items from listing: ${url}`);
        return items;
    } catch (error) {
        console.error(`[JDService] Failed to scrape JD listing page: ${url}`, error);
        return [];
    }
}

/**
 * JD serves the same payload from two places: the listing HTML (~1.8MB) and a Next.js data
 * route (~440KB) keyed by the current build id. Reads the cheap JSON route, falling back to
 * the HTML page to (re)learn the build id on first run and whenever JD redeploys.
 * 
 * ~5.7× faster in steady state, 439 KB instead of 1848 KB.
 * 
 * Every later run hits /_next/data/{buildId}/en-gb/{path}.json directly.
 * When JD redeploys, the stale id returns a clean 404 (verified against the live site), 
 * so fetchDataRoute returns undefined and the next call transparently re-learns the id from HTML.
 */
async function fetchHits(url: string): Promise<JDHit[]> {
    if (cachedBuildId) {
        const hits = await fetchDataRoute(url, cachedBuildId);
        if (hits) {
            return hits;
        }
        console.log('[JDService] Build id is stale, refreshing from the listing page.');
    }

    const response = await fetchWithTimeout(url);
    const { buildId, hits } = parseNextData(await response.text());
    cachedBuildId = buildId;

    return hits;
}

/**
 * Reads hits from the Next.js data route.
 * Returns undefined when JD rejects the build id, signalling the caller to refresh it.
 */
async function fetchDataRoute(url: string, buildId: string): Promise<JDHit[] | undefined> {
    // The listing route is a catch-all page, so each path segment is also repeated as a slug param.
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const slugs = segments.map((segment) => `slug=${encodeURIComponent(segment)}`).join('&');
    const dataUrl = `${JD_BASE_URL}/_next/data/${buildId}/${JD_LOCALE}/${segments.join('/')}.json?${slugs}`;

    const response = await fetchWithTimeout(dataUrl);
    if (!response.ok) {
        return undefined;
    }

    return hitsFromPageProps(await response.json());
}

function fetchWithTimeout(url: string): Promise<Response> {
    return fetch(url, {
        headers: defaultHeaders,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
}

/**
 * Pulls the build id and product hits out of a listing page's embedded payload.
 */
function parseNextData(html: string): { buildId?: string, hits: JDHit[] } {
    const payload = html.match(NEXT_DATA_PATTERN)?.[1];
    if (!payload) {
        return { hits: [] };
    }

    try {
        const nextData = JSON.parse(payload);
        return { buildId: nextData?.buildId, hits: hitsFromPageProps(nextData?.props) };
    } catch {
        return { hits: [] };
    }
}

/**
 * Collects product hits from page props. The HTML payload nests these under `props`,
 * the data route returns them at the top level, and index keys are generated per
 * request, so every entry is walked rather than looked up by name.
 */
function hitsFromPageProps(props: any): JDHit[] {
    const indexes = props?.pageProps?.searchServerState?.initialResults ?? {};

    return Object.values<any>(indexes)
        .flatMap((index) => index?.results ?? [])
        .flatMap((result: any) => result?.hits ?? []);
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
    parseNextData,
    hitsFromPageProps,
    parseHit,
    getGenderFromUrl,
    seenItemsCache,
};

export default JDMain;
