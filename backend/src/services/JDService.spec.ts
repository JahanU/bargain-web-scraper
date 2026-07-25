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

const buildPageProps = (hits: unknown[]) => ({
    pageProps: {
        searchServerState: {
            initialResults: {
                comp123___jd_prod_products_en: { results: [{ hits }] },
            },
        },
    },
});

const buildPage = (hits: unknown[]) => `<html><body>
    <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
        buildId: 'sa6hF1IEri_zzjdhsx7of',
        props: buildPageProps(hits),
    })}</script>
    </body></html>`;

describe('JDService helpers', () => {
    beforeEach(() => {
        jd.seenItemsCache.clear();
    });

    it('infers gender from URL path', () => {
        expect(jd.getGenderFromUrl('https://www.jdsports.co.uk/men/sale')).toBe('Male');
        expect(jd.getGenderFromUrl('https://www.jdsports.co.uk/women/sale')).toBe('Female');
    });

    it('extracts the build id and hits from the embedded Next.js payload', () => {
        const { buildId, hits } = jd.parseNextData(buildPage([buildHit(), buildHit({ objectID: '2' })]));

        expect(buildId).toBe('sa6hF1IEri_zzjdhsx7of');
        expect(hits).toHaveLength(2);
        expect(hits[0]?.name).toBe('Nike Air Max 90');
    });

    it('reads hits from the data route shape, which has no props wrapper', () => {
        expect(jd.hitsFromPageProps(buildPageProps([buildHit()]))).toHaveLength(1);
        expect(jd.hitsFromPageProps(undefined)).toEqual([]);
        expect(jd.hitsFromPageProps({ pageProps: {} })).toEqual([]);
    });

    it('returns no hits when the payload is missing or malformed', () => {
        expect(jd.parseNextData('<html><body>no payload</body></html>')).toEqual({ hits: [] });
        expect(jd.parseNextData('<script id="__NEXT_DATA__" type="application/json">{ nope</script>'))
            .toEqual({ hits: [] });
        expect(jd.parseNextData(buildPage([])).hits).toEqual([]);
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
