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

    function fakeFetch(handlers: { algolia: () => Response }) {
        const calls: string[] = [];
        const impl = (async (input: string | URL | Request) => {
            const url = String(input);
            calls.push(url);
            return url.includes('algolia.net') ? handlers.algolia() : new Response(buildPage(validPageProps));
        }) as typeof fetch;
        return { impl, calls };
    }

    it('learns the search config once and reuses it', async () => {
        const { impl, calls } = fakeFetch({ algolia: () => algoliaResponse({ hits: [buildHit()], nbHits: 1 }) });
        const jd = createJDRetailer(impl);

        expect(await jd.fetchListings()).toHaveLength(1);
        expect(await jd.fetchListings()).toHaveLength(1);
        expect(calls.filter((url) => url.includes('jdsports')).length).toBe(1);
    });

    it('throws rather than return a truncated catalogue, and relearns the config next time', async () => {
        const { impl, calls } = fakeFetch({ algolia: () => algoliaResponse({ hits: [buildHit()], nbHits: 2000 }) });
        const jd = createJDRetailer(impl);

        await expect(jd.fetchListings()).rejects.toThrow('only 1 were returned');
        await expect(jd.fetchListings()).rejects.toThrow();
        expect(calls.filter((url) => url.includes('jdsports')).length).toBe(2);
    });

    it('throws when Algolia errors', async () => {
        const { impl } = fakeFetch({ algolia: () => new Response('nope', { status: 403 }) });
        await expect(createJDRetailer(impl).fetchListings()).rejects.toThrow('status 403');
    });
});
