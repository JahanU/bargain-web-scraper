import { describe, expect, it } from 'bun:test';
import { createJDRetailer, extractSearchConfig, getGenderFromUrl, parseHit } from '../src/scrape/retailers/jd';

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
        expect(extractSearchConfig('<script id="__NEXT_DATA__" type="application/json">{ nope</script>')).toBeUndefined();
        expect(extractSearchConfig(buildPage({}))).toBeUndefined();
        expect(extractSearchConfig(buildPage({ algoliaConfig: validPageProps.algoliaConfig }))).toBeUndefined();

        const replicasOnly = {
            ...validPageProps,
            algoliaConfig: { ...validPageProps.algoliaConfig, indices: [{ name: 'x', type: 'replica' }] },
        };
        expect(extractSearchConfig(buildPage(replicasOnly))).toBeUndefined();
    });

    it('maps a hit to a snapshot with prices in pence and truncated sizes dropped', () => {
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

    it('keeps out-of-stock and low-discount hits so reconcile can act on them', () => {
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
    const algoliaResponse = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

    // Algolia handler receives the requested page number.
    function fakeFetch(algolia: (page: number) => Response) {
        const calls: string[] = [];
        const impl = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = String(input);
            calls.push(url);
            if (!url.includes('algolia.net')) {
                return new Response(buildPage(validPageProps));
            }
            return algolia(JSON.parse(String(init?.body)).page);
        }) as typeof fetch;
        return { impl, calls };
    }

    const hitsFrom = (from: number, count: number) =>
        Array.from({ length: count }, (_, i) => buildHit({ objectID: String(from + i), slug: `p-${from + i}` }));

    it('learns the search config once and reuses it', async () => {
        const { impl, calls } = fakeFetch(() => algoliaResponse({ hits: [buildHit()], nbHits: 1, nbPages: 1 }));
        const jd = createJDRetailer({ fetch: impl });

        expect(await jd.fetchListings()).toEqual({ products: [expect.objectContaining({ externalId: '19686180' })], complete: true });
        await jd.fetchListings();
        expect(calls.filter((url) => url.includes('jdsports')).length).toBe(1);
    });

    it('reads every page of a large listing', async () => {
        const { impl, calls } = fakeFetch((page) =>
            algoliaResponse({ hits: page === 0 ? hitsFrom(0, 1000) : hitsFrom(1000, 150), nbHits: 1150, nbPages: 2 }));
        const listing = await createJDRetailer({ fetch: impl }).fetchListings();

        expect(listing.products).toHaveLength(1150);
        expect(listing.complete).toBe(true);
        expect(calls.filter((url) => url.includes('algolia.net')).length).toBe(2);
    });

    it('keeps a truncated listing but marks it incomplete instead of failing', async () => {
        // Algolia caps pagination: page 1 comes back empty although more products exist.
        const { impl } = fakeFetch((page) =>
            algoliaResponse({ hits: page === 0 ? hitsFrom(0, 1000) : [], nbHits: 1150, nbPages: 2 }));
        const listing = await createJDRetailer({ fetch: impl }).fetchListings();

        expect(listing.products).toHaveLength(1000);
        expect(listing.complete).toBe(false);
    });

    it('throws when Algolia errors, and relearns the config next time', async () => {
        const { impl, calls } = fakeFetch(() => new Response('nope', { status: 403 }));
        const jd = createJDRetailer({ fetch: impl });

        await expect(jd.fetchListings()).rejects.toThrow('status 403');
        await expect(jd.fetchListings()).rejects.toThrow('status 403');
        expect(calls.filter((url) => url.includes('jdsports')).length).toBe(2);
    });

    /** A fake JD + Algolia where each listing URL and page can be scripted. */
    function scriptedFetch(options: {
        page?: (url: string) => Response;
        algolia: (body: { page: number; facetFilters: unknown }) => Response;
    }) {
        const calls = { pages: 0, searches: 0 };
        const impl = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = String(input);
            if (!url.includes('algolia.net')) {
                calls.pages++;
                return options.page?.(url) ?? new Response(buildPage(validPageProps));
            }
            calls.searches++;
            return options.algolia(JSON.parse(String(init?.body)));
        }) as typeof fetch;
        return { impl, calls };
    }

    it('keeps the listings that worked when one fails, marked incomplete', async () => {
        const { impl } = scriptedFetch({
            page: (url) => (url.includes('broken') ? new Response('down', { status: 500 }) : new Response(buildPage(validPageProps))),
            algolia: () => algoliaResponse({ hits: [buildHit()], nbHits: 1, nbPages: 1 }),
        });
        const jd = createJDRetailer({ fetch: impl, listingUrls: ['https://jd/men/ok/', 'https://jd/men/broken/'] });

        expect(await jd.fetchListings()).toMatchObject({ products: [{ externalId: '19686180' }], complete: false });
    });

    it('fails the run when every listing fails', async () => {
        const { impl } = scriptedFetch({ page: () => new Response('down', { status: 500 }), algolia: () => algoliaResponse({ hits: [] }) });
        const jd = createJDRetailer({ fetch: impl, listingUrls: ['https://jd/men/a/', 'https://jd/men/b/'] });
        await expect(jd.fetchListings()).rejects.toThrow('status 500');
    });

    it('trusts a short last page when Algolia says its count is an estimate', async () => {
        const { impl } = scriptedFetch({
            algolia: ({ page }) => algoliaResponse({
                hits: page === 0 ? hitsFrom(0, 1000) : hitsFrom(1000, 12), nbHits: 1100, nbPages: 2, exhaustiveNbHits: false,
            }),
        });
        const listing = await createJDRetailer({ fetch: impl }).fetchListings();
        expect(listing).toMatchObject({ complete: true });
        expect(listing.products).toHaveLength(1012);
    });

    it('treats an empty page past the pagination cap as truncation, even with an estimated count', async () => {
        const { impl } = scriptedFetch({
            algolia: ({ page }) => algoliaResponse({
                hits: page === 0 ? hitsFrom(0, 1000) : [], nbHits: 1400, nbPages: 2, exhaustiveNbHits: false,
            }),
        });
        expect((await createJDRetailer({ fetch: impl }).fetchListings()).complete).toBe(false);
    });

    it('treats an exact count with missing products as incomplete', async () => {
        const { impl } = scriptedFetch({
            algolia: ({ page }) => algoliaResponse({
                hits: page === 0 ? hitsFrom(0, 1000) : [], nbHits: 1150, nbPages: 2, exhaustive: { nbHits: true },
            }),
        });
        expect((await createJDRetailer({ fetch: impl }).fetchListings()).complete).toBe(false);
    });

    it('re-reads the listing page when a cached config suddenly finds nothing (stale filters)', async () => {
        let filters: unknown = [['onSale:true']];
        const page = () => new Response(buildPage({
            ...validPageProps,
            searchServerState: { initialResults: { a: { requestParams: [{ facetFilters: filters }] } } },
        }));
        const { impl, calls } = scriptedFetch({
            page,
            algolia: (body) => algoliaResponse(JSON.stringify(body.facetFilters) === JSON.stringify(filters)
                ? { hits: [buildHit()], nbHits: 1, nbPages: 1 }
                : { hits: [], nbHits: 0, nbPages: 0 }),
        });
        const jd = createJDRetailer({ fetch: impl });
        await jd.fetchListings();

        filters = [['sale:yes']]; // JD renames the facet; the cached config now matches nothing
        expect((await jd.fetchListings()).products).toHaveLength(1);
        expect(calls.pages).toBe(2);
    });

    it('accepts a genuinely empty sale after re-reading the page once', async () => {
        let hits = [buildHit()];
        const { impl, calls } = scriptedFetch({ algolia: () => algoliaResponse({ hits, nbHits: hits.length, nbPages: 1 }) });
        const jd = createJDRetailer({ fetch: impl });
        await jd.fetchListings();

        hits = [];
        expect(await jd.fetchListings()).toEqual({ products: [], complete: true });
        expect(calls.pages).toBe(2);
    });
});
