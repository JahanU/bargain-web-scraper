import { describe, expect, it } from 'bun:test';
import type { BrandCount, Deal } from '@/deals';
import { dealsResponse, RETRY_AFTER_SECONDS, routes } from '@/http';
import { idsOf } from './helpers';

const deal: Deal = {
    name: 'Nike Air Max 90',
    wasPrice: 135,
    nowPrice: 54.99,
    discount: 60,
    url: 'https://www.jdsports.co.uk/product/x/1/',
    timestamp: 1,
    gender: 'Male',
    brand: 'Nike',
    category: 'Shoes',
    store: 'jd',
};

describe('dealsResponse', () => {
    it('answers 503 with a readable Retry-After until the first scrape', () => {
        const response = dealsResponse(undefined);
        expect(response.status).toBe(503);
        expect(response.headers.get('Retry-After')).toBe(String(RETRY_AFTER_SECONDS));
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        // Cross-origin JavaScript can only read Retry-After if it is exposed.
        expect(response.headers.get('Access-Control-Expose-Headers')).toContain('Retry-After');
    });

    it('serves the deals as JSON with caching and CORS headers', async () => {
        const response = dealsResponse([deal]);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([deal]);
        expect(response.headers.get('Content-Type')).toContain('application/json');
        expect(response.headers.get('Cache-Control')).toContain('max-age=60');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('treats an empty list as ready', async () => {
        const response = dealsResponse([]);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });
});

describe('GET /v1/deals?gender=', () => {
    const male = deal;
    const female: Deal = { ...deal, name: 'Nike Dunk Low', url: 'https://example.com/2', gender: 'Female' };
    const unisex: Deal = { ...deal, name: 'Crocs Classic', url: 'https://example.com/3', gender: 'Unisex' };
    const health = () => ({});
    const getFrom = (deals: Deal[] | undefined, query: string) =>
        routes(() => deals, health)['/v1/deals'].GET(new Request(`http://localhost/v1/deals${query}`));
    const get = (query: string) => getFrom([male, female, unisex], query);

    it.each([
        ['Male', male],
        ['Female', female],
        ['Unisex', unisex],
    ])('serves only %s deals', async (gender, expected) => {
        const response = get(`?gender=${gender}`);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([expected]);
    });

    it('serves every deal without the param', async () => {
        expect(await get('').json()).toEqual([male, female, unisex]);
    });

    it.each(['?gender=Kids', '?gender='])('rejects %s with a 400', async (query) => {
        const response = get(query);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'gender must be one of Male, Female, Unisex' });
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('rejects an unknown gender before the first scrape', () => {
        expect(getFrom(undefined, '?gender=Kids').status).toBe(400);
        expect(getFrom(undefined, '?gender=Male').status).toBe(503);
    });
});

describe('filtering by category and brand', () => {
    const make = (id: string, gender: Deal['gender'], category: Deal['category'], brand: string): Deal => ({
        ...deal,
        url: `https://example.com/${id}`,
        gender,
        category,
        brand,
    });
    const deals = [
        make('1', 'Male', 'Shoes', 'Nike'),
        make('2', 'Male', 'Shoes', 'adidas'),
        make('3', 'Male', 'Clothes', 'Nike'),
        make('4', 'Female', 'Shoes', 'Nike'),
        make('5', 'Female', 'Clothes', 'adidas'),
        make('6', 'Female', 'Accessories', 'The North Face'),
        make('7', 'Unisex', 'Shoes', 'Nike'),
        make('8', 'Male', 'Shoes', 'Puma'),
    ];
    const table = routes(
        () => deals,
        () => ({}),
    );
    const loading = routes(
        () => undefined,
        () => ({}),
    );
    const get = (path: '/v1/deals' | '/v1/brands' | '/webscrape/getBestDeals', query = '', from = table) =>
        from[path].GET(new Request(`http://localhost${path}${query}`));
    const ids = async (query: string) => idsOf((await get('/v1/deals', query).json()) as Deal[]);
    const brands = async (query = '') => (await get('/v1/brands', query).json()) as BrandCount[];

    it.each([
        ['one category', '?category=Clothes', ['3', '5']],
        ['several brands (any of them)', '?brand=adidas&brand=Puma', ['2', '5', '8']],
        ['a brand with spaces in its name', '?brand=The%20North%20Face', ['6']],
        ['category and gender', '?category=Shoes&gender=Male', ['1', '2', '8']],
        ['several brands and gender', '?brand=Nike&brand=adidas&gender=Female', ['4', '5']],
        ['gender, category and brands together', '?gender=Male&category=Shoes&brand=Nike&brand=Puma', ['1', '8']],
        ['a brand no deal has', '?brand=Reebok', []],
        ['a brand in the wrong case', '?brand=nike', []],
    ])('serves the deals for %s', async (_, query, expected) => {
        expect(await ids(query)).toEqual(expected);
    });

    it('filters the legacy path the same way', async () => {
        const response = get('/webscrape/getBestDeals', '?category=Accessories');
        expect(idsOf((await response.json()) as Deal[])).toEqual(['6']);
    });

    it.each([
        ['?category=Hats', 'category must be one of Shoes, Clothes, Accessories'],
        ['?category=', 'category must be one of Shoes, Clothes, Accessories'],
        ['?category=shoes', 'category must be one of Shoes, Clothes, Accessories'],
        ['?brand=', 'brand must not be empty'],
        ['?brand=%20', 'brand must not be empty'],
        ['?brand=Nike&brand=', 'brand must not be empty'],
    ])('rejects %s with a 400, even before the first scrape', async (query, error) => {
        for (const from of [table, loading]) {
            const response = get('/v1/deals', query, from);
            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error });
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        }
    });

    describe('by store', () => {
        const from = (store: Deal['store'], id: string, gender: Deal['gender'], brand: string): Deal => ({
            ...make(id, gender, 'Shoes', brand),
            store,
        });
        const both = routes(
            () => [
                from('jd', 'j1', 'Male', 'Nike'),
                from('jd', 'j2', 'Female', 'Nike'),
                from('jd', 'j3', 'Male', 'adidas'),
                from('size', 's1', 'Male', 'Nike'),
                from('size', 's2', 'Female', 'adidas'),
                from('size', 's3', 'Male', 'Carhartt WIP'),
            ],
            () => ({}),
        );
        const storeIds = async (query: string) => idsOf((await get('/v1/deals', query, both).json()) as Deal[]);

        it.each([
            ['JD only', '?store=jd', ['j1', 'j2', 'j3']],
            ['Size only', '?store=size', ['s1', 's2', 's3']],
            ['both stores without the param', '', ['j1', 'j2', 'j3', 's1', 's2', 's3']],
            ['a store and a gender', '?store=size&gender=Male', ['s1', 's3']],
            ['a store and a brand', '?store=jd&brand=Nike', ['j1', 'j2']],
            ['a store, a gender and brands', '?store=size&gender=Male&brand=Nike&brand=adidas', ['s1']],
        ])('serves %s', async (_, query, expected) => {
            expect(await storeIds(query)).toEqual(expected);
        });

        it.each(['?store=asos', '?store=', '?store=JD', '?store=jd,size'])(
            'rejects %s with a 400, even before the first scrape',
            async (query) => {
                for (const path of ['/v1/deals', '/v1/brands'] as const) {
                    for (const table of [both, loading]) {
                        const response = get(path, query, table);
                        expect(response.status).toBe(400);
                        expect(await response.json()).toEqual({ error: 'store must be one of jd, size' });
                    }
                }
            },
        );

        it('counts brands across both stores, or within the chosen one', async () => {
            const counts = async (query: string) => (await get('/v1/brands', query, both).json()) as BrandCount[];
            expect(await counts('')).toEqual([
                { brand: 'Nike', count: 3 },
                { brand: 'adidas', count: 2 },
                { brand: 'Carhartt WIP', count: 1 },
            ]);
            expect(await counts('?store=size')).toEqual([
                { brand: 'Carhartt WIP', count: 1 },
                { brand: 'Nike', count: 1 },
                { brand: 'adidas', count: 1 },
            ]);
        });
    });

    describe('GET /v1/brands', () => {
        it('counts every brand, most deals first, then by name', async () => {
            expect(await brands()).toEqual([
                { brand: 'Nike', count: 4 },
                { brand: 'adidas', count: 2 },
                { brand: 'Puma', count: 1 },
                { brand: 'The North Face', count: 1 },
            ]);
        });

        it('counts only the deals matching gender and category', async () => {
            expect(await brands('?gender=Male')).toEqual([
                { brand: 'Nike', count: 2 },
                { brand: 'Puma', count: 1 },
                { brand: 'adidas', count: 1 },
            ]);
            expect(await brands('?category=Clothes')).toEqual([
                { brand: 'Nike', count: 1 },
                { brand: 'adidas', count: 1 },
            ]);
            expect(await brands('?gender=Female&category=Shoes')).toEqual([{ brand: 'Nike', count: 1 }]);
            expect(await brands('?gender=Unisex&category=Clothes')).toEqual([]);
        });

        it.each(['', '?gender=Male', '?category=Shoes', '?gender=Male&category=Shoes'])(
            'gives each brand the number of deals /v1/deals%s serves for that brand alone',
            async (query) => {
                const counts = await brands(query);
                expect(counts.map(({ brand }) => brand)).toEqual(expect.arrayContaining(['Nike', 'adidas']));
                for (const { brand, count } of counts) {
                    const selected = `${query ? `${query}&` : '?'}brand=${encodeURIComponent(brand)}`;
                    expect(await ids(selected)).toHaveLength(count);
                }
            },
        );

        it('ignores any brand parameter', async () => {
            expect(await brands('?brand=Puma&brand=')).toEqual(await brands());
        });

        it.each([
            ['?gender=Kids', 'gender must be one of Male, Female, Unisex'],
            ['?category=', 'category must be one of Shoes, Clothes, Accessories'],
        ])('rejects %s with a 400, even before the first scrape', async (query, error) => {
            for (const from of [table, loading]) {
                const response = get('/v1/brands', query, from);
                expect(response.status).toBe(400);
                expect(await response.json()).toEqual({ error });
            }
        });

        it('answers like the deals: cached and readable cross-origin, 503 + Retry-After while loading', () => {
            const ready = get('/v1/brands');
            expect(ready.headers.get('Cache-Control')).toBe(get('/v1/deals').headers.get('Cache-Control'));
            expect(ready.headers.get('Access-Control-Allow-Origin')).toBe('*');

            const waiting = get('/v1/brands', '?gender=Male', loading);
            expect(waiting.status).toBe(503);
            expect(waiting.headers.get('Retry-After')).toBe(String(RETRY_AFTER_SECONDS));
        });
    });
});
