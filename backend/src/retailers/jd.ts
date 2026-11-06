import { UNISEX } from '@/deals';
import { createLogger, duration } from '@/log';
import { isBlockedName } from '@/retailers/blocklist';
import type { Listing, Product, Retailer } from '@/retailers/types';

const log = createLogger('jd');

const JD_BASE_URL = 'https://www.jdsports.co.uk';

// Any JD listing page carries the Algolia credentials in its __NEXT_DATA__ script tag.
const CONFIG_PAGE_URL = `${JD_BASE_URL}/men/sale/`;
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

// Every men's and women's sale product, each listed once (a unisex product carries both categories).
const FACET_FILTERS = [['onSale:true'], ['hierarchicalCategories.lvl0:Men', 'hierarchicalCategories.lvl0:Women']];

// Algolia's per-request maximum. The index serves at most 5,000 hits per query.
const HITS_PER_PAGE = 1000;

// Only what parseHit reads, instead of every merchandising field JD holds.
const ATTRIBUTES = [
    'objectID',
    'name',
    'slug',
    'price',
    'wasPrice',
    'discountPct',
    'image',
    'size',
    'inStock',
    'hierarchicalCategories.lvl0',
];

const REQUEST_TIMEOUT_MS = 15_000;
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; bargain-web-scraper/2.0)' };

interface SearchConfig {
    applicationId: string;
    searchApiKey: string;
    indexName: string;
}

interface Hit {
    objectID: string;
    name: string;
    slug: string;
    price: number;
    wasPrice: number;
    discountPct: string;
    image: string;
    size: string[];
    inStock: boolean;
    hierarchicalCategories: { lvl0: string[] };
}

interface SearchPage {
    hits: Hit[];
    nbHits: number;
    nbPages: number;
}

/** JD Sports UK's men's and women's sale, read straight from the Algolia index behind its site. */
export function createJDRetailer({ fetch: fetchImpl = fetch }: { fetch?: typeof fetch } = {}): Retailer {
    // Learned once, and forgotten after any error (rotated key, renamed index) so the next run relearns it.
    let config: SearchConfig | undefined;

    async function learnConfig(): Promise<SearchConfig> {
        const response = await fetchImpl(CONFIG_PAGE_URL, {
            headers: HEADERS,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`Listing page returned status ${response.status}`);
        }
        const learned = extractSearchConfig(await response.text());
        if (!learned) {
            throw new Error('Listing page has no Algolia search config');
        }
        return learned;
    }

    async function searchPage({ applicationId, searchApiKey, indexName }: SearchConfig, page: number) {
        const started = performance.now();
        const response = await fetchImpl(`https://${applicationId}-dsn.algolia.net/1/indexes/${indexName}/query`, {
            method: 'POST',
            headers: { ...HEADERS, 'x-algolia-application-id': applicationId, 'x-algolia-api-key': searchApiKey },
            body: JSON.stringify({
                facetFilters: FACET_FILTERS,
                hitsPerPage: HITS_PER_PAGE,
                page,
                attributesToRetrieve: ATTRIBUTES,
                attributesToHighlight: [],
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`Algolia search failed with status ${response.status}`);
        }
        const body = (await response.json()) as SearchPage;
        log.debug(`algolia page ${page + 1}/${body.nbPages}`, {
            hits: body.hits.length,
            took: duration(performance.now() - started),
        });
        return body;
    }

    /** Page 0 says how many pages there are; the rest are fetched in parallel. */
    async function readSale(current: SearchConfig): Promise<Listing> {
        const first = await searchPage(current, 0);
        const rest = await Promise.all(Array.from({ length: first.nbPages - 1 }, (_, i) => searchPage(current, i + 1)));
        const hits = [first, ...rest].flatMap((page) => page.hits);

        // Algolia caps how deep pagination goes. Keep what we got, but say it is not everything,
        // so the products it held back aren't treated as gone.
        const complete = hits.length >= first.nbHits;
        if (!complete) {
            log.warn('⚠ listing truncated by Algolia: missing products will not be removed this run', {
                nbHits: first.nbHits,
                returned: hits.length,
            });
        }
        return { products: hits.map(parseHit).filter((product) => product !== undefined), complete };
    }

    return {
        id: 'jd',
        async fetchListing() {
            try {
                config ??= await learnConfig();
                return await readSale(config);
            } catch (error) {
                config = undefined;
                throw error;
            }
        },
    };
}

/** Pulls the Algolia credentials and main product index out of a listing page. */
export function extractSearchConfig(html: string): SearchConfig | undefined {
    try {
        const payload = JSON.parse(html.match(NEXT_DATA_PATTERN)?.[1] ?? '');
        const { applicationId, searchApiKey, indices } = payload.props.pageProps.algoliaConfig;
        const indexName = indices.find((index: { type: string }) => index.type === 'main')?.name;
        return applicationId && searchApiKey && indexName ? { applicationId, searchApiKey, indexName } : undefined;
    } catch {
        return undefined;
    }
}

/** Maps one hit to a product, or nothing if its name is blocked. */
export function parseHit(hit: Hit): Product | undefined {
    if (isBlockedName(hit.name)) {
        return undefined;
    }
    const categories = hit.hierarchicalCategories.lvl0;
    const women = categories.includes('Women');
    return {
        externalId: hit.objectID,
        name: hit.name,
        url: `${JD_BASE_URL}/product/${hit.slug}/${hit.objectID}/`,
        imageUrl: hit.image,
        gender: women && categories.includes('Men') ? UNISEX : women ? 'Female' : 'Male',
        // JD cuts some labels short, e.g. "6 (EU 39" next to "6 (EU 40": close the bracket.
        sizes: hit.size.map((size) => (size.includes('(') && !size.includes(')') ? `${size})` : size)),
        wasPricePence: Math.round(hit.wasPrice * 100),
        nowPricePence: Math.round(hit.price * 100),
        discount: Number.parseInt(hit.discountPct, 10),
        inStock: hit.inStock,
    };
}
