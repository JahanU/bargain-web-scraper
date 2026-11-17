import { describe, expect, it } from 'bun:test';
import { DealStore } from '@/deals';
import { complete, idsOf, product, range } from './helpers';

/** The ids the store holds, in a fixed order: the store itself promises none. */
const ids = (store: DealStore) => idsOf(store.deals(0)).sort();

describe('DealStore', () => {
    describe('R1: the deals are the latest accepted listing', () => {
        it('starts empty, then holds what was listed', () => {
            const store = new DealStore();
            expect(store.deals(0)).toEqual([]);

            expect(store.accept('jd', complete(range(3)))).toEqual({
                status: 'ok',
                products: 3,
                added: 3,
                removed: 0,
                unrecognisedSizes: {},
            });
            expect(ids(store)).toEqual(['0', '1', '2']);
        });

        it('drops products that sold out or disappeared', () => {
            const store = new DealStore();
            store.accept('jd', complete(range(4)));

            const result = store.accept('jd', complete([product('0'), product('1'), product('2', { inStock: false })]));
            expect(result).toEqual({ status: 'ok', products: 2, added: 0, removed: 2, unrecognisedSizes: {} });
            expect(ids(store)).toEqual(['0', '1']);
        });

        it('refreshes prices but keeps the first-seen time, and brings restocks back', () => {
            const store = new DealStore();
            store.accept('jd', complete([product('1')]), 1000);
            store.accept('jd', complete([product('1', { inStock: false })]), 2000);
            store.accept('jd', complete([product('1', { nowPricePence: 3000, discount: 70 })]), 3000);

            expect(store.deals(0)).toMatchObject([{ nowPrice: 30, discount: 70, timestamp: 3000 }]);

            store.accept('jd', complete([product('1', { nowPricePence: 2500, discount: 75 })]), 4000);
            expect(store.deals(0)).toMatchObject([{ nowPrice: 25, timestamp: 3000 }]);
        });

        it('keeps each retailer separate', () => {
            const store = new DealStore();
            store.accept('other', complete([product('x')]));
            store.accept('jd', complete(range(2)));
            store.accept('jd', complete([]));
            store.accept('jd', complete([]));
            expect(ids(store)).toEqual(['x']);
        });
    });

    describe('R2: a bad fetch never wipes deals', () => {
        it('an incomplete listing adds and refreshes, drops what it says is out of stock, and keeps the rest', () => {
            const store = new DealStore();
            store.accept('jd', complete(range(4)));

            const result = store.accept('jd', {
                products: [product('0', { discount: 80 }), product('1', { inStock: false }), product('new')],
                complete: false,
            });

            expect(result).toEqual({ status: 'incomplete', products: 4, added: 1, removed: 1, unrecognisedSizes: {} });
            expect(ids(store)).toEqual(['0', '2', '3', 'new']);
        });

        it('holds back a sudden drop once, then accepts it when the next run confirms', () => {
            const store = new DealStore();
            store.accept('jd', complete(range(600)));

            expect(store.accept('jd', complete(range(200)))).toMatchObject({ status: 'held', products: 600 });
            expect(store.accept('jd', complete(range(200)))).toMatchObject({
                status: 'ok',
                products: 200,
                removed: 400,
            });
        });

        it('clears a sale that ends completely after one confirming run', () => {
            const store = new DealStore();
            store.accept('jd', complete(range(100)));
            store.accept('jd', complete([]));
            store.accept('jd', complete([]));
            expect(store.deals(0)).toEqual([]);
        });

        it('forgets a held drop when the next run is back to normal', () => {
            const store = new DealStore();
            store.accept('jd', complete(range(10)));
            expect(store.accept('jd', complete(range(2))).status).toBe('held');
            expect(store.accept('jd', complete(range(10))).status).toBe('ok');
            // A new drop is held again, rather than treated as confirmed.
            expect(store.accept('jd', complete(range(2))).status).toBe('held');
        });

        it('does not count an incomplete listing as confirming a drop', () => {
            const store = new DealStore();
            store.accept('jd', complete(range(10)));
            store.accept('jd', { products: range(2), complete: false });
            expect(store.accept('jd', complete(range(2))).status).toBe('held');
        });
    });

    describe('duplicates', () => {
        it('counts a product as in stock if any copy is, and marks mixed genders as unisex', () => {
            const store = new DealStore();
            store.accept(
                'jd',
                complete([
                    product('1', { inStock: false }),
                    product('1', { gender: 'Female' }),
                    product('2', { gender: 'Female' }),
                ]),
            );
            const genders = Object.fromEntries(store.deals(0).map((deal) => [deal.url.split('/').pop(), deal.gender]));
            expect(genders).toEqual({ '1': 'Unisex', '2': 'Female' });
        });
    });

    describe('deals()', () => {
        it('serves a brand under one spelling across stores', () => {
            const store = new DealStore();
            store.accept('end', complete([product('1', { brand: 'Amiri' }), product('2', { brand: 'AMIRI' })]));
            store.accept('size', complete([product('3', { brand: 'Amiri' })]));
            expect(store.deals(0).map((deal) => deal.brand)).toEqual(['AMIRI', 'AMIRI', 'AMIRI']);
        });

        it('applies the discount floor and uses the frontend shape', () => {
            const store = new DealStore();
            store.accept(
                'jd',
                complete([
                    product('low', { discount: 20 }),
                    product('a', { discount: 40, nowPricePence: 9000, sizes: [], imageUrl: 'https://img/a' }),
                    product('b', { discount: 40, nowPricePence: 1999 }),
                    product('best', { discount: 70 }),
                ]),
                1234,
            );

            const deals = store.deals(30);
            const byId = Object.fromEntries(deals.map((deal) => [deal.url.split('/').pop(), deal]));
            expect(idsOf(deals).sort()).toEqual(['a', 'b', 'best']);
            expect(byId.b).toEqual({
                name: 'Product b',
                wasPrice: 100,
                nowPrice: 19.99,
                discount: 40,
                url: 'https://example.com/b',
                imageUrl: undefined,
                sizes: ['8', '9'],
                sizeKeys: ['8', '9'],
                timestamp: 1234,
                gender: 'Male',
                brand: 'Nike',
                category: 'Shoes',
                store: 'jd',
            });
            expect(byId.a).toMatchObject({ imageUrl: 'https://img/a', sizes: undefined });
        });
    });

    describe("R5: every store's size labels become ours", () => {
        const sized = (id: string, sizes: string[], overrides = {}) => product(id, { sizes, ...overrides });

        it('prints one label per size and matches a range on every size it covers', () => {
            const store = new DealStore();
            store.accept(
                'end',
                complete([
                    sized('shoe', ['UK 9', 'EU 42', '8']),
                    sized('tee', ['Medium', 'S/M', 'OneSize'], { category: 'Clothes' }),
                    sized('cap', ['One Size'], { category: 'Accessories' }),
                ]),
            );

            const byId = Object.fromEntries(store.deals(0).map((deal) => [deal.url.split('/').pop(), deal]));
            expect(byId.shoe).toMatchObject({ sizes: ['8', '9'], sizeKeys: ['8', '9'] });
            expect(byId.tee).toMatchObject({ sizes: ['S/M', 'M', 'One Size'], sizeKeys: ['S', 'M'] });
            expect(byId.cap).toMatchObject({ sizes: ['One Size'], sizeKeys: [] });
        });

        it('keeps a label it does not recognise on the card, and reports how many products carry it', () => {
            const store = new DealStore();
            const caps = ['a', 'b'].map((id) => sized(id, ['7 1/4', 'M'], { category: 'Accessories' }));
            const result = store.accept('end', complete([...caps, sized('gone', ['N'], { inStock: false })]));

            expect(result.unrecognisedSizes).toEqual({ '7 1/4': 2 });
            expect(store.deals(0)[0]).toMatchObject({ sizes: ['7 1/4', 'M'], sizeKeys: ['M'] });
        });
    });
});
