import type { Gender } from '@/deals';
import { createLogger, duration } from '@/log';
import { isBlockedName } from '@/retailers/blocklist';
import { categoryIn } from '@/retailers/category';
import { request } from '@/retailers/request';
import type { Listing, Product, Retailer } from '@/retailers/types';

const log = createLogger('size');

const SIZE_BASE_URL = 'https://www.size.co.uk';

// Size is a Shopify shop, and Shopify's Storefront API answers without a key. Its pages and
// products.json sit behind a Cloudflare challenge, so this is also the only way in.
const API_URL = `${SIZE_BASE_URL}/api/2026-01/graphql.json`;

// Size's agents.md asks automated clients to say what they are.
const USER_AGENT = 'bargain-web-scraper/2.0 (deal aggregator bot)';

// Size's sale collections, and the gender of a product that doesn't say its own.
const SALES: [handle: string, gender: Gender][] = [
    ['mens-sale', 'Male'],
    ['womens-sale', 'Female'],
];

// The audience in a product type such as "size > Men's > Footwear". Kids' products are left out.
const AUDIENCES: Record<string, Gender> = { "Men's": 'Male', Womens: 'Female' };

// Shopify's per-request maximum.
const PRODUCTS_PER_PAGE = 250;

// A whole sale is about ten pages. Stopping here keeps a cursor that never ends from looping forever.
const MAX_PAGES_PER_SALE = 40;

/** The pause between requests: Size is read one page at a time, never in parallel. */
export const REQUEST_DELAY_MS = 1000;

const QUERY = `
query Sale($handle: String!, $cursor: String) {
  collection(handle: $handle) {
    products(first: ${PRODUCTS_PER_PAGE}, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle title vendor productType availableForSale onlineStoreUrl
        featuredImage { url }
        priceRange { minVariantPrice { amount } }
        compareAtPriceRange { maxVariantPrice { amount } }
        variants(first: 50) { nodes { title availableForSale } }
      }
    }
  }
}`;

interface Node {
    handle: string;
    title: string;
    vendor: string;
    productType: string;
    availableForSale: boolean;
    onlineStoreUrl: string | null;
    featuredImage: { url: string } | null;
    priceRange: { minVariantPrice: { amount: string } };
    compareAtPriceRange: { maxVariantPrice: { amount: string } };
    variants: { nodes: { title: string; availableForSale: boolean }[] };
}

interface SalePage {
    data?: {
        collection: {
            products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Node[] };
        } | null;
    };
    errors?: { message: string }[];
}

/** Size's men's and women's sale, read from the Shopify Storefront API behind its site. */
export function createSizeRetailer({ delayMs = REQUEST_DELAY_MS } = {}): Retailer {
    async function salePage(handle: string, cursor: string | null) {
        const started = performance.now();
        const response = await request('Size', API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ query: QUERY, variables: { handle, cursor } }),
        });
        const body = (await response.json()) as SalePage;
        const products = body.data?.collection?.products;
        if (!products) {
            throw new Error(`Size has no ${handle} listing: ${body.errors?.[0]?.message ?? 'collection not found'}`);
        }
        log.debug(`storefront ${handle}`, {
            products: products.nodes.length,
            took: duration(performance.now() - started),
        });
        return products;
    }

    return {
        id: 'size',
        async fetchListing(): Promise<Listing> {
            const products: Product[] = [];
            let listed = 0;
            let complete = true;
            let requests = 0;

            for (const [handle, gender] of SALES) {
                let cursor: string | null = null;
                for (let page = 0; cursor !== null || page === 0; page++) {
                    if (page === MAX_PAGES_PER_SALE) {
                        log.warn('⚠ listing cut short: missing products will not be removed this run', { handle });
                        complete = false;
                        break;
                    }
                    if (requests++ > 0) {
                        await Bun.sleep(delayMs);
                    }
                    const { nodes, pageInfo } = await salePage(handle, cursor);
                    const wanted = nodes.filter((node) => !isBlockedName(nameWithoutBrand(node)));
                    const parsed = wanted
                        .map((node) => parseNode(node, gender))
                        .filter((product) => product !== undefined);
                    listed += wanted.length;
                    products.push(...parsed);
                    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
                    // More pages promised but no cursor to reach them: keep what we have, remove nothing.
                    if (pageInfo.hasNextPage && cursor === null) {
                        log.warn('⚠ listing cut short: missing products will not be removed this run', { handle });
                        complete = false;
                    }
                }
            }

            if (products.length < listed) {
                log.warn('⚠ skipped products with no usable brand, category or audience', {
                    skipped: listed - products.length,
                });
            }
            return { products, complete };
        },
    };
}

/** Size starts every title with the brand, and a brand such as "Home Grown" is not a blocked word. */
function nameWithoutBrand({ title, vendor }: Node): string {
    return title.startsWith(vendor) ? title.slice(vendor.length) : title;
}

/** The audience a product type names. One with no path ("Footwear") takes the gender of its sale. */
function genderOf(productType: string, sale: Gender): Gender | undefined {
    const [shop, audience] = productType.split(' > ');
    if (audience === undefined) {
        return sale;
    }
    return shop === 'size' ? AUDIENCES[audience] : undefined;
}

const pence = (pounds: string) => Math.round(Number(pounds) * 100);

/** Maps one product, or nothing if it has no brand, category or audience we can tell. */
function parseNode(node: Node, sale: Gender): Product | undefined {
    const brand = node.vendor.trim();
    const category = categoryIn([node.productType]);
    const gender = genderOf(node.productType, sale);
    if (!brand || !category || !gender) {
        return undefined;
    }
    const wasPricePence = pence(node.compareAtPriceRange.maxVariantPrice.amount);
    const nowPricePence = pence(node.priceRange.minVariantPrice.amount);
    return {
        externalId: node.handle,
        name: node.title,
        url: node.onlineStoreUrl ?? `${SIZE_BASE_URL}/products/${node.handle}`,
        imageUrl: node.featuredImage?.url ?? null,
        gender,
        brand,
        category,
        sizes: node.variants.nodes.filter((variant) => variant.availableForSale).map((variant) => variant.title),
        wasPricePence,
        nowPricePence,
        discount: wasPricePence > nowPricePence ? Math.round((1 - nowPricePence / wasPricePence) * 100) : 0,
        inStock: node.availableForSale,
    };
}
