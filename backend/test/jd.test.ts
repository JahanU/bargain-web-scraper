import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { createJDRetailer } from '@/retailers/jd';

const hit = (overrides: object = {}) => ({
    objectID: '19686180',
    name: 'Nike Air Max 90',
    slug: 'black-nike-air-max-90',
    price: 54.99,
    wasPrice: 135,
    discountPct: '60%',
    image: 'https://i8.amplience.net/i/jpl/jd_752441_plc',
    size: ['7', '6 (EU 39', '6 (24.5cm)'],
    inStock: true,
    hierarchicalCategories: { lvl0: ['Men'], lvl1: ['Men > Mens Footwear'] },
    brand: ['Nike'],
    category: ['Footwear'],
    ...overrides,
});

const algoliaConfig = {
    applicationId: 'APP',
    searchApiKey: 'KEY',
    indices: [
        { name: 'jd_latest', type: 'replica' },
        { name: 'jd_main', type: 'main' },
    ],
};
const page = (pageProps: object) =>
    `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script>`;

/** Algolia holding `total` hits per category, 1000 per page, but serving only the first `served`. */
const serve =
    (total: number, served = total) =>
    (pageNumber: number, category: string) => {
        const count = Math.max(0, Math.min(1000, served - pageNumber * 1000));
        const hits = Array.from({ length: count }, (_, i) =>
            hit({ objectID: `${category}-${pageNumber * 1000 + i}`, hierarchicalCategories: { lvl0: [category] } }),
        );
        return Response.json({ hits, nbHits: total, nbPages: Math.ceil(total / 1000) });
    };

/** Algolia holding exactly these hits, answering each category query with the hits in that category. */
const serveHits = (hits: ReturnType<typeof hit>[]) => (_: number, top: string) => {
    const matching = hits.filter((item) => item.hierarchicalCategories.lvl0.includes(top));
    return Response.json({ hits: matching, nbHits: matching.length, nbPages: 1 });
};

/**
 * Points the global fetch at a fake JD: `listing` for the listing page, `algolia` for searches.
 * Searches only succeed against the main index with the page's credentials and a sale filter. Counts both.
 */
function fakeJD({ listing = () => new Response(page({ algoliaConfig })), algolia = serve(1) } = {}) {
    const calls = { pages: 0, searches: 0, attributes: [] as string[] };
    spyOn(globalThis, 'fetch').mockImplementation((async (url: string, init?: RequestInit) => {
        if (!url.includes('algolia.net')) {
            calls.pages++;
            return listing();
        }
        calls.searches++;
        const headers = init?.headers as Record<string, string>;
        const { page: pageNumber, facetFilters, attributesToRetrieve } = JSON.parse(String(init?.body));
        calls.attributes = attributesToRetrieve;
        const [[sale], [category], brands] = facetFilters;
        const authorised =
            url === 'https://APP-dsn.algolia.net/1/indexes/jd_main/query' &&
            headers['x-algolia-application-id'] === 'APP' &&
            headers['x-algolia-api-key'] === 'KEY' &&
            sale === 'onSale:true' &&
            brands.includes('brand:Nike') &&
            !brands.includes('brand:McKenzie');
        return authorised
            ? algolia(pageNumber, category.replace('hierarchicalCategories.lvl0:', ''))
            : new Response('bad search', { status: 400 });
    }) as typeof fetch);
    return { jd: createJDRetailer(), calls };
}

afterEach(() => {
    mock.restore();
    Bun.env.LOG_LEVEL = 'silent';
});

describe('JD products', () => {
    const productsFor = async (hits: ReturnType<typeof hit>[]) =>
        (await fakeJD({ algolia: serveHits(hits) }).jd.fetchListing()).products;

    it('maps a hit to a product, closing truncated size labels', async () => {
        expect(await productsFor([hit()])).toEqual([
            {
                externalId: '19686180',
                name: 'Nike Air Max 90',
                url: 'https://www.jdsports.co.uk/product/black-nike-air-max-90/19686180/',
                imageUrl: 'https://i8.amplience.net/i/jpl/jd_752441_plc',
                gender: 'Male',
                brand: 'Nike',
                category: 'Shoes',
                sizes: ['7', '6 (EU 39)', '6 (24.5cm)'],
                wasPricePence: 13500,
                nowPricePence: 5499,
                discount: 60,
                inStock: true,
            },
        ]);
    });

    it("reads gender from JD's top-level categories, listing a unisex product once", async () => {
        const products = await productsFor(
            [['Men'], ['Women'], ['Men', 'Women']].map((lvl0) =>
                hit({ objectID: lvl0.join('+'), hierarchicalCategories: { lvl0 } }),
            ),
        );
        expect(products).toHaveLength(3);
        expect(Object.fromEntries(products.map((product) => [product.externalId, product.gender]))).toEqual({
            Men: 'Male',
            Women: 'Female',
            'Men+Women': 'Unisex',
        });
    });

    it.each([
        ['Footwear', 'Shoes'],
        ['Clothing', 'Clothes'],
        ['Accessories', 'Accessories'],
    ])("reads the brand, and maps JD's %s category to %s", async (category, expected) => {
        const [product] = await productsFor([hit({ brand: ['The North Face'], category: [category] })]);
        expect(product).toMatchObject({ brand: 'The North Face', category: expected });
    });

    it.each([
        ['is missing', undefined],
        ['is one we do not know', ['Gift Cards']],
    ])("falls back to JD's category paths when the category %s", async (_, category) => {
        const lvl1 = ['Women > Womens Sale', 'Women > Womens Clothing'];
        const [product] = await productsFor([hit({ category, hierarchicalCategories: { lvl0: ['Women'], lvl1 } })]);
        expect(product).toMatchObject({ category: 'Clothes' });
    });

    it("stores our name for the brand, and drops brands we don't list", async () => {
        const products = await productsFor([
            hit({ objectID: '1', brand: ["LEVI'S"] }),
            hit({ objectID: '2', brand: ['Emporio Armani EA7'] }),
            hit({ objectID: '3', brand: ['McKenzie'] }),
        ]);
        expect(products.map((product) => product.brand)).toEqual(["Levi's", 'EA7']);
    });

    it('skips hits with no brand or no category, warning once with how many', async () => {
        const warn = spyOn(console, 'error').mockImplementation(() => {});
        Bun.env.LOG_LEVEL = 'warn';
        const unknown = { lvl0: ['Men'], lvl1: ['Men > Mens Sale'] };
        const products = await productsFor([
            hit({ objectID: 'kept' }),
            hit({ objectID: 'no-brand', brand: undefined }),
            hit({ objectID: 'blank-brand', brand: [' '] }),
            hit({ objectID: 'no-category', category: undefined, hierarchicalCategories: unknown }),
            hit({ objectID: 'no-paths', category: undefined, hierarchicalCategories: { lvl0: ['Men'] } }),
        ]);
        expect(products.map((product) => product.externalId)).toEqual(['kept']);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0])).toContain('skipped=4');
    });

    it('drops blocked names', async () => {
        expect(await productsFor([hit({ name: 'Nike England Football Shirt' })])).toEqual([]);
    });
});

describe('JD fetching', () => {
    it('reads every page of each category with the learned credentials, learning them once', async () => {
        const { jd, calls } = fakeJD({ algolia: serve(2150) });

        const listing = await jd.fetchListing();
        expect(listing.products).toHaveLength(4300);
        expect(listing.complete).toBe(true);

        await jd.fetchListing();
        expect(calls).toMatchObject({ pages: 1, searches: 12 });
        expect(calls.attributes).toEqual(
            expect.arrayContaining(['brand', 'category', 'hierarchicalCategories.lvl1', 'hierarchicalCategories.lvl0']),
        );
    });

    it('marks the listing incomplete when one category hits the pagination cap', async () => {
        const { jd } = fakeJD({
            algolia: (pageNumber, category) =>
                (category === 'Men' ? serve(6000, 5000) : serve(10))(pageNumber, category),
        });
        expect(await jd.fetchListing()).toMatchObject({ products: { length: 5010 }, complete: false });
    });

    it('throws when Algolia errors, and relearns the config next time', async () => {
        const { jd, calls } = fakeJD({ algolia: () => new Response('nope', { status: 403 }) });
        await expect(jd.fetchListing()).rejects.toThrow('status 403');
        await expect(jd.fetchListing()).rejects.toThrow('status 403');
        expect(calls.pages).toBe(2);
    });

    it.each([
        ['is down', new Response('down', { status: 500 }), 'status 500'],
        ['has no payload', new Response('<html></html>'), 'no Algolia search config'],
        ['has no algoliaConfig', new Response(page({})), 'no Algolia search config'],
        [
            'has no main index',
            new Response(page({ algoliaConfig: { ...algoliaConfig, indices: [] } })),
            'no Algolia search config',
        ],
    ])('throws when the listing page %s', async (_, response, error) => {
        await expect(fakeJD({ listing: () => response }).jd.fetchListing()).rejects.toThrow(error);
    });
});
