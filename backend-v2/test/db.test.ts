// Runs against a real Postgres. Locally:  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/bargain_test bun test
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../src/app';
import { migrate } from '../src/db/migrate';
import { listActiveDeals, type Deal } from '../src/db/products';
import { createSql, type Sql } from '../src/db/sql';
import { reconcile } from '../src/scrape/reconcile';
import { runScrape } from '../src/scrape/runScrape';
import type { ProductSnapshot, Retailer } from '../src/scrape/retailers/types';

const url = Bun.env.TEST_DATABASE_URL;

const product = (id: string, overrides: Partial<ProductSnapshot> = {}): ProductSnapshot => ({
    externalId: id,
    name: `Product ${id}`,
    url: `https://example.com/${id}`,
    imageUrl: null,
    gender: 'Male',
    sizes: ['8', '9'],
    wasPricePence: 10000,
    nowPricePence: 5000,
    discount: 50,
    inStock: true,
    ...overrides,
});

const range = (count: number, from = 0) => Array.from({ length: count }, (_, i) => product(String(from + i)));

describe.skipIf(!url)('database', () => {
    let sql: Sql;

    const statusOf = async (id: string) =>
        (await sql`select status from products where retailer = 'jd' and external_id = ${id}`)[0]?.status;

    beforeAll(async () => {
        sql = createSql(url!);
        await sql.unsafe('drop table if exists products, scrape_runs, schema_migrations cascade; drop type if exists product_status;');
        await migrate(sql);
    });

    beforeEach(async () => {
        await sql`truncate products, scrape_runs`;
    });

    afterAll(async () => {
        await sql.close();
    });

    it('migrations are idempotent', async () => {
        expect(await migrate(sql)).toEqual([]);
    });

    describe('reconcile', () => {
        it('inserts new products as active', async () => {
            const result = await reconcile(sql, 'jd', range(3));
            expect(result).toEqual({ status: 'ok', hits: 3, upserted: 3, soldOut: 0 });
            expect(await statusOf('0')).toBe('active');
        });

        it('updates prices and sizes without touching first_seen_at', async () => {
            await reconcile(sql, 'jd', [product('1')]);
            const [before] = await sql`select first_seen_at from products where external_id = '1'`;

            await reconcile(sql, 'jd', [product('1', { nowPricePence: 3000, discount: 70, sizes: ['10'] })]);
            const [after] = await sql`select first_seen_at, now_price_pence, discount, sizes from products where external_id = '1'`;

            expect(after).toMatchObject({ now_price_pence: 3000, discount: 70, sizes: ['10'] });
            expect(after.first_seen_at).toEqual(before.first_seen_at);
        });

        it('marks products reported out of stock as sold out', async () => {
            await reconcile(sql, 'jd', range(3));
            const result = await reconcile(sql, 'jd', [product('0'), product('1'), product('2', { inStock: false })]);

            expect(result.soldOut).toBe(1);
            expect(await statusOf('2')).toBe('sold_out');
        });

        it('marks products that disappeared from the listing as sold out', async () => {
            await reconcile(sql, 'jd', range(4));
            const result = await reconcile(sql, 'jd', range(3));

            expect(result).toMatchObject({ status: 'ok', soldOut: 1 });
            expect(await statusOf('3')).toBe('sold_out');
        });

        it('brings a sold-out product back when it is restocked', async () => {
            await reconcile(sql, 'jd', range(2));
            await reconcile(sql, 'jd', [product('0'), product('1', { inStock: false })]);
            await reconcile(sql, 'jd', range(2));

            const [row] = await sql`select status, sold_out_at from products where external_id = '1'`;
            expect(row).toEqual({ status: 'active', sold_out_at: null });
        });

        it('does not remove missing products when the run saw too few (likely a failed fetch)', async () => {
            await reconcile(sql, 'jd', range(10));
            const result = await reconcile(sql, 'jd', range(2));

            expect(result).toMatchObject({ status: 'partial', soldOut: 0 });
            expect(await statusOf('9')).toBe('active');
        });

        it('handles the same product listed twice in one run', async () => {
            const result = await reconcile(sql, 'jd', [product('1', { inStock: false }), product('1')]);
            expect(result.upserted).toBe(1);
            expect(await statusOf('1')).toBe('active');
        });

        it('only touches its own retailer', async () => {
            await reconcile(sql, 'other', [product('x')]);
            await reconcile(sql, 'jd', range(1));
            expect((await sql`select status from products where retailer = 'other'`)[0].status).toBe('active');
        });
    });

    describe('listActiveDeals', () => {
        it('returns active deals above the floor, best first, in the frontend Item shape', async () => {
            await reconcile(sql, 'jd', [
                product('low', { discount: 20 }),
                product('good', { discount: 40, sizes: [], imageUrl: 'https://img/1' }),
                product('best', { discount: 70, nowPricePence: 1999 }),
                product('gone', { discount: 90, inStock: false }),
            ]);

            const deals = await listActiveDeals(sql, 30);
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
                timestamp: expect.any(Number),
                gender: 'Male',
            });
            expect(deals[1]).toMatchObject({ imageUrl: 'https://img/1', sizes: undefined });
        });
    });

    describe('runScrape', () => {
        const retailer = (fetchListings: Retailer['fetchListings'], id = 'jd'): Retailer => ({ id, fetchListings });

        it('records a run per retailer, and one failure does not stop the others', async () => {
            const outcome = await runScrape(sql, [
                retailer(async () => { throw new Error('blocked'); }, 'broken'),
                retailer(async () => range(2)),
            ]);

            expect(outcome).toBe('completed');
            const runs = await sql`select retailer, status, hits, error from scrape_runs order by id`;
            expect([...runs]).toMatchObject([
                { retailer: 'broken', status: 'failed', hits: 0, error: 'Error: blocked' },
                { retailer: 'jd', status: 'ok', hits: 2, error: null },
            ]);
        });

        it('skips when another run holds the lock, then runs again once it is released', async () => {
            let release!: () => void;
            const slow = runScrape(sql, [retailer(() => new Promise((resolve) => { release = () => resolve(range(1)); }))]);
            await Bun.sleep(50);

            expect(await runScrape(sql, [retailer(async () => range(1))])).toBe('skipped');
            release();
            expect(await slow).toBe('completed');
            expect(await runScrape(sql, [retailer(async () => range(1))])).toBe('completed');
        });
    });

    describe('HTTP routes', () => {
        const secret = 's'.repeat(32);
        const scrapeRequest = (auth?: string) =>
            new Request('http://local/jobs/scrape', { method: 'POST', headers: auth ? { Authorization: auth } : {} });

        it('rejects scrape triggers without the secret', async () => {
            const app = createApp({ sql, retailers: [], cronSecret: secret, minDiscount: 30 });
            expect(app.routes['/jobs/scrape'].POST(scrapeRequest('Bearer nope')).status).toBe(401);
        });

        it('scrapes in the background and serves the fresh deals afterwards', async () => {
            let stock = range(2);
            const app = createApp({ sql, retailers: [{ id: 'jd', fetchListings: async () => stock }], cronSecret: secret, minDiscount: 30 });
            const deals = async () => (await (await app.routes['/webscrape/getBestDeals'].GET(new Request('http://local/'))).json()) as Deal[];

            const response = app.routes['/jobs/scrape'].POST(scrapeRequest(`Bearer ${secret}`));
            expect(response.status).toBe(202);
            expect(await response.json()).toEqual({ started: true });
            await app.idle();
            expect(await deals()).toHaveLength(2);

            // One product sells out: it leaves the API on the next run.
            stock = [product('0'), product('1', { inStock: false })];
            app.routes['/jobs/scrape'].POST(scrapeRequest(`Bearer ${secret}`));
            await app.idle();
            expect((await deals()).map((deal) => deal.url)).toEqual(['https://example.com/0']);
        });

        it('does not start a second scrape while one is running in this process', async () => {
            let release!: () => void;
            const app = createApp({
                sql, cronSecret: secret, minDiscount: 30,
                retailers: [{ id: 'jd', fetchListings: () => new Promise((resolve) => { release = () => resolve([]); }) }],
            });

            expect(await app.routes['/jobs/scrape'].POST(scrapeRequest(`Bearer ${secret}`)).json()).toEqual({ started: true });
            expect(await app.routes['/jobs/scrape'].POST(scrapeRequest(`Bearer ${secret}`)).json()).toEqual({ started: false });
            await Bun.sleep(50);
            release();
            await app.idle();
        });
    });
});
