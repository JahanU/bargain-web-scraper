import { UNISEX } from '@/deals';
import { createLogger, duration } from '@/log';
import { isBlockedName } from '@/retailers/blocklist';
import { BRAND_SPELLINGS, canonicalBrand } from '@/retailers/brands';
import { categoryIn } from '@/retailers/category';
import { request } from '@/retailers/request';
import type { Listing, Product, Retailer } from '@/retailers/types';

const log = createLogger('jd');

const JD_BASE_URL = 'https://www.jdsports.co.uk';

// Any JD listing page carries the Algolia credentials in its __NEXT_DATA__ script tag.
const CONFIG_PAGE_URL = `${JD_BASE_URL}/men/sale/`;
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

// JD's top-level categories we read. Each is its own query: Algolia serves at most 5,000 hits per
// query, and the men's and women's sales together can pass that.
const CATEGORIES = ['Men', 'Women'];

// Only the brands we list. JD matches brand names whatever their case.
const BRAND_FILTER = BRAND_SPELLINGS.map((brand) => `brand:${brand}`);

// Algolia's per-request maximum.
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
    'hierarchicalCategories.lvl1',
    'brand',
    'category',
];

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
    hierarchicalCategories: { lvl0: string[]; lvl1?: string[] };
    brand?: string[];
    category?: string[];
}

interface SearchPage {
    hits: Hit[];
    nbHits: number;
    nbPages: number;
}

/** JD Sports UK's men's and women's sale, read straight from the Algolia index behind its site. */
export function createJDRetailer(): Retailer {
    // Learned once, and forgotten after any error (rotated key, renamed index) so the next run relearns it.
    let config: SearchConfig | undefined;

    /** Reads the Algolia credentials and main product index out of a listing page. */
    async function learnConfig(): Promise<SearchConfig> {
        const response = await request('Listing page', CONFIG_PAGE_URL);
        const payload = JSON.parse((await response.text()).match(NEXT_DATA_PATTERN)?.[1] ?? 'null');
        const { applicationId, searchApiKey, indices } = payload?.props?.pageProps?.algoliaConfig ?? {};
        const indexName = indices?.find((index: { type: string }) => index.type === 'main')?.name;
        if (!applicationId || !searchApiKey || !indexName) {
            throw new Error('Listing page has no Algolia search config');
        }
        return { applicationId, searchApiKey, indexName };
    }

    async function searchPage(
        { applicationId, searchApiKey, indexName }: SearchConfig,
        category: string,
        page: number,
    ) {
        const started = performance.now();
        const response = await request(
            'Algolia search',
            `https://${applicationId}-dsn.algolia.net/1/indexes/${indexName}/query`,
            {
                method: 'POST',
                headers: { 'x-algolia-application-id': applicationId, 'x-algolia-api-key': searchApiKey },
                body: JSON.stringify({
                    facetFilters: [['onSale:true'], [`hierarchicalCategories.lvl0:${category}`], BRAND_FILTER],
                    hitsPerPage: HITS_PER_PAGE,
                    page,
                    attributesToRetrieve: ATTRIBUTES,
                    // Without this, Algolia adds match highlighting to every hit: 2.5MB a page instead of 320KB.
                    attributesToHighlight: [],
                }),
            },
        );
        const body = (await response.json()) as SearchPage;
        log.debug(`algolia ${category} page ${page + 1}/${body.nbPages}`, {
            hits: body.hits.length,
            took: duration(performance.now() - started),
        });
        return body;
    }

    /** One category's sale. Page 0 says how many pages there are; the rest are fetched in parallel. */
    async function readCategory(current: SearchConfig, category: string) {
        const first = await searchPage(current, category, 0);
        const rest = await Promise.all(
            Array.from({ length: first.nbPages - 1 }, (_, i) => searchPage(current, category, i + 1)),
        );
        const hits = [first, ...rest].flatMap((page) => page.hits);

        // Algolia caps how deep pagination goes. Keep what we got, but say it is not everything,
        // so the products it held back aren't treated as gone.
        const complete = hits.length >= first.nbHits;
        if (!complete) {
            log.warn('⚠ listing truncated by Algolia: missing products will not be removed this run', {
                category,
                nbHits: first.nbHits,
                returned: hits.length,
            });
        }
        return { hits, complete };
    }

    async function readSale(current: SearchConfig): Promise<Listing> {
        const categories = await Promise.all(CATEGORIES.map((category) => readCategory(current, category)));
        // A unisex product is in both categories: keep one copy.
        const hits = new Map(categories.flatMap((category) => category.hits).map((hit) => [hit.objectID, hit]));
        const listed = [...hits.values()].filter((hit) => !isBlockedName(hit.name));
        const products = listed.map(parseHit).filter((product) => product !== undefined);
        if (products.length < listed.length) {
            log.warn('⚠ skipped hits with no usable brand or category', { skipped: listed.length - products.length });
        }
        return {
            products,
            complete: categories.every((category) => category.complete),
        };
    }

    return {
        id: 'jd',
        name: 'JD Sports',
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

/** JD's own `category` when it names a kind we know, else the kind in its lvl1 paths. */
function categoryOf(hit: Hit) {
    return categoryIn(hit.category?.slice(0, 1) ?? []) ?? categoryIn(hit.hierarchicalCategories.lvl1 ?? []);
}

/** Maps one hit to a product, or nothing if it has no brand we list or no category we can tell. */
function parseHit(hit: Hit): Product | undefined {
    const brand = canonicalBrand(hit.brand?.[0] ?? '');
    const category = categoryOf(hit);
    if (!brand || !category) {
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
        brand,
        category,
        // JD cuts some labels short, e.g. "6 (EU 39" next to "6 (EU 40": close the bracket.
        sizes: hit.size.map((size) => (size.includes('(') && !size.includes(')') ? `${size})` : size)),
        wasPricePence: Math.round(hit.wasPrice * 100),
        nowPricePence: Math.round(hit.price * 100),
        discount: Number.parseInt(hit.discountPct, 10),
        inStock: hit.inStock,
    };
}
