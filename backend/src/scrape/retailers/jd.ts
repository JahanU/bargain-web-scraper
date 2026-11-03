import { isBlockedName } from '../filters';
import type { ProductSnapshot, Retailer } from './types';

const JD_BASE_URL = 'https://www.jdsports.co.uk';
const LISTING_URLS = [
    'https://www.jdsports.co.uk/men/brand/nike/sale/',
] as const;

const REQUEST_TIMEOUT_MS = 15_000;

// Algolia's per-request maximum. JD categories run to a few hundred products, so one request covers them.
const HITS_PER_PAGE = 1000;

// Without this the response carries every merchandising field JD holds: 85KB instead of ~2MB.
const PRODUCT_ATTRIBUTES = ['name', 'slug', 'objectID', 'discountPct', 'price', 'wasPrice', 'image', 'size', 'inStock'];

// A JD listing page server-renders only its first 24 products; the browser fetches the rest from
// Algolia as you scroll. This script tag holds the credentials and filters needed to ask Algolia
// for the whole category in one request.
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

const DEFAULT_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; bargain-web-scraper/2.0)' };

/** Everything needed to query one listing's products directly. */
export interface JDSearchConfig {
    applicationId: string;
    searchApiKey: string;
    indexName: string;
    facetFilters: unknown;
}

/** The Algolia hit fields this scraper reads. */
export interface JDHit {
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

/** JD Sports UK, read straight from the Algolia index behind its listing pages. */
export function createJDRetailer(fetchImpl: typeof fetch = fetch): Retailer {
    // Learned from a listing page, then reused. Dropped whenever a search fails so the next run relearns it.
    const searchConfigCache = new Map<string, JDSearchConfig>();

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

    async function runSearch(config: JDSearchConfig): Promise<JDHit[]> {
        const response = await fetchImpl(
            `https://${config.applicationId}-dsn.algolia.net/1/indexes/${config.indexName}/query`,
            {
                method: 'POST',
                headers: {
                    ...DEFAULT_HEADERS,
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
            },
        );

        if (!response.ok) {
            throw new Error(`Algolia search failed with status ${response.status}`);
        }

        // Throws on a soft-200 non-JSON body, which the caller treats as a stale config.
        const { hits, nbHits } = await response.json() as { hits?: JDHit[]; nbHits?: number };
        if (!Array.isArray(hits)) {
            throw new Error('Algolia response contained no hits');
        }

        // A truncated catalogue would make reconcile think the rest sold out. Fail loudly instead.
        if (typeof nbHits === 'number' && nbHits > hits.length) {
            throw new Error(`Listing has ${nbHits} products but only ${hits.length} were returned`);
        }

        return hits;
    }

    async function bootstrapSearchConfig(url: string): Promise<JDSearchConfig> {
        const response = await fetchImpl(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!response.ok) {
            throw new Error(`Listing page returned status ${response.status}`);
        }

        const config = extractSearchConfig(await response.text());
        if (!config) {
            throw new Error('Listing page payload had no usable Algolia search config');
        }

        return config;
    }

    return {
        id: 'jd',
        async fetchListings() {
            const listings = await Promise.all(LISTING_URLS.map(async (url) => {
                const gender = getGenderFromUrl(url);
                const hits = await fetchHits(url);
                return hits.map((hit) => parseHit(hit, gender)).filter((item) => item !== undefined);
            }));

            return listings.flat();
        },
    };
}

/** Pulls the Algolia credentials, product index and category filters out of a listing page. */
export function extractSearchConfig(html: string): JDSearchConfig | undefined {
    const payload = html.match(NEXT_DATA_PATTERN)?.[1];
    if (!payload) {
        return undefined;
    }

    try {
        const pageProps = JSON.parse(payload)?.props?.pageProps;
        const { applicationId, searchApiKey, indices } = pageProps?.algoliaConfig ?? {};
        const indexName = indices?.find((index: { type?: string }) => index?.type === 'main')?.name;

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
 * Maps one hit to a snapshot, or nothing if it is incomplete or blocked.
 * Out-of-stock hits are kept (inStock: false) so reconcile can mark them sold out.
 */
export function parseHit(hit: JDHit, gender: string): ProductSnapshot | undefined {
    const name = hit.name?.trim();
    if (!hit.slug || !hit.objectID || !name || isBlockedName(name)) {
        return undefined;
    }

    // JD occasionally ships a truncated size facet, e.g. "6 (EU 39".
    const sizes = (hit.size ?? []).filter((size) => !size.includes('('));

    return {
        externalId: hit.objectID,
        name,
        url: `${JD_BASE_URL}/product/${hit.slug}/${hit.objectID}/`,
        imageUrl: hit.image ?? null,
        gender,
        sizes,
        wasPricePence: toPence(hit.wasPrice),
        nowPricePence: toPence(hit.price),
        discount: Number.parseInt(hit.discountPct ?? '', 10) || 0,
        inStock: hit.inStock === true,
    };
}

/** Infers the gender segment from a listing URL. */
export function getGenderFromUrl(url: string): string {
    return /\b(men|male)\b/i.test(url) ? 'Male' : 'Female';
}

function toPence(pounds: number | undefined): number {
    return Math.round((pounds ?? 0) * 100);
}
