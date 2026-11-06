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
    hierarchicalCategories: { lvl0: ['Men'] },
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

/** Algolia holding `total` hits, 1000 per page, but serving only the first `served`. */
const serve =
    (total: number, served = total) =>
    (pageNumber: number) => {
        const count = Math.max(0, Math.min(1000, served - pageNumber * 1000));
        const hits = Array.from({ length: count }, (_, i) => hit({ objectID: String(pageNumber * 1000 + i) }));
        return Response.json({ hits, nbHits: total, nbPages: Math.ceil(total / 1000) });
    };

/** Algolia serving exactly these hits on one page. */
const serveHits = (hits: object[]) => () => Response.json({ hits, nbHits: hits.length, nbPages: 1 });

/**
 * Points the global fetch at a fake JD: `listing` for the listing page, `algolia` for searches.
 * Searches only succeed against the main index with the page's credentials. Counts both.
 */
function fakeJD({ listing = () => new Response(page({ algoliaConfig })), algolia = serve(1) } = {}) {
    const calls = { pages: 0, searches: 0 };
    spyOn(globalThis, 'fetch').mockImplementation((async (url: string, init?: RequestInit) => {
        if (!url.includes('algolia.net')) {
            calls.pages++;
            return listing();
        }
        calls.searches++;
        const headers = init?.headers as Record<string, string>;
        const authorised =
            url === 'https://APP-dsn.algolia.net/1/indexes/jd_main/query' &&
            headers['x-algolia-application-id'] === 'APP' &&
            headers['x-algolia-api-key'] === 'KEY';
        return authorised ? algolia(JSON.parse(String(init?.body)).page) : new Response('bad search', { status: 400 });
    }) as typeof fetch);
    return { jd: createJDRetailer(), calls };
}

afterEach(() => mock.restore());

describe('JD products', () => {
    const productsFor = async (hits: object[]) =>
        (await fakeJD({ algolia: serveHits(hits) }).jd.fetchListing()).products;

    it('maps a hit to a product, closing truncated size labels', async () => {
        expect(await productsFor([hit()])).toEqual([
            {
                externalId: '19686180',
                name: 'Nike Air Max 90',
                url: 'https://www.jdsports.co.uk/product/black-nike-air-max-90/19686180/',
                imageUrl: 'https://i8.amplience.net/i/jpl/jd_752441_plc',
                gender: 'Male',
                sizes: ['7', '6 (EU 39)', '6 (24.5cm)'],
                wasPricePence: 13500,
                nowPricePence: 5499,
                discount: 60,
                inStock: true,
            },
        ]);
    });

    it("reads gender from JD's top-level categories", async () => {
        const products = await productsFor(
            [['Men'], ['Women'], ['Men', 'Women']].map((lvl0) => hit({ hierarchicalCategories: { lvl0 } })),
        );
        expect(products.map((product) => product.gender)).toEqual(['Male', 'Female', 'Unisex']);
    });

    it('drops blocked names', async () => {
        expect(await productsFor([hit({ name: 'Nike England Football Shirt' })])).toEqual([]);
    });
});

describe('JD fetching', () => {
    it('reads every page with the learned credentials, learning them once', async () => {
        const { jd, calls } = fakeJD({ algolia: serve(2150) });

        const listing = await jd.fetchListing();
        expect(listing.products).toHaveLength(2150);
        expect(listing.complete).toBe(true);

        await jd.fetchListing();
        expect(calls).toEqual({ pages: 1, searches: 6 });
    });

    it('marks a listing truncated by the pagination cap as incomplete', async () => {
        const { jd } = fakeJD({ algolia: serve(6000, 5000) });
        expect(await jd.fetchListing()).toMatchObject({ products: { length: 5000 }, complete: false });
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
