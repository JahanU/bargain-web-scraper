import { type Category, type Gender, UNISEX } from '@/deals';
import { createLogger } from '@/log';
import { type SearchConfig, searchAll, withLearnedConfig } from '@/retailers/algolia';
import { isBlockedName } from '@/retailers/blocklist';
import { request } from '@/retailers/request';
import type { Listing, Product, Retailer } from '@/retailers/types';

const log = createLogger('end');

const END_BASE_URL = 'https://www.endclothing.com';

// END.'s pages carry the settings of its Algolia search. The product index is the prefix + "products".
const CONFIG_PAGE_URL = `${END_BASE_URL}/collections/sale`;
const CONFIG_PATTERN = /"app_id":"([^"]+)","search_api_key":"([^"]+)","index_prefix":"([^"]+)"/;

// Only what the adapter reads. The index holds one record per size, about 20,000 of them on sale.
const ATTRIBUTES = [
    'id',
    'handle',
    'title',
    'vendor',
    'variant_title',
    'product_image',
    'named_tags',
    'market_pricing_gbp',
];

// END.'s `cat_high` tag. "Lifestyle" (homeware, books) has no category of ours and is left out.
const CATEGORIES: Record<string, Category> = { Footwear: 'Shoes', Apparel: 'Clothes', Accessories: 'Accessories' };

// END. spells sizes out. JD and Size use the short forms, and the size filter matches exactly.
const SIZE_NAMES: Record<string, string> = {
    'XX-Small': 'XXS',
    'X-Small': 'XS',
    XSmall: 'XS',
    Small: 'S',
    Medium: 'M',
    Large: 'L',
    'X-Large': 'XL',
    XLarge: 'XL',
    'XX-Large': 'XXL',
    XXLarge: 'XXL',
    'XXX-Large': 'XXXL',
    OneSize: 'One Size',
};

/** One size of one product. The search key itself only returns sizes that are in stock. */
interface Hit {
    id: number;
    handle: string;
    title: string;
    vendor: string;
    variant_title: string | null;
    product_image: string | null;
    named_tags?: { cat_high?: string | string[]; gender?: string | string[] };
    market_pricing_gbp?: { price: number; compare_at_price: number };
}

/**
 * END. Clothing's reduced products, read from the Algolia index behind its site. Its "sale"
 * collection is nearly the whole shop, so the query asks for the discount itself.
 */
export function createEndRetailer({ minDiscount }: { minDiscount: number }): Retailer {
    // The price as a share of the was-price. The half point keeps a 29.5% discount, which rounds to 30.
    const maxPriceRatio = (100 - minDiscount + 0.5) / 100;

    /** Reads the Algolia credentials and index prefix out of a listing page. */
    async function learnConfig(): Promise<SearchConfig> {
        const response = await request('Listing page', CONFIG_PAGE_URL);
        const [, applicationId, searchApiKey, prefix] = (await response.text()).match(CONFIG_PATTERN) ?? [];
        if (!applicationId || !searchApiKey || !prefix) {
            throw new Error('Listing page has no Algolia search config');
        }
        return { applicationId, searchApiKey, indexName: `${prefix}products` };
    }

    async function readSale(config: SearchConfig): Promise<Listing> {
        const query = {
            filters: `market_pricing_gbp.price_ratio <= ${maxPriceRatio}`,
            // One record per size, not one per product: the sizes are the records.
            distinct: false,
            attributesToRetrieve: ATTRIBUTES,
        };
        const { hits, complete } = await searchAll<Hit>(config, query, log, 'sale');

        const sizesOf = Map.groupBy(
            hits.filter((hit) => !isBlockedName(hit.title, hit.vendor)),
            (hit) => hit.id,
        );
        const products = [...sizesOf.values()].map(parseProduct).filter((product) => product !== undefined);
        if (products.length < sizesOf.size) {
            log.warn('⚠ skipped products with no usable brand, category, gender or price', {
                skipped: sizesOf.size - products.length,
            });
        }
        return { products, complete };
    }

    return { id: 'end', fetchListing: withLearnedConfig(learnConfig, readSale) };
}

const listOf = (value: string | string[] | undefined) => [value ?? []].flat();

function genderOf(genders: string[]): Gender | undefined {
    const women = genders.includes('Womens');
    if (genders.includes('Mens')) {
        return women ? UNISEX : 'Male';
    }
    return women ? 'Female' : undefined;
}

/** "UK 9.5" → "9.5", "Medium" → "M". Anything else is kept as END. writes it. */
function sizeLabel(title: string): string {
    return SIZE_NAMES[title] ?? title.replace(/^UK /, '');
}

/** Maps the in-stock sizes of one product to a product, or nothing if a field we need is missing. */
function parseProduct(sizes: Hit[]): Product | undefined {
    const [first] = sizes;
    const brand = first?.vendor.trim();
    const category = CATEGORIES[listOf(first?.named_tags?.cat_high)[0] ?? ''];
    const gender = genderOf(listOf(first?.named_tags?.gender));
    const prices = sizes.flatMap((size) => size.market_pricing_gbp ?? []);
    if (!first || !brand || !category || !gender || prices.length === 0) {
        return undefined;
    }
    const wasPricePence = Math.round(Math.max(...prices.map((price) => price.compare_at_price)) * 100);
    const nowPricePence = Math.round(Math.min(...prices.map((price) => price.price)) * 100);
    return {
        externalId: String(first.id),
        name: first.title,
        url: `${END_BASE_URL}/products/${first.handle}`,
        imageUrl: first.product_image,
        gender,
        brand,
        category,
        sizes: [...new Set(sizes.flatMap((size) => (size.variant_title ? sizeLabel(size.variant_title) : [])))],
        wasPricePence,
        nowPricePence,
        discount: wasPricePence > nowPricePence ? Math.round((1 - nowPricePence / wasPricePence) * 100) : 0,
        inStock: true,
    };
}
