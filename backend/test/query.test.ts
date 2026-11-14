// GET /v2/deals: filtering, search, sorting, counting and paging, exercised through the route.
import { describe, expect, it } from 'bun:test';
import type { Deal } from '@/deals';
import { RETRY_AFTER_SECONDS, routes } from '@/http';
import { buildSnapshot, type DealPage, SORT_IDS } from '@/query';
import { idsOf } from './helpers';

const STORES = [
    { id: 'jd', name: 'JD Sports' },
    { id: 'size', name: 'Size?' },
];

const make = (id: string, name: string, overrides: Partial<Deal>): Deal => ({
    name,
    wasPrice: 100,
    nowPrice: 40,
    discount: 50,
    url: `https://example.com/${id}`,
    timestamp: 2000,
    gender: 'Male',
    brand: 'Nike',
    category: 'Shoes',
    store: 'jd',
    ...overrides,
});

// Deliberately not in any sort's order. 1 and 10 tie on discount and price; 2, 6 and 9 too.
const DEALS = [
    make('5', 'Nike Dunk Low', { store: 'size', discount: 30, nowPrice: 70, sizes: ['9'] }),
    make('9', 'Puma Suede Classic', { brand: 'Puma', sizes: ['9', '11'] }),
    make('1', 'Nike Air Max 90', { discount: 60, nowPrice: 50, sizes: ['8', '9'], timestamp: 500 }),
    make('7', 'adidas Firebird Track Top', {
        store: 'size',
        gender: 'Female',
        category: 'Clothes',
        brand: 'adidas',
        discount: 35,
        nowPrice: 30,
    }),
    make('3', 'Nike Tech Fleece Hoodie', { category: 'Clothes', discount: 40, nowPrice: 60, sizes: ['M', 'L'] }),
    make('10', 'adidas Gazelle', { store: 'size', brand: 'adidas', discount: 60, nowPrice: 50, sizes: ['8', '9'] }),
    make('2', 'adidas Samba OG', { brand: 'adidas', sizes: ['9', '10'] }),
    make('8', 'The North Face Backpack', {
        gender: 'Unisex',
        category: 'Accessories',
        brand: 'The North Face',
        discount: 45,
        nowPrice: 25,
    }),
    make('6', 'New Balance 550', { store: 'size', brand: 'New Balance', sizes: ['8'] }),
    make('4', 'Nike Air Force 1', { gender: 'Female', discount: 60, nowPrice: 45, sizes: ['5', '6'] }),
];
const EVERY_ID = ['4', '1', '10', '2', '6', '9', '8', '3', '7', '5'];

const serving = (deals: Deal[] | undefined, minDiscount = 30) =>
    routes(
        STORES,
        () => deals && buildSnapshot(deals, STORES, minDiscount),
        () => ({}),
    );
const ready = serving(DEALS);
const loading = serving(undefined);

const get = (query = '', from = ready) => from['/v2/deals'].GET(new Request(`http://localhost/v2/deals${query}`));
const page = async (query = '', from = ready) => (await get(query, from).json()) as DealPage;
const ids = async (query = '') => idsOf((await page(query)).items);
const total = async (query: string) => (await page(query)).total;

/** Every page of a query, following `nextCursor` until it runs out. */
async function allPages(query: string, from = ready): Promise<DealPage[]> {
    const pages = [await page(query, from)];
    for (let cursor = pages[0]?.nextCursor; cursor; cursor = pages.at(-1)?.nextCursor) {
        pages.push(await page(`${query}&cursor=${cursor}`, from));
    }
    return pages;
}

describe('GET /v2/deals', () => {
    describe('filters', () => {
        it.each([
            ['nothing', '', EVERY_ID],
            ['a gender', '?gender=Male', ['1', '10', '2', '6', '9', '3', '5']],
            ['a category', '?category=Clothes', ['3', '7']],
            ['a store', '?store=size', ['10', '6', '7', '5']],
            ['several stores (any of them)', '?store=jd&store=size', EVERY_ID],
            ['a brand', '?brand=Puma', ['9']],
            ['several brands (any of them)', '?brand=Puma&brand=New%20Balance', ['6', '9']],
            ['a brand no deal has', '?brand=Reebok', []],
            ['a brand in the wrong case', '?brand=nike', []],
            ['a size', '?size=M', ['3']],
            ['several sizes (any of them)', '?size=8&size=11', ['1', '10', '6', '9']],
            ['a size no deal has', '?size=99', []],
            ['a minimum discount', '?minDiscount=50', ['4', '1', '10', '2', '6', '9']],
            ['a minimum discount below the floor', '?minDiscount=0', EVERY_ID],
            ['a minimum discount nothing reaches', '?minDiscount=100', []],
            [
                'everything together',
                '?gender=Male&category=Shoes&store=jd&brand=Nike&brand=adidas&size=9&q=a&minDiscount=50',
                ['1', '2'],
            ],
            ['filters that exclude each other', '?gender=Female&brand=Puma', []],
        ])('serves the deals for %s', async (_, query, expected) => {
            const { items, total } = await page(query);
            expect(idsOf(items)).toEqual(expected);
            expect(total).toBe(expected.length);
        });

        it('says which store each deal is from', async () => {
            expect((await page('?brand=Puma')).items).toEqual([DEALS[1] as Deal]);
            expect((await page('?store=size')).items.map((deal) => deal.store)).toEqual(Array(4).fill('size'));
        });
    });

    describe('search', () => {
        it.each([
            ['a word in the name', '?q=suede', ['9']],
            ['a word in the brand', '?q=balance', ['6']],
            ['a word in the store name', '?q=sports', ['4', '1', '2', '9', '8', '3']],
            ['any case', '?q=NiKe', ['4', '1', '3', '5']],
            ['part of a word', '?q=fle', ['3']],
            ['every word, not any', '?q=nike%20air', ['4', '1']],
            ['words in any order, across name, brand and store', '?q=size%3F%20%20ADIDAS', ['10', '7']],
            ['surrounding spaces', '?q=%20%20gazelle%20', ['10']],
            ['a word no deal has', '?q=reebok', []],
            ['letters that only meet across two fields', '?q=lownike', []],
        ])('matches %s', async (_, query, expected) => {
            expect(await ids(query)).toEqual(expected);
        });
    });

    describe('sorting', () => {
        it.each([
            ['discount-high-to-low', EVERY_ID],
            ['discount-low-to-high', ['5', '7', '3', '8', '2', '6', '9', '4', '1', '10']],
            ['price-low-to-high', ['8', '7', '2', '6', '9', '4', '1', '10', '3', '5']],
            ['price-high-to-low', ['5', '3', '1', '10', '4', '2', '6', '9', '7', '8']],
        ])('%s breaks ties by the other field, then by url', async (sort, expected) => {
            expect(await ids(`?sort=${sort}`)).toEqual(expected);
        });

        it('breaks discount ties by the cheaper price in both discount sorts', async () => {
            const tied = [make('dear', 'Dear', { nowPrice: 90 }), make('cheap', 'Cheap', { nowPrice: 10 })];
            for (const sort of ['discount-high-to-low', 'discount-low-to-high']) {
                expect(idsOf((await page(`?sort=${sort}`, serving(tied))).items)).toEqual(['cheap', 'dear']);
            }
        });

        it('breaks price ties by the bigger discount in both price sorts', async () => {
            const tied = [make('small', 'Small', { discount: 35 }), make('big', 'Big', { discount: 80 })];
            for (const sort of ['price-low-to-high', 'price-high-to-low']) {
                expect(idsOf((await page(`?sort=${sort}`, serving(tied))).items)).toEqual(['big', 'small']);
            }
        });
    });

    describe('facets', () => {
        it('counts stores, brands, sizes and discount steps on the first page', async () => {
            expect((await page()).facets).toEqual({
                stores: [
                    { store: 'jd', name: 'JD Sports', count: 6 },
                    { store: 'size', name: 'Size?', count: 4 },
                ],
                brands: [
                    { brand: 'Nike', count: 4 },
                    { brand: 'adidas', count: 3 },
                    { brand: 'New Balance', count: 1 },
                    { brand: 'Puma', count: 1 },
                    { brand: 'The North Face', count: 1 },
                ],
                sizes: [
                    { size: '9', count: 5 },
                    { size: '8', count: 3 },
                    { size: '10', count: 1 },
                    { size: '11', count: 1 },
                    { size: '5', count: 1 },
                    { size: '6', count: 1 },
                    { size: 'L', count: 1 },
                    { size: 'M', count: 1 },
                ],
                discounts: [
                    { minDiscount: 30, count: 10 },
                    { minDiscount: 40, count: 8 },
                    { minDiscount: 50, count: 6 },
                    { minDiscount: 60, count: 3 },
                    { minDiscount: 70, count: 0 },
                    { minDiscount: 80, count: 0 },
                    { minDiscount: 90, count: 0 },
                    { minDiscount: 100, count: 0 },
                ],
            });
        });

        it('lists every store, even one with no matching deal', async () => {
            expect((await page('?q=puma')).facets?.stores).toEqual([
                { store: 'jd', name: 'JD Sports', count: 1 },
                { store: 'size', name: 'Size?', count: 0 },
            ]);
        });

        it('does not let a selection shrink its own facet, only the others', async () => {
            const { facets } = await page('?brand=Puma');
            expect(facets?.brands).toEqual((await page()).facets?.brands);
            expect(facets?.sizes).toEqual([
                { size: '11', count: 1 },
                { size: '9', count: 1 },
            ]);
        });

        // Each row says what choosing it would give: the total of the same request with that
        // facet's own filter replaced by the row's value.
        const others = { gender: 'Male', category: 'Shoes', q: 'a', store: 'jd', brand: 'Nike', size: '9' };
        const without = (name: string, value: string | number, extra = '') =>
            `?${new URLSearchParams({ ...others, minDiscount: '50', [name]: String(value) })}${extra}`;

        it('gives each brand row the total of the same request with only that brand', async () => {
            const { facets } = await page(without('brand', 'Nike', '&brand=adidas'));
            expect(facets?.brands).toEqual([
                { brand: 'Nike', count: 1 },
                { brand: 'Puma', count: 1 },
                { brand: 'adidas', count: 1 },
            ]);
            for (const { brand, count } of facets?.brands ?? []) {
                expect(await total(without('brand', brand))).toBe(count);
            }
        });

        it('gives each size row the total of the same request with only that size', async () => {
            const { facets } = await page(without('size', '9'));
            expect(facets?.sizes).toEqual([
                { size: '8', count: 1 },
                { size: '9', count: 1 },
            ]);
            for (const { size, count } of facets?.sizes ?? []) {
                expect(await total(without('size', size))).toBe(count);
            }
        });

        it('gives each store row the total of the same request with only that store', async () => {
            const { facets } = await page(without('store', 'jd'));
            expect(facets?.stores.map(({ count }) => count)).toEqual([1, 0]);
            for (const { store, count } of facets?.stores ?? []) {
                expect(await total(without('store', store))).toBe(count);
            }
        });

        it('gives each discount row the total of the same request with that minimum discount', async () => {
            const { facets } = await page(without('minDiscount', 50));
            expect(facets?.discounts.slice(0, 5).map(({ count }) => count)).toEqual([1, 1, 1, 1, 0]);
            for (const { minDiscount, count } of facets?.discounts ?? []) {
                expect(await total(without('minDiscount', minDiscount))).toBe(count);
            }
        });

        it.each([
            [0, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]],
            [25, [30, 40, 50, 60, 70, 80, 90, 100]],
            [30, [30, 40, 50, 60, 70, 80, 90, 100]],
            [100, [100]],
        ])('starts the discount steps at the first multiple of 10 from a floor of %i', async (floor, steps) => {
            const { facets } = await page('', serving(DEALS, floor));
            expect(facets?.discounts.map(({ minDiscount }) => minDiscount)).toEqual(steps);
        });

        it('leaves the facets out of later pages', async () => {
            const [first, second] = await allPages('?limit=5');
            expect(first?.facets).toBeDefined();
            expect(second).toBeDefined();
            expect(second).not.toHaveProperty('facets');
        });
    });

    describe('paging', () => {
        it('serves 60 deals a page unless asked otherwise', async () => {
            const many = Array.from({ length: 130 }, (_, i) => make(String(i), `Deal ${i}`, {}));
            const pages = await allPages('?gender=Male', serving(many));
            expect(pages.map(({ items, total }) => [items.length, total])).toEqual([
                [60, 130],
                [60, 130],
                [10, 130],
            ]);
        });

        const queries = SORT_IDS.flatMap((sort) => [`?sort=${sort}`, `?sort=${sort}&gender=Male&q=a`]);
        const cases = queries.flatMap((query) => [1, 2, 3, 4, 7, 10, 100].map((limit) => [query, limit] as const));

        it.each(cases)('%s in pages of %i is the whole list, once each, in order', async (query, limit) => {
            const whole = await page(`${query}&limit=100`);
            const pages = await allPages(`${query}&limit=${limit}`);

            expect(pages.flatMap(({ items }) => idsOf(items))).toEqual(idsOf(whole.items));
            expect(pages).toHaveLength(Math.max(Math.ceil(whole.total / limit), 1));
            for (const { items, total } of pages.slice(0, -1)) {
                expect(items).toHaveLength(limit);
                expect(total).toBe(whole.total);
            }
            expect(pages.at(-1)?.nextCursor).toBeNull();
        });

        it('ends at once when nothing matches', async () => {
            expect(await page('?brand=Reebok')).toMatchObject({ items: [], total: 0, nextCursor: null });
        });
    });

    describe('trackingSince', () => {
        it('is the earliest timestamp of every deal served, whatever the filters and page', async () => {
            expect((await page()).trackingSince).toBe(500);
            expect((await page('?brand=Puma')).trackingSince).toBe(500);
            expect((await allPages('?limit=4')).map((each) => each.trackingSince)).toEqual([500, 500, 500]);
        });

        it('is 0 while there are no deals', async () => {
            expect(await page('', serving([]))).toMatchObject({
                items: [],
                total: 0,
                nextCursor: null,
                trackingSince: 0,
            });
            expect((await page('', serving([]))).facets?.stores.map(({ count }) => count)).toEqual([0, 0]);
        });
    });

    describe('bad queries', () => {
        const cursorOf = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
        const SORT_ERROR = `sort must be one of ${SORT_IDS.join(', ')}`;

        it.each([
            ['?gender=Kids', 'gender must be one of Male, Female, Unisex'],
            ['?category=', 'category must be one of Shoes, Clothes, Accessories'],
            ['?store=nike', 'store must be one of jd, size'],
            ['?store=jd&store=', 'store must be one of jd, size'],
            ['?store=JD', 'store must be one of jd, size'],
            ['?brand=', 'brand must not be empty'],
            ['?brand=Nike&brand=%20', 'brand must not be empty'],
            ['?size=', 'size must not be empty'],
            ['?size=9&size=%20', 'size must not be empty'],
            ['?q=', 'q must be 1 to 64 characters'],
            ['?q=%20%20', 'q must be 1 to 64 characters'],
            [`?q=${'a'.repeat(65)}`, 'q must be 1 to 64 characters'],
            ['?minDiscount=', 'minDiscount must be a whole number from 0 to 100'],
            ['?minDiscount=101', 'minDiscount must be a whole number from 0 to 100'],
            ['?minDiscount=-1', 'minDiscount must be a whole number from 0 to 100'],
            ['?minDiscount=49.5', 'minDiscount must be a whole number from 0 to 100'],
            ['?minDiscount=half', 'minDiscount must be a whole number from 0 to 100'],
            ['?sort=', SORT_ERROR],
            ['?sort=newest', SORT_ERROR],
            ['?limit=0', 'limit must be a whole number from 1 to 100'],
            ['?limit=101', 'limit must be a whole number from 1 to 100'],
            ['?limit=', 'limit must be a whole number from 1 to 100'],
            ['?limit=ten', 'limit must be a whole number from 1 to 100'],
            ['?cursor=', 'cursor is not valid'],
            ['?cursor=not-a-cursor', 'cursor is not valid'],
            [`?cursor=${cursorOf({ url: 'x' })}`, 'cursor is not valid'],
            [`?cursor=${cursorOf([60, 50])}`, 'cursor is not valid'],
            [`?cursor=${cursorOf(['60', 50, 'x'])}`, 'cursor is not valid'],
            [`?cursor=${cursorOf([60, 50, 7])}`, 'cursor is not valid'],
        ])('rejects %s with a 400, even before the first scrape', async (query, error) => {
            for (const from of [ready, loading]) {
                const response = get(query, from);
                expect(response.status).toBe(400);
                expect(await response.json()).toEqual({ error });
                expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
            }
        });

        it('accepts the longest search and the edges of each range', async () => {
            const edges = `?q=${'a'.repeat(64)}&minDiscount=0&limit=1`;
            expect(get(edges).status).toBe(200);
            expect(get('?minDiscount=100&limit=100').status).toBe(200);
        });
    });

    it('answers like v1: cached and readable cross-origin, 503 + Retry-After while loading', async () => {
        const response = get();
        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe(
            ready['/v1/deals'].GET(new Request('http://localhost/v1/deals')).headers.get('Cache-Control'),
        );
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

        const waiting = get('?gender=Male', loading);
        expect(waiting.status).toBe(503);
        expect(waiting.headers.get('Retry-After')).toBe(String(RETRY_AFTER_SECONDS));
        expect(await waiting.json()).toEqual({ error: 'Deals are loading, try again shortly' });
    });
});
