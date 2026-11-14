// Runs against test/fixtures/size-sale.json: real products from Size's Storefront API, saved on
// 13 Nov 2026 and cut down to the pages below, so these tests need no network.
import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { createSizeRetailer } from '@/retailers/size';
import saved from './fixtures/size-sale.json';

type Handle = keyof typeof saved;
const CURSORS: (string | null)[] = [null, 'page-2'];

interface Call {
    handle: string;
    cursor: string | null;
    userAgent: string;
    inFlight: number;
}

/** Points the global fetch at a fake Size answering each sale with its saved pages, and records each call. */
function fakeSize(respond?: (call: Call, saved: () => Response) => Response) {
    const calls: Call[] = [];
    let inFlight = 0;
    spyOn(globalThis, 'fetch').mockImplementation((async (url: string, init?: RequestInit) => {
        inFlight++;
        await Bun.sleep(1);
        const { variables } = JSON.parse(String(init?.body));
        const call = {
            handle: variables.handle,
            cursor: variables.cursor,
            userAgent: new Headers(init?.headers).get('User-Agent') ?? '',
            inFlight,
        };
        calls.push(call);
        inFlight--;
        if (url !== 'https://www.size.co.uk/api/2026-01/graphql.json') {
            return new Response('wrong url', { status: 404 });
        }
        const page = () =>
            Response.json(
                saved[call.handle as Handle]?.[CURSORS.indexOf(call.cursor)] ?? { data: { collection: null } },
            );
        return respond ? respond(call, page) : page();
    }) as typeof fetch);
    return { size: createSizeRetailer({ delayMs: 0 }), calls };
}

afterEach(() => {
    mock.restore();
    Bun.env.LOG_LEVEL = 'silent';
});

describe('Size listing', () => {
    it("reads every page of the men's then the women's sale, one request at a time", async () => {
        const { size, calls } = fakeSize();
        const listing = await size.fetchListing();

        expect(calls.map((call) => [call.handle, call.cursor])).toEqual([
            ['mens-sale', null],
            ['mens-sale', 'page-2'],
            ['womens-sale', null],
        ]);
        expect(calls.every((call) => call.inFlight === 1)).toBe(true);
        expect(listing.complete).toBe(true);
        expect(listing.products.map((product) => product.externalId)).toEqual([
            '104660',
            '19735669',
            '19735837',
            '19653807',
            '19602559',
            '19739336',
            '19708454',
        ]);
    });

    it('pauses between requests', async () => {
        fakeSize();
        const started = performance.now();
        await createSizeRetailer({ delayMs: 30 }).fetchListing();
        expect(performance.now() - started).toBeGreaterThanOrEqual(60);
    });

    it('says it is a bot', async () => {
        const { size, calls } = fakeSize();
        await size.fetchListing();
        expect(calls.every((call) => /bot/.test(call.userAgent))).toBe(true);
    });

    it('waits and tries once more when told to slow down', async () => {
        let limited = 0;
        const { size, calls } = fakeSize((call, page) =>
            call.cursor === 'page-2' && limited++ === 0
                ? new Response('slow down', { status: 429, headers: { 'Retry-After': '0' } })
                : page(),
        );
        expect((await size.fetchListing()).products).toHaveLength(7);
        expect(calls).toHaveLength(4);
    });

    it.each([
        ['is blocked', () => new Response('challenge', { status: 403 }), 'status 403'],
        [
            'keeps saying slow down',
            () => new Response('', { status: 429, headers: { 'Retry-After': '0' } }),
            'status 429',
        ],
        [
            'reports a query error',
            () => Response.json({ errors: [{ message: 'Field does not exist' }] }),
            'Field does not exist',
        ],
        ['has no such collection', () => Response.json({ data: { collection: null } }), 'collection not found'],
    ])('throws when Size %s', async (_, response, error) => {
        await expect(fakeSize(response).size.fetchListing()).rejects.toThrow(error);
    });

    it('marks the listing incomplete when a page promises more but gives no cursor', async () => {
        const { size, calls } = fakeSize((call, page) => {
            if (call.handle !== 'mens-sale') {
                return page();
            }
            const nodes = saved['mens-sale'][0]?.data.collection.products.nodes;
            const pageInfo = { hasNextPage: true, endCursor: null };
            return Response.json({ data: { collection: { products: { pageInfo, nodes } } } });
        });
        const listing = await size.fetchListing();

        expect(listing.complete).toBe(false);
        expect(listing.products).toHaveLength(5);
        expect(calls.map((call) => call.handle)).toEqual(['mens-sale', 'womens-sale']);
    });

    it('throws rather than return half a sale when a later page fails', async () => {
        const { size } = fakeSize((call, page) =>
            call.handle === 'womens-sale' ? new Response('', { status: 500 }) : page(),
        );
        await expect(size.fetchListing()).rejects.toThrow('status 500');
    });
});

describe('Size products', () => {
    const products = async () => {
        const listing = await fakeSize().size.fetchListing();
        return Object.fromEntries(listing.products.map((product) => [product.externalId, product]));
    };

    it('maps a product onto our fields', async () => {
        expect((await products())['104660']).toEqual({
            externalId: '104660',
            name: 'Reebok Club C',
            url: 'https://www.size.co.uk/products/104660',
            imageUrl: 'https://cdn.shopify.com/s/files/1/0921/0911/1619/files/sz_104660_a.jpg?v=1792594313',
            gender: 'Male',
            brand: 'Reebok',
            category: 'Shoes',
            sizes: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
            wasPricePence: 8000,
            nowPricePence: 5000,
            discount: 38,
            inStock: true,
        });
    });

    it('lists only the sizes in stock', async () => {
        expect((await products())['19735669']?.sizes).toEqual(['10', '10.5', '11.5']);
    });

    it("reads gender and category from Size's product type", async () => {
        const byId = await products();
        expect(byId['19739336']).toMatchObject({ gender: 'Female', category: 'Shoes' });
        expect(byId['19735837']).toMatchObject({ gender: 'Male', category: 'Clothes', brand: 'Home Grown' });
    });

    it('takes the gender of the sale when the product type names only a kind', async () => {
        const byId = await products();
        expect(byId['19602559']).toMatchObject({ gender: 'Male', category: 'Clothes' });
        expect(byId['19653807']).toMatchObject({ gender: 'Male', category: 'Shoes' });
    });

    it("skips kids' products and types from another shop, warning once with how many", async () => {
        const warn = spyOn(console, 'error').mockImplementation(() => {});
        Bun.env.LOG_LEVEL = 'warn';
        const byId = await products();

        expect(byId['19696319']).toBeUndefined();
        expect(byId['16498476']).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0])).toContain('skipped=2');
    });

    it('keeps every brand, and applies the blocklist to the name, not the brand', async () => {
        const byId = await products();
        expect(byId['19726669']).toBeUndefined(); // "... Hitch Cap"
        expect(byId['19735837']?.brand).toBe('Home Grown'); // not on our list, and "home" is a blocked word
        expect(byId['19602559']?.brand).toBe('PUMA'); // on our list: our spelling
    });
});
