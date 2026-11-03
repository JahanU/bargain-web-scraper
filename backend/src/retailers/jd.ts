import { log } from '@/log';
import { isBlockedName } from '@/retailers/blocklist';
import type { Listing, Product, Retailer } from '@/retailers/types';

const JD_BASE_URL = 'https://www.jdsports.co.uk';
const LISTING_URLS = ['https://www.jdsports.co.uk/men/brand/nike/sale/'] as const;

const REQUEST_TIMEOUT_MS = 15_000;

// Algolia's per-request maximum. JD categories usually fit in one page; larger ones are paged.
const HITS_PER_PAGE = 1000;

// A ceiling on pages per listing, so a misbehaving response can never loop for long.
const MAX_PAGES = 10;

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

interface AlgoliaPage {
    hits: JDHit[];
    nbHits?: number;
    nbPages?: number;
    /** False when nbHits is an estimate rather than an exact count. */
    exhaustiveNbHits?: boolean;
}

interface SearchResult {
    hits: JDHit[];
    complete: boolean;
}

export interface JDOptions {
    fetch?: typeof fetch;
    listingUrls?: readonly string[];
}

/** JD Sports UK, read straight from the Algolia index behind its listing pages. */
export function createJDRetailer({ fetch: fetchImpl = fetch, listingUrls = LISTING_URLS }: JDOptions = {}): Retailer {
    // Search configs learned from listing pages, reused across runs. `hadHits` records whether the
    // config found products last time (see fetchHits).
    const configs = new Map<string, { config: JDSearchConfig; hadHits: boolean }>();

    async function fetchHits(url: string): Promise<SearchResult> {
        const cached = configs.get(url);

        try {
            let config = cached?.config ?? (await bootstrapSearchConfig(url));
            let result = await runSearch(config);

            // A config that found products last time and finds none now may have stale filters (JD
            // renamed a facet): re-read the page once. A genuinely empty sale is then cached as such,
            // so it doesn't cost an extra page fetch every run.
            if (cached?.hadHits && !result.hits.length) {
                config = await bootstrapSearchConfig(url);
                result = await runSearch(config);
            }

            configs.set(url, { config, hadHits: result.hits.length > 0 });
            return result;
        } catch (error) {
            // Rotated key, renamed index or an unreadable response: relearn the config next run.
            configs.delete(url);
            throw error;
        }
    }

    /** Reads every page of a listing. Marks the result incomplete if Algolia holds back products. */
    async function runSearch(config: JDSearchConfig): Promise<SearchResult> {
        const hits: JDHit[] = [];
        let last: AlgoliaPage | undefined;

        for (let page = 0; page < MAX_PAGES; page++) {
            last = await searchPage(config, page);
            hits.push(...last.hits);

            if (!last.hits.length || page + 1 >= (last.nbPages ?? 1)) {
                break;
            }
        }

        const nbHits = last?.nbHits;
        // When Algolia says its count is only an estimate, a short last page is the real end of the list.
        // An empty page is not: it is also what a page past Algolia's pagination cap looks like.
        const ranOut = last?.exhaustiveNbHits === false && last.hits.length > 0 && last.hits.length < HITS_PER_PAGE;

        // Algolia can cap how deep pagination goes. Keep what we got, but say it is not everything,
        // so the products it didn't return aren't treated as gone.
        const complete = typeof nbHits !== 'number' || hits.length >= nbHits || ranOut;
        if (!complete) {
            log.warn('JD listing truncated: missing products will not be removed this run', {
                nbHits,
                returned: hits.length,
            });
        }

        return { hits, complete };
    }

    async function searchPage(config: JDSearchConfig, page: number): Promise<AlgoliaPage> {
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
                    page,
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
        const body = (await response.json()) as Partial<AlgoliaPage> & { exhaustive?: { nbHits?: boolean } };
        if (!Array.isArray(body.hits)) {
            throw new Error('Algolia response contained no hits');
        }

        // Newer Algolia responses report exhaustiveness under `exhaustive.nbHits`.
        const exhaustiveNbHits = body.exhaustiveNbHits ?? body.exhaustive?.nbHits;
        return { hits: body.hits, nbHits: body.nbHits, nbPages: body.nbPages, exhaustiveNbHits };
    }

    async function bootstrapSearchConfig(url: string): Promise<JDSearchConfig> {
        const response = await fetchImpl(url, {
            headers: DEFAULT_HEADERS,
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

    return {
        id: 'jd',
        async fetchListing(): Promise<Listing> {
            const results = await Promise.allSettled(
                listingUrls.map(async (url) => {
                    const gender = getGenderFromUrl(url);
                    const { hits, complete } = await fetchHits(url);
                    const products = hits.map((hit) => parseHit(hit, gender)).filter((item) => item !== undefined);
                    return { products, complete };
                }),
            );

            const listings = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
            const failures = results.flatMap((result, index) =>
                result.status === 'rejected' ? [{ url: listingUrls[index], error: result.reason }] : [],
            );

            // Nothing usable: fail, so the previous deals are kept.
            if (!listings.length) {
                throw failures[0]?.error ?? new Error('JD has no listings configured');
            }

            // Some categories failed: keep the ones that worked, but the listing is not the whole catalogue.
            if (failures.length) {
                log.warn('JD listings failed: missing products will not be removed this run', { failures });
            }

            return {
                products: listings.flatMap((listing) => listing.products),
                complete: !failures.length && listings.every((listing) => listing.complete),
            };
        },
    };
}

/** The part of a server-rendered Algolia search this scraper reads. */
interface ServerSearch {
    requestParams?: { facetFilters?: unknown }[];
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
        const searches: ServerSearch[] = Object.values(pageProps?.searchServerState?.initialResults ?? {});
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
 * Maps one hit to a product, or nothing if it is incomplete or blocked. Out-of-stock hits are
 * kept (inStock: false), so even an incomplete listing can drop them.
 */
export function parseHit(hit: JDHit, gender: string): Product | undefined {
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
