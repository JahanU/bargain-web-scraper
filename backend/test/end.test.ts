// The hits below have the shape of real records from END.'s index (13 Nov 2026), cut down to the
// fields the adapter asks for.
import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { createEndRetailer } from '@/retailers/end';

const hit = (overrides: object = {}) => ({
    id: 11100236841298,
    handle: 'adidas-tobacco-sneaker-kh9634',
    title: 'adidas Tobacco Sneaker',
    vendor: 'Adidas',
    variant_title: 'UK 9.5',
    product_image:
        'https://cdn.shopify.com/s/files/1/1011/8339/0034/files/7c833d6e943f7ad3a36300b4b49ea588675d9b4e.jpg?v=1788611187',
    named_tags: { cat_high: 'Footwear', cat_low: 'Sneakers', cat_med: 'Sneaker', gender: 'Mens' },
    market_pricing_gbp: { compare_at_price: 95, price: 57, price_ratio: 0.6 },
    objectID: '54505432285522',
    ...overrides,
});

// As END.'s page carries it, inside a script tag among other settings.
const PAGE = `<script>window.algoliaShopify = window.algoliaShopify || {}; g = {"app_id":"APP","search_api_key":"KEY","index_prefix":"shopify_","index_products":true};</script>`;

/** Points the global fetch at a fake END.: its page, and an Algolia that only answers the right index and key. */
function fakeEnd(
    options: { page?: () => Response; hits?: ReturnType<typeof hit>[]; served?: number; minDiscount?: number } = {},
) {
    const { page = () => new Response(PAGE), hits = [hit()], minDiscount = 30 } = options;
    const served = options.served ?? hits.length;
    const calls = { pages: 0, searches: [] as Record<string, unknown>[] };
    spyOn(globalThis, 'fetch').mockImplementation((async (url: string, init?: RequestInit) => {
        if (!url.includes('algolia.net')) {
            calls.pages++;
            return page();
        }
        const body = JSON.parse(String(init?.body));
        calls.searches.push(body);
        const headers = new Headers(init?.headers);
        const authorised =
            url === 'https://APP-dsn.algolia.net/1/indexes/shopify_products/query' &&
            headers.get('x-algolia-application-id') === 'APP' &&
            headers.get('x-algolia-api-key') === 'KEY';
        if (!authorised) {
            return new Response('bad search', { status: 403 });
        }
        const from = body.page * 1000;
        return Response.json({
            hits: hits.slice(from, Math.min(from + 1000, served)),
            nbHits: hits.length,
            nbPages: Math.ceil(hits.length / 1000),
        });
    }) as typeof fetch);
    return { end: createEndRetailer({ minDiscount }), calls };
}

afterEach(() => {
    mock.restore();
    Bun.env.LOG_LEVEL = 'silent';
});

describe('END. listing', () => {
    it('asks for every size at or above the discount floor, with only the fields it reads', async () => {
        const { end, calls } = fakeEnd();
        expect((await end.fetchListing()).complete).toBe(true);
        expect(calls.searches).toHaveLength(1);
        expect(calls.searches[0]).toMatchObject({
            filters: 'market_pricing_gbp.price_ratio <= 0.705',
            distinct: false,
            hitsPerPage: 1000,
            page: 0,
        });
        expect(calls.searches[0]?.attributesToRetrieve).toContain('market_pricing_gbp');
        // Every brand: END. is kept whole.
        expect(calls.searches[0]?.facetFilters).toBeUndefined();
    });

    it('follows the configured discount floor', async () => {
        const { end, calls } = fakeEnd({ minDiscount: 50 });
        await end.fetchListing();
        expect(calls.searches[0]?.filters).toBe('market_pricing_gbp.price_ratio <= 0.505');
    });

    it('reads every page, and learns the search config only once', async () => {
        const hits = Array.from({ length: 2500 }, (_, i) => hit({ id: i, objectID: String(i) }));
        const { end, calls } = fakeEnd({ hits });
        expect(await end.fetchListing()).toMatchObject({ products: { length: 2500 }, complete: true });
        expect(calls.searches.map((search) => search.page).sort()).toEqual([0, 1, 2]);

        await end.fetchListing();
        expect(calls.pages).toBe(1);
    });

    it('marks the listing incomplete when Algolia holds hits back', async () => {
        const hits = Array.from({ length: 1500 }, (_, i) => hit({ id: i, objectID: String(i) }));
        const { end } = fakeEnd({ hits, served: 1000 });
        expect(await end.fetchListing()).toMatchObject({ products: { length: 1000 }, complete: false });
    });

    it.each([
        ['is down', () => new Response('down', { status: 500 }), 'status 500'],
        ['has no search config', () => new Response('<html></html>'), 'no Algolia search config'],
    ])('throws when the page %s, and tries the page again next time', async (_, page, error) => {
        const { end, calls } = fakeEnd({ page });
        await expect(end.fetchListing()).rejects.toThrow(error);
        await expect(end.fetchListing()).rejects.toThrow(error);
        expect(calls.pages).toBe(2);
    });
});

describe('END. products', () => {
    const productsFor = async (hits: ReturnType<typeof hit>[]) => (await fakeEnd({ hits }).end.fetchListing()).products;

    it('groups the sizes of a product into one product, in our size labels', async () => {
        const sizes = ['UK 8', 'UK 9.5', 'UK 11', 'UK 9.5'].map((variant_title, i) =>
            hit({ variant_title, objectID: String(i) }),
        );
        expect(await productsFor(sizes)).toEqual([
            {
                externalId: '11100236841298',
                name: 'adidas Tobacco Sneaker',
                url: 'https://www.endclothing.com/products/adidas-tobacco-sneaker-kh9634',
                imageUrl:
                    'https://cdn.shopify.com/s/files/1/1011/8339/0034/files/7c833d6e943f7ad3a36300b4b49ea588675d9b4e.jpg?v=1788611187',
                gender: 'Male',
                // END. writes "Adidas"; ours is the one name every store's deals share.
                brand: 'adidas',
                category: 'Shoes',
                sizes: ['8', '9.5', '11'],
                wasPricePence: 9500,
                nowPricePence: 5700,
                discount: 40,
                inStock: true,
            },
        ]);
    });

    it.each([
        ['Medium', 'M'],
        ['XXLarge', 'XXL'],
        ['OneSize', 'One Size'],
        ['34"', '34"'],
    ])('writes the size %s as %s', async (variant_title, expected) => {
        expect((await productsFor([hit({ variant_title })]))[0]?.sizes).toEqual([expected]);
    });

    it.each([
        ['Mens', 'Male'],
        ['Womens', 'Female'],
        [['Mens', 'Womens'], 'Unisex'],
    ])('reads the gender tag %p as %s', async (gender, expected) => {
        const [product] = await productsFor([hit({ named_tags: { cat_high: 'Footwear', gender } })]);
        expect(product).toMatchObject({ gender: expected, category: 'Shoes' });
    });

    it('skips Lifestyle products and ones with no gender or price, warning once with how many', async () => {
        const warn = spyOn(console, 'error').mockImplementation(() => {});
        Bun.env.LOG_LEVEL = 'warn';
        const products = await productsFor([
            hit(),
            hit({ id: 2, named_tags: { cat_high: 'Lifestyle', gender: 'Mens' } }),
            hit({ id: 3, named_tags: { cat_high: 'Apparel' } }),
            hit({ id: 4, market_pricing_gbp: undefined }),
        ]);
        expect(products).toHaveLength(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0])).toContain('skipped=3');
    });

    it('keeps a brand we do not list, under the name END. gives it', async () => {
        const [product] = await productsFor([hit({ vendor: 'Comme des Garçons Homme' })]);
        expect(product?.brand).toBe('Comme des Garçons Homme');
    });

    it('applies the blocklist to the name, not the brand', async () => {
        const products = await productsFor([
            hit({ id: 1, title: 'Stone Island Logo Cap', vendor: 'Stone Island' }),
            hit({ id: 2, title: 'Home Grown Check Shirt', vendor: 'Home Grown' }),
        ]);
        expect(products.map((product) => product.name)).toEqual(['Home Grown Check Shirt']);
    });
});
