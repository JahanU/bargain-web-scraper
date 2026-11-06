import { createLogger, duration } from '@/log';
import { isBlockedName } from '@/retailers/blocklist';
import type { Listing, Product, Retailer } from '@/retailers/types';

const log = createLogger('jd');

const JD_BASE_URL = 'https://www.jdsports.co.uk';
const LISTING_URLS = ['https://www.jdsports.co.uk/men/mens-footwear/brand/nike/sale/'] as const;

const REQUEST_TIMEOUT_MS = 15_000;

// Algolia's per-request maximum. JD categories usually fit in one page; larger ones are paged.
const HITS_PER_PAGE = 1000;

// A ceiling on pages per listing, so a misbehaving response can never loop for long.
const MAX_PAGES = 10;

// Without this the response carries every merchandising field JD holds: 28KB instead of 3KB for
// 36 products, 569KB instead of 41KB for 2,455 (gzipped).
const PRODUCT_ATTRIBUTES = ['name', 'slug', 'objectID', 'discountPct', 'price', 'wasPrice', 'image', 'size', 'inStock'];

// A JD listing page server-renders only its first 24 products; the browser fetches the rest from
// Algolia as you scroll. This script tag holds the credentials and filters needed to ask Algolia
// for the whole category in one request.
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

const DEFAULT_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; bargain-web-scraper/2.0)' };

// Product pages fetched at once when checking live stock.
const STOCK_CHECK_CONCURRENCY = 6;

/** Live stock read from a product page; Algolia's copy can lag behind it. */
export interface PageStock {
    inStock: boolean;
    sizes: string[];
}

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
    exhaustive?: { nbHits?: boolean };
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
    // Search configs learned from listing pages, reused across runs.
    const configs = new Map<string, JDSearchConfig>();
    // Each product page's last stock, and its ETag so an unchanged page costs a bodiless 304.
    const pageStock = new Map<string, { etag: string | null; stock: PageStock }>();

    /** Reads a product page's live stock. Throws if the page can't be read. */
    async function readPageStock(url: string): Promise<PageStock> {
        const cached = pageStock.get(url);
        const response = await fetchImpl(url, {
            headers: cached?.etag ? { ...DEFAULT_HEADERS, 'if-none-match': cached.etag } : DEFAULT_HEADERS,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (response.status === 304 && cached) {
            return cached.stock;
        }
        if (!response.ok) {
            throw new Error(`status ${response.status}`);
        }
        const stock = extractPageStock(await response.text());
        if (!stock) {
            throw new Error('no product data on the page');
        }
        pageStock.set(url, { etag: response.headers.get('etag'), stock });
        return stock;
    }

    /**
     * Overrides Algolia's stock with each product page's, reading every page once even when a
     * product is in several listings. An unreadable page falls back to its last known stock, then
     * to Algolia's. Checks only what Algolia says is in stock: its out-of-stock flag is never a
     * false alarm here.
     */
    async function checkAllStock(products: Product[]): Promise<Product[]> {
        const urls = [...new Set(products.filter((product) => product.inStock).map((product) => product.url))];
        const stock = new Map<string, PageStock | undefined>();
        let failed = 0;

        // A pool of workers sharing one queue, so one slow page never holds up the others.
        const queue = urls.values();
        const worker = async () => {
            for (const url of queue) {
                try {
                    stock.set(url, await readPageStock(url));
                } catch (error) {
                    failed++;
                    log.debug('product page unreadable', { url, error: String(error) });
                    stock.set(url, pageStock.get(url)?.stock);
                }
            }
        };
        await Promise.all(Array.from({ length: STOCK_CHECK_CONCURRENCY }, worker));

        if (failed) {
            log.warn("⚠ product pages unreadable: using their last known stock, or Algolia's", {
                failed,
                checked: urls.length,
            });
        }
        return products.map((product) => (product.inStock ? { ...product, ...stock.get(product.url) } : product));
    }

    /** Forgets pages for products no longer listed. Only safe after a complete listing. */
    function pruneStockCache(products: Product[]) {
        const listed = new Set(products.map((product) => product.url));
        for (const url of pageStock.keys()) {
            if (!listed.has(url)) {
                pageStock.delete(url);
            }
        }
    }

    async function fetchHits(url: string): Promise<SearchResult> {
        const cached = configs.get(url);

        try {
            let config = cached ?? (await bootstrapSearchConfig(url));
            let result = await runSearch(config);

            // A cached config that finds nothing may have stale filters (JD renamed a facet): re-read
            // the page. A genuinely empty sale costs one extra page read per run.
            if (cached && !result.hits.length) {
                log.warn('⚠ cached search found nothing; re-reading the listing page in case its filters changed', {
                    url,
                });
                config = await bootstrapSearchConfig(url);
                result = await runSearch(config);
            }

            configs.set(url, config);
            return result;
        } catch (error) {
            // Rotated key, renamed index or an unreadable response: relearn the config next run.
            log.debug('forgetting the search config after an error; it will be re-learned next run', { url });
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
        const ranOut = last?.exhaustive?.nbHits === false && last.hits.length > 0 && last.hits.length < HITS_PER_PAGE;

        // Algolia can cap how deep pagination goes. Keep what we got, but say it is not everything,
        // so the products it didn't return aren't treated as gone.
        const complete = typeof nbHits !== 'number' || hits.length >= nbHits || ranOut;
        if (!complete) {
            log.warn('⚠ listing truncated by Algolia: products it held back will not be removed this run', {
                nbHits,
                returned: hits.length,
            });
        }

        return { hits, complete };
    }

    async function searchPage(config: JDSearchConfig, page: number): Promise<AlgoliaPage> {
        const started = performance.now();
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
        const body = (await response.json()) as Partial<AlgoliaPage>;
        if (!Array.isArray(body.hits)) {
            throw new Error('Algolia response contained no hits');
        }

        log.debug(`algolia page ${page + 1}/${body.nbPages ?? 1}`, {
            hits: body.hits.length,
            total: body.nbHits,
            took: duration(performance.now() - started),
        });
        return { hits: body.hits, nbHits: body.nbHits, nbPages: body.nbPages, exhaustive: body.exhaustive };
    }

    async function bootstrapSearchConfig(url: string): Promise<JDSearchConfig> {
        log.debug('reading listing page for search settings', { url });
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

        log.debug('learned search settings', { index: config.indexName });
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
                    log.debug('listing parsed', {
                        url,
                        hits: hits.length,
                        products: products.length,
                        skipped: hits.length - products.length, // blocked names or incomplete hits
                        complete,
                    });
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
                log.warn('⚠ some listings failed: missing products will not be removed this run', {
                    failed: failures.map((failure) => failure.url).join(','),
                });
            }

            const products = await checkAllStock(listings.flatMap((listing) => listing.products));
            const complete = !failures.length && listings.every((listing) => listing.complete);
            if (complete) {
                pruneStockCache(products);
            }
            log.debug('stock checked', { outOfStock: products.filter((product) => !product.inStock).length });
            return { products, complete };
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

/** Reads live stock from a product page: the sizes whose variant is available. */
export function extractPageStock(html: string): PageStock | undefined {
    const payload = html.match(NEXT_DATA_PATTERN)?.[1];
    try {
        const product = payload && JSON.parse(payload)?.props?.pageProps?.product;
        if (!Array.isArray(product?.variants)) {
            return undefined;
        }
        const sizes: string[] = product.variants
            .filter((variant: { stock?: { available?: boolean } }) => variant?.stock?.available === true)
            .map((variant: { size: string }) => variant.size);
        return { inStock: product.isOutOfStock !== true && sizes.length > 0, sizes };
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

    return {
        externalId: hit.objectID,
        name,
        url: `${JD_BASE_URL}/product/${hit.slug}/${hit.objectID}/`,
        imageUrl: hit.image ?? null,
        gender,
        // JD occasionally ships a truncated size facet, e.g. "6 (EU 39".
        sizes: (hit.size ?? []).filter((size) => !size.includes('(')),
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
