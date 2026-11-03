import { describe, expect, it } from 'bun:test';
import { createJDRetailer, extractSearchConfig, getGenderFromUrl, parseHit } from '@/retailers/jd';

const buildHit = (overrides: Record<string, unknown> = {}) => ({
    name: 'Nike Air Max 90',
    slug: 'black-nike-air-max-90',
    objectID: '19686180',
    discountPct: '60%',
    wasPrice: 135,
    price: 54.99,
    image: 'https://i8.amplience.net/i/jpl/jd_752441_plc',
    size: ['7', '8', '6 (EU 39'],
    inStock: true,
    ...overrides,
});

const buildPage = (pageProps: unknown) => `<html><body>
    <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script>
    </body></html>`;

const validPageProps = {
    algoliaConfig: {
        applicationId: 'YPTJLWZE3Q',
        searchApiKey: '406e0fd2fca1',
        indices: [
            { name: 'jd_prod_products_en_latest', type: 'replica' },
            { name: 'jd_prod_products_en', type: 'main' },
        ],
    },
    searchServerState: {
        initialResults: {
            comp123___jd_prod_products_en: { requestParams: [{ facetFilters: [['brand:Nike'], ['onSale:true']] }] },
        },
    },
};

describe('JD helpers', () => {
    it('infers gender from the URL path', () => {
        expect(getGenderFromUrl('https://www.jdsports.co.uk/men/sale')).toBe('Male');
        expect(getGenderFromUrl('https://www.jdsports.co.uk/women/sale')).toBe('Female');
    });

    it('extracts the Algolia search config from a listing page', () => {
        expect(extractSearchConfig(buildPage(validPageProps))).toEqual({
            applicationId: 'YPTJLWZE3Q',
            searchApiKey: '406e0fd2fca1',
            indexName: 'jd_prod_products_en',
            facetFilters: [['brand:Nike'], ['onSale:true']],
        });
    });

    it('returns no config when the payload is missing, malformed or incomplete', () => {
        expect(extractSearchConfig('<html>no payload</html>')).toBeUndefined();
        expect(
            extractSearchConfig('<script id="__NEXT_DATA__" type="application/json">{ nope</script>'),
        ).toBeUndefined();
        expect(extractSearchConfig(buildPage({}))).toBeUndefined();
        expect(extractSearchConfig(buildPage({ algoliaConfig: validPageProps.algoliaConfig }))).toBeUndefined();

        const replicasOnly = {
            ...validPageProps,
            algoliaConfig: { ...validPageProps.algoliaConfig, indices: [{ name: 'x', type: 'replica' }] },
        };
        expect(extractSearchConfig(buildPage(replicasOnly))).toBeUndefined();
    });

    it('maps a hit to a product with prices in pence and truncated sizes dropped', () => {
        expect(parseHit(buildHit(), 'Male')).toEqual({
            externalId: '19686180',
            name: 'Nike Air Max 90',
            url: 'https://www.jdsports.co.uk/product/black-nike-air-max-90/19686180/',
            imageUrl: 'https://i8.amplience.net/i/jpl/jd_752441_plc',
            gender: 'Male',
            sizes: ['7', '8'],
            wasPricePence: 13500,
            nowPricePence: 5499,
            discount: 60,
            inStock: true,
        });
    });

    it('keeps out-of-stock and low-discount hits, so the store can act on them', () => {
        expect(parseHit(buildHit({ inStock: false }), 'Male')?.inStock).toBe(false);
        expect(parseHit(buildHit({ discountPct: '10%' }), 'Male')?.discount).toBe(10);
        expect(parseHit(buildHit({ discountPct: undefined }), 'Male')?.discount).toBe(0);
    });

    it('drops incomplete and blocked hits', () => {
        expect(parseHit(buildHit({ slug: undefined }), 'Male')).toBeUndefined();
        expect(parseHit(buildHit({ objectID: undefined }), 'Male')).toBeUndefined();
        expect(parseHit(buildHit({ name: '  ' }), 'Male')).toBeUndefined();
        expect(parseHit(buildHit({ name: 'Nike England Football Shirt' }), 'Male')).toBeUndefined();
    });
});

describe('JD retailer', () => {
    /**
     * A fake JD: listing pages come from `page` (default: a valid page) and Algolia searches from
     * `algolia`, which receives the request body. Counts both kinds of request.
     */
    function fakeJD(options: {
        page?: (url: string) => Response;
        algolia: (body: { page: number; facetFilters: unknown }) => Response;
    }) {
        const calls = { pages: 0, searches: 0 };
        const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = String(input);
            if (url.includes('algolia.net')) {
                calls.searches++;
                return options.algolia(JSON.parse(String(init?.body)));
            }
            calls.pages++;
            return options.page?.(url) ?? new Response(buildPage(validPageProps));
        }) as typeof globalThis.fetch;
        return { fetch, calls };
    }

    const hitsFrom = (from: number, count: number) =>
        Array.from({ length: count }, (_, i) => buildHit({ objectID: String(from + i), slug: `p-${from + i}` }));

    /** Algolia answering page 0 with `first` and any later page with `rest`. */
    const paged = (first: unknown[], rest: unknown[], extra: object) => (body: { page: number }) =>
        Response.json({ hits: body.page === 0 ? first : rest, ...extra });

    it('learns the search config once and reuses it', async () => {
        const { fetch, calls } = fakeJD({
            algolia: () => Response.json({ hits: [buildHit()], nbHits: 1, nbPages: 1 }),
        });
        const jd = createJDRetailer({ fetch });

        expect(await jd.fetchListing()).toEqual({
            products: [expect.objectContaining({ externalId: '19686180' })],
            complete: true,
        });
        await jd.fetchListing();
        expect(calls.pages).toBe(1);
    });

    it('reads every page of a large listing', async () => {
        const { fetch, calls } = fakeJD({
            algolia: paged(hitsFrom(0, 1000), hitsFrom(1000, 150), { nbHits: 1150, nbPages: 2 }),
        });
        const listing = await createJDRetailer({ fetch }).fetchListing();

        expect(listing.products).toHaveLength(1150);
        expect(listing.complete).toBe(true);
        expect(calls.searches).toBe(2);
    });

    it('keeps a truncated listing but marks it incomplete instead of failing', async () => {
        // Algolia caps pagination: page 1 comes back empty although more products exist.
        const { fetch } = fakeJD({ algolia: paged(hitsFrom(0, 1000), [], { nbHits: 1150, nbPages: 2 }) });
        const listing = await createJDRetailer({ fetch }).fetchListing();

        expect(listing.products).toHaveLength(1000);
        expect(listing.complete).toBe(false);
    });

    it('throws when Algolia errors, and relearns the config next time', async () => {
        const { fetch, calls } = fakeJD({ algolia: () => new Response('nope', { status: 403 }) });
        const jd = createJDRetailer({ fetch });

        await expect(jd.fetchListing()).rejects.toThrow('status 403');
        await expect(jd.fetchListing()).rejects.toThrow('status 403');
        expect(calls.pages).toBe(2);
    });

    it('keeps the listings that worked when one fails, marked incomplete', async () => {
        const { fetch } = fakeJD({
            page: (url) =>
                url.includes('broken')
                    ? new Response('down', { status: 500 })
                    : new Response(buildPage(validPageProps)),
            algolia: () => Response.json({ hits: [buildHit()], nbHits: 1, nbPages: 1 }),
        });
        const jd = createJDRetailer({ fetch, listingUrls: ['https://jd/men/ok/', 'https://jd/men/broken/'] });

        expect(await jd.fetchListing()).toMatchObject({ products: [{ externalId: '19686180' }], complete: false });
    });

    it('fails the run when every listing fails', async () => {
        const { fetch } = fakeJD({
            page: () => new Response('down', { status: 500 }),
            algolia: () => Response.json({ hits: [] }),
        });
        const jd = createJDRetailer({ fetch, listingUrls: ['https://jd/men/a/', 'https://jd/men/b/'] });
        await expect(jd.fetchListing()).rejects.toThrow('status 500');
    });

    it('trusts a short last page when Algolia says its count is an estimate', async () => {
        const { fetch } = fakeJD({
            algolia: paged(hitsFrom(0, 1000), hitsFrom(1000, 12), {
                nbHits: 1100,
                nbPages: 2,
                exhaustiveNbHits: false,
            }),
        });
        const listing = await createJDRetailer({ fetch }).fetchListing();
        expect(listing).toMatchObject({ complete: true });
        expect(listing.products).toHaveLength(1012);
    });

    it('treats an empty page past the pagination cap as truncation, even with an estimated count', async () => {
        const { fetch } = fakeJD({
            algolia: paged(hitsFrom(0, 1000), [], { nbHits: 1400, nbPages: 2, exhaustiveNbHits: false }),
        });
        expect((await createJDRetailer({ fetch }).fetchListing()).complete).toBe(false);
    });

    it('treats an exact count with missing products as incomplete', async () => {
        const { fetch } = fakeJD({
            algolia: paged(hitsFrom(0, 1000), [], { nbHits: 1150, nbPages: 2, exhaustive: { nbHits: true } }),
        });
        expect((await createJDRetailer({ fetch }).fetchListing()).complete).toBe(false);
    });

    it('re-reads the listing page when a cached config suddenly finds nothing (stale filters)', async () => {
        let filters: unknown = [['onSale:true']];
        const page = () =>
            new Response(
                buildPage({
                    ...validPageProps,
                    searchServerState: { initialResults: { a: { requestParams: [{ facetFilters: filters }] } } },
                }),
            );
        const { fetch, calls } = fakeJD({
            page,
            algolia: (body) =>
                Response.json(
                    JSON.stringify(body.facetFilters) === JSON.stringify(filters)
                        ? { hits: [buildHit()], nbHits: 1, nbPages: 1 }
                        : { hits: [], nbHits: 0, nbPages: 0 },
                ),
        });
        const jd = createJDRetailer({ fetch });
        await jd.fetchListing();

        filters = [['sale:yes']]; // JD renames the facet; the cached config now matches nothing
        expect((await jd.fetchListing()).products).toHaveLength(1);
        expect(calls.pages).toBe(2);
    });

    it('accepts a genuinely empty sale after re-reading the page only once', async () => {
        let hits = [buildHit()];
        const { fetch, calls } = fakeJD({ algolia: () => Response.json({ hits, nbHits: hits.length, nbPages: 1 }) });
        const jd = createJDRetailer({ fetch });
        await jd.fetchListing();

        hits = [];
        expect(await jd.fetchListing()).toEqual({ products: [], complete: true });
        expect(calls.pages).toBe(2);

        // Once confirmed empty, later runs don't re-read the page every time.
        await jd.fetchListing();
        await jd.fetchListing();
        expect(calls.pages).toBe(2);
    });
});
