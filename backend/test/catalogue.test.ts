import { describe, expect, it } from 'bun:test';
import { keyOf, listActiveDeals, purgeSoldOut, reconcile, SOLD_OUT_RETENTION_MS, type Catalogue } from '../src/store/catalogue';
import { loadCatalogue, saveCatalogue } from '../src/store/file';
import { product, range, tempFile } from './helpers';

const statusOf = (catalogue: Catalogue, id: string, retailer = 'jd') => catalogue.get(keyOf(retailer, id))?.status;

describe('reconcile', () => {
    it('adds new products as active', () => {
        const catalogue: Catalogue = new Map();
        expect(reconcile(catalogue, 'jd', range(3))).toEqual({ status: 'ok', hits: 3, upserted: 3, soldOut: 0 });
        expect(statusOf(catalogue, '0')).toBe('active');
    });

    it('refreshes prices and sizes but keeps first-seen time', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', [product('1')], 1000);
        reconcile(catalogue, 'jd', [product('1', { nowPricePence: 3000, discount: 70, sizes: ['10'] })], 2000);

        expect(catalogue.get(keyOf('jd', '1'))).toMatchObject({
            nowPricePence: 3000, discount: 70, sizes: ['10'], firstSeenAt: 1000, lastSeenAt: 2000,
        });
    });

    it('marks products reported out of stock as sold out', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', range(3));
        const result = reconcile(catalogue, 'jd', [product('0'), product('1'), product('2', { inStock: false })], 5000);

        expect(result.soldOut).toBe(1);
        expect(catalogue.get(keyOf('jd', '2'))).toMatchObject({ status: 'sold_out', soldOutAt: 5000 });
    });

    it('marks products that disappeared from the listing as sold out', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', range(4));
        expect(reconcile(catalogue, 'jd', range(3))).toMatchObject({ status: 'ok', soldOut: 1 });
        expect(statusOf(catalogue, '3')).toBe('sold_out');
    });

    it('brings a sold-out product back when it is restocked', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', range(2));
        reconcile(catalogue, 'jd', [product('0'), product('1', { inStock: false })]);
        reconcile(catalogue, 'jd', range(2));

        expect(catalogue.get(keyOf('jd', '1'))).toMatchObject({ status: 'active', soldOutAt: null });
    });

    it('does not remove missing products when the run saw too few (likely a failed fetch)', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', range(10));
        expect(reconcile(catalogue, 'jd', range(2))).toMatchObject({ status: 'partial', soldOut: 0 });
        expect(statusOf(catalogue, '9')).toBe('active');
    });

    it('handles the same product listed twice in one run', () => {
        const catalogue: Catalogue = new Map();
        expect(reconcile(catalogue, 'jd', [product('1', { inStock: false }), product('1')]).upserted).toBe(1);
        expect(statusOf(catalogue, '1')).toBe('active');
    });

    it('ignores out-of-stock products it has never seen', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', [product('1', { inStock: false })]);
        expect(catalogue.size).toBe(0);
    });

    it('only touches its own retailer', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'other', [product('x')]);
        reconcile(catalogue, 'jd', range(1));
        expect(statusOf(catalogue, 'x', 'other')).toBe('active');
    });
});

describe('purgeSoldOut', () => {
    it('forgets products sold out for longer than the retention window', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', range(3), 0);
        reconcile(catalogue, 'jd', [product('0'), product('1', { inStock: false }), product('2', { inStock: false })], 1000);
        catalogue.get(keyOf('jd', '2'))!.soldOutAt = SOLD_OUT_RETENTION_MS;

        expect(purgeSoldOut(catalogue, SOLD_OUT_RETENTION_MS + 2000)).toBe(1);
        expect([...catalogue.keys()]).toEqual([keyOf('jd', '0'), keyOf('jd', '2')]);
    });
});

describe('listActiveDeals', () => {
    it('returns active deals above the floor, best first, in the frontend Item shape', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', [
            product('low', { discount: 20 }),
            product('good', { discount: 40, sizes: [], imageUrl: 'https://img/1' }),
            product('best', { discount: 70, nowPricePence: 1999 }),
        ], 1234);
        reconcile(catalogue, 'jd', [product('gone', { discount: 90 })]);
        catalogue.get(keyOf('jd', 'gone'))!.status = 'sold_out';

        const deals = listActiveDeals(catalogue, 30);
        expect(deals.map((deal) => deal.discount)).toEqual([70, 40]);
        expect(deals[0]).toEqual({
            name: 'Product best',
            wasPrice: 100,
            nowPrice: 19.99,
            discount: 70,
            url: 'https://example.com/best',
            imageUrl: undefined,
            sizes: ['8', '9'],
            inStock: 'IN STOCK',
            timestamp: 1234,
            gender: 'Male',
        });
        expect(deals[1]).toMatchObject({ imageUrl: 'https://img/1', sizes: undefined });
    });

    it('breaks discount ties by lowest price', () => {
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', [product('a', { nowPricePence: 9000 }), product('b', { nowPricePence: 1000 })]);
        expect(listActiveDeals(catalogue, 30).map((deal) => deal.nowPrice)).toEqual([10, 90]);
    });
});

describe('catalogue file', () => {
    it('round-trips through disk', async () => {
        const path = await tempFile('nested/dir/deals.json');
        const catalogue: Catalogue = new Map();
        reconcile(catalogue, 'jd', range(3));

        await saveCatalogue(path, catalogue);
        expect(await loadCatalogue(path)).toEqual(catalogue);
        expect(await Bun.file(`${path}.tmp`).exists()).toBe(false);
    });

    it('starts empty when the file is missing, corrupt or from another version', async () => {
        const path = await tempFile();
        expect((await loadCatalogue(path)).size).toBe(0);

        await Bun.write(path, '{ not json');
        expect((await loadCatalogue(path)).size).toBe(0);

        await Bun.write(path, JSON.stringify({ version: 99, products: [] }));
        expect((await loadCatalogue(path)).size).toBe(0);
    });
});
