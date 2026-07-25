import { beforeEach, describe, expect, it } from 'bun:test';
import { __test__ as jd } from './JDService';

const buildHit = (overrides: Record<string, unknown> = {}) => ({
    name: 'Nike Air Max 90',
    slug: 'black-nike-air-max-90',
    objectID: '19686180',
    discountPct: '60%',
    wasPrice: 135,
    price: 54,
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
            comp123___jd_prod_products_en: {
                requestParams: [{ facetFilters: [['brand:Nike'], ['onSale:true']] }],
            },
        },
    },
};

describe('JDService helpers', () => {
    beforeEach(() => {
        jd.seenItemsCache.clear();
        jd.searchConfigCache.clear();
    });

    it('infers gender from URL path', () => {
        expect(jd.getGenderFromUrl('https://www.jdsports.co.uk/men/sale')).toBe('Male');
        expect(jd.getGenderFromUrl('https://www.jdsports.co.uk/women/sale')).toBe('Female');
    });

    it('extracts the Algolia search config from a listing page', () => {
        expect(jd.extractSearchConfig(buildPage(validPageProps))).toEqual({
            applicationId: 'YPTJLWZE3Q',
            searchApiKey: '406e0fd2fca1',
            indexName: 'jd_prod_products_en',
            facetFilters: [['brand:Nike'], ['onSale:true']],
        });
    });

    it('returns no config when the page payload is missing, malformed or incomplete', () => {
        expect(jd.extractSearchConfig('<html><body>no payload</body></html>')).toBeUndefined();
        expect(jd.extractSearchConfig('<script id="__NEXT_DATA__" type="application/json">{ nope</script>'))
            .toBeUndefined();
        expect(jd.extractSearchConfig(buildPage({}))).toBeUndefined();

        // Credentials present but no filters to search with.
        expect(jd.extractSearchConfig(buildPage({ algoliaConfig: validPageProps.algoliaConfig })))
            .toBeUndefined();

        // Only replica indices, so no main product index to query.
        const replicasOnly = {
            ...validPageProps,
            algoliaConfig: {
                ...validPageProps.algoliaConfig,
                indices: [{ name: 'jd_prod_products_en_latest', type: 'replica' }],
            },
        };
        expect(jd.extractSearchConfig(buildPage(replicasOnly))).toBeUndefined();
    });

    it('maps a hit to an item and drops truncated size values', () => {
        expect(jd.parseHit(buildHit(), 'Male', 30)).toEqual({
            name: 'Nike Air Max 90',
            wasPrice: 135,
            nowPrice: 54,
            discount: 60,
            url: 'https://www.jdsports.co.uk/product/black-nike-air-max-90/19686180/',
            imageUrl: 'https://i8.amplience.net/i/jpl/jd_752441_plc',
            sizes: ['7', '8'],
            inStock: 'IN STOCK',
            timestamp: expect.any(Number),
            gender: 'Male',
        });
    });

    it('filters out low discounts, out of stock, blocked names and incomplete hits', () => {
        expect(jd.parseHit(buildHit({ discountPct: '10%' }), 'Male', 30)).toBeUndefined();
        expect(jd.parseHit(buildHit({ discountPct: undefined }), 'Male', 30)).toBeUndefined();
        expect(jd.parseHit(buildHit({ inStock: false }), 'Male', 30)).toBeUndefined();
        expect(jd.parseHit(buildHit({ slug: undefined }), 'Male', 30)).toBeUndefined();
        expect(jd.parseHit(buildHit({ name: 'Nike England Football Shirt' }), 'Male', 30)).toBeUndefined();
    });

    it('returns each product only once across calls', () => {
        expect(jd.parseHit(buildHit(), 'Male', 30)).toBeDefined();
        expect(jd.parseHit(buildHit(), 'Male', 30)).toBeUndefined();
    });
});
