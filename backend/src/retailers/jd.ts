import { UNISEX } from '@/deals';
import { createLogger } from '@/log';
import { type SearchConfig, searchAll, withLearnedConfig } from '@/retailers/algolia';
import { isBlockedName } from '@/retailers/blocklist';
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

/** JD Sports UK's men's and women's sale, read straight from the Algolia index behind its site. */
export function createJDRetailer(): Retailer {
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

    /** One category's sale. */
    function readCategory(current: SearchConfig, category: string) {
        const query = {
            facetFilters: [['onSale:true'], [`hierarchicalCategories.lvl0:${category}`]],
            attributesToRetrieve: ATTRIBUTES,
        };
        return searchAll<Hit>(current, query, log, category);
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

    return { id: 'jd', fetchListing: withLearnedConfig(learnConfig, readSale) };
}

/** JD's own `category` when it names a kind we know, else the kind in its lvl1 paths. */
function categoryOf(hit: Hit) {
    return categoryIn(hit.category?.slice(0, 1) ?? []) ?? categoryIn(hit.hierarchicalCategories.lvl1 ?? []);
}

/** Maps one hit to a product, or nothing if it has no brand or no category we can tell. */
function parseHit(hit: Hit): Product | undefined {
    const brand = hit.brand?.[0]?.trim();
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
