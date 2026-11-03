import { describe, expect, it } from 'bun:test';
import { createApp } from '../src/app';
import type { ProductSnapshot, Retailer } from '../src/scrape/retailers/types';
import type { Deal } from '../src/store/catalogue';
import { product, range, tempFile } from './helpers';

const secret = 's'.repeat(32);

const getDeals = async (app: Awaited<ReturnType<typeof createApp>>) =>
    (await (await app.routes['/webscrape/getBestDeals'].GET(new Request('http://local/'))).json()) as Deal[];
const scrapeRequest = (auth?: string) =>
    new Request('http://local/jobs/scrape', { method: 'POST', headers: auth ? { Authorization: auth } : {} });

/** An app whose only retailer returns `fetchProducts()` as a complete listing. */
async function setup(
    fetchProducts: () => Promise<ProductSnapshot[]>,
    options: { cronSecret?: string; dataFile?: string; retryDelaysMs?: number[] } = {},
) {
    const dataFile = options.dataFile ?? await tempFile();
    const retailer: Retailer = { id: 'jd', fetchListings: async () => ({ products: await fetchProducts(), complete: true }) };
    const app = await createApp({
        retailers: [retailer], dataFile, minDiscount: 30, cronSecret: options.cronSecret, retryDelaysMs: options.retryDelaysMs ?? [],
    });
    return { app, dataFile };
}

describe('app', () => {
    it('makes the first requests wait for the boot scrape instead of serving nothing', async () => {
        let release!: () => void;
        const { app } = await setup(() => new Promise((resolve) => { release = () => resolve(range(2)); }));

        app.scrape();
        const pending = getDeals(app);
        await Bun.sleep(10);
        release();
        expect(await pending).toHaveLength(2);
    });

    it('drops sold-out products from the API on the next scrape', async () => {
        let stock: ProductSnapshot[] = range(2);
        const { app } = await setup(async () => stock);

        app.scrape();
        await app.idle();
        expect(await getDeals(app)).toHaveLength(2);

        stock = [product('0'), product('1', { inStock: false })];
        app.scrape();
        await app.idle();
        expect((await getDeals(app)).map((deal) => deal.url)).toEqual(['https://example.com/0']);
    });

    it('saves after each scrape and serves the saved deals straight away after a restart', async () => {
        const first = await setup(async () => range(3));
        first.app.scrape();
        await first.app.idle();

        // New process, same file; its retailer hangs, so anything served must come from disk.
        const second = await setup(() => new Promise(() => {}), { dataFile: first.dataFile });
        expect(await getDeals(second.app)).toHaveLength(3);
    });

    it('keeps serving the last good deals when a retailer fails, and reports it on /health', async () => {
        let fail = false;
        const { app } = await setup(async () => {
            if (fail) throw new Error('blocked');
            return range(2);
        });

        app.scrape();
        await app.idle();
        fail = true;
        app.scrape();
        await app.idle();

        expect(await getDeals(app)).toHaveLength(2);
        const health = await app.routes['/health']().json() as { deals: number; lastRuns: { status: string; error?: string }[] };
        expect(health.deals).toBe(2);
        expect(health.lastRuns).toMatchObject([{ status: 'failed', error: 'Error: blocked' }]);
    });

    it('answers boot-time requests even when the first scrape fails', async () => {
        const { app } = await setup(async () => { throw new Error('blocked'); });
        app.scrape();
        expect(await getDeals(app)).toEqual([]);
    });

    it('does not start a second scrape while one is running', async () => {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const { app } = await setup(async () => (await gate, []));

        expect(app.scrape()).toBe(true);
        expect(app.scrape()).toBe(false);
        await Bun.sleep(10);
        release();
        await app.idle();
        expect(app.scrape()).toBe(true);
        await app.idle();
    });

    it('answers health checks on / as well as /health', async () => {
        const { app } = await setup(async () => []);
        expect(app.routes['/']().status).toBe(200);
        expect(await app.routes['/health']().json()).toMatchObject({ ok: true });
    });

    it('waits for the boot scrape when the saved file holds no active deals', async () => {
        const dataFile = await tempFile();
        await Bun.write(dataFile, JSON.stringify({ version: 1, savedAt: '', products: [{
            retailer: 'jd', externalId: 'old', name: 'Old', url: 'https://example.com/old', imageUrl: null, gender: 'Male',
            sizes: [], wasPricePence: 100, nowPricePence: 50, discount: 50, status: 'sold_out',
            firstSeenAt: 1, lastSeenAt: 1, soldOutAt: 2,
        }] }));

        let release!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const { app } = await setup(async () => (await gate, range(2)), { dataFile });

        app.scrape();
        const pending = getDeals(app);
        await Bun.sleep(10);
        release();
        expect(await pending).toHaveLength(2);
    });

    it('retries soon after a failed scrape instead of waiting a whole interval', async () => {
        let calls = 0;
        const { app } = await setup(async () => {
            calls++;
            if (calls === 1) throw new Error('JD hiccup');
            return range(2);
        }, { retryDelaysMs: [20] });

        app.scrape();
        await app.idle();
        expect(await getDeals(app)).toEqual([]);

        await Bun.sleep(60);
        await app.idle();
        expect(calls).toBe(2);
        expect(await getDeals(app)).toHaveLength(2);
    });

    it('gives up retrying early after the configured attempts', async () => {
        let calls = 0;
        const { app } = await setup(async () => {
            calls++;
            throw new Error('down');
        }, { retryDelaysMs: [10] });

        app.scrape();
        await Bun.sleep(80);
        await app.idle();
        expect(calls).toBe(2);
        app.stop();
    });

    it('does not serve products saved from a retailer that is no longer configured', async () => {
        const dataFile = await tempFile();
        await Bun.write(dataFile, JSON.stringify({ version: 2, savedAt: '', lastInStock: { gone: 1 }, products: [{
            retailer: 'gone', externalId: 'x', name: 'Old', url: 'https://example.com/x', imageUrl: null, gender: 'Male',
            sizes: [], wasPricePence: 100, nowPricePence: 50, discount: 50, status: 'active',
            firstSeenAt: 1, lastSeenAt: 1, soldOutAt: null,
        }] }));

        const { app } = await setup(async () => range(1), { dataFile });
        app.scrape();
        await app.idle();
        expect((await getDeals(app)).map((deal) => deal.url)).toEqual(['https://example.com/0']);
    });

    describe('POST /jobs/scrape', () => {
        it('starts a scrape with the right secret', async () => {
            const { app } = await setup(async () => range(1), { cronSecret: secret });
            const response = app.routes['/jobs/scrape'].POST(scrapeRequest(`Bearer ${secret}`));

            expect(response.status).toBe(202);
            expect(await response.json()).toEqual({ started: true });
            await app.idle();
        });

        it('rejects a wrong secret, and is off entirely when no secret is configured', async () => {
            const withSecret = await setup(async () => [], { cronSecret: secret });
            expect(withSecret.app.routes['/jobs/scrape'].POST(scrapeRequest('Bearer nope')).status).toBe(401);

            const withoutSecret = await setup(async () => []);
            expect(withoutSecret.app.routes['/jobs/scrape'].POST(scrapeRequest(`Bearer ${secret}`)).status).toBe(401);
        });
    });
});
