import { describe, expect, it } from 'bun:test';
import { createJDRetailer, extractSearchConfig, parseHit } from '@/retailers/jd';

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

describe('extractSearchConfig', () => {
    it('reads the credentials and main index from a listing page', () => {
        expect(extractSearchConfig(page({ algoliaConfig }))).toEqual({
            applicationId: 'APP',
            searchApiKey: 'KEY',
            indexName: 'jd_main',
        });
    });

    it.each([
        ['no payload', '<html></html>'],
        ['no algoliaConfig', page({})],
        ['no main index', page({ algoliaConfig: { ...algoliaConfig, indices: [] } })],
    ])('returns nothing when the page has %s', (_, html) => {
        expect(extractSearchConfig(html)).toBeUndefined();
    });
});

describe('parseHit', () => {
    it('maps a hit to a product, closing truncated size labels', () => {
        expect(parseHit(hit())).toEqual({
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
        });
    });

    it.each([
        [['Men'], 'Male'],
        [['Women'], 'Female'],
        [['Men', 'Women'], 'Unisex'],
    ])("reads gender %p from JD's top-level categories as %s", (lvl0, gender) => {
        expect(parseHit(hit({ hierarchicalCategories: { lvl0 } }))?.gender).toBe(gender);
    });

    it('drops blocked names', () => {
        expect(parseHit(hit({ name: 'Nike England Football Shirt' }))).toBeUndefined();
    });
});

describe('createJDRetailer', () => {
    /** A fake JD serving `listing` as its listing page and `algolia` for searches. Counts both. */
    function fakeJD({ listing = () => new Response(page({ algoliaConfig })), algolia = serve(1) } = {}) {
        const calls = { pages: 0, searches: 0 };
        const fetch = (async (url: string, init?: RequestInit) => {
            if (url.includes('algolia.net')) {
                calls.searches++;
                return algolia(JSON.parse(String(init?.body)).page);
            }
            calls.pages++;
            return listing();
        }) as typeof globalThis.fetch;
        return { jd: createJDRetailer({ fetch }), calls };
    }

    /** Algolia holding `total` hits, 1000 per page, but serving only the first `served`. */
    function serve(total: number, served = total) {
        return (page: number) => {
            const count = Math.max(0, Math.min(1000, served - page * 1000));
            const hits = Array.from({ length: count }, (_, i) => hit({ objectID: String(page * 1000 + i) }));
            return Response.json({ hits, nbHits: total, nbPages: Math.ceil(total / 1000) });
        };
    }

    it('reads every page, learning the config once', async () => {
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
        ['is down', () => new Response('down', { status: 500 }), 'status 500'],
        ['has no config', () => new Response('<html></html>'), 'no Algolia search config'],
    ])('throws when the listing page %s', async (_, listing, error) => {
        await expect(fakeJD({ listing }).jd.fetchListing()).rejects.toThrow(error);
    });
});
