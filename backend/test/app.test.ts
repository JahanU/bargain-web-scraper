import { describe, expect, it } from 'bun:test';
import { createApp } from '../src/app';
import type { ProductSnapshot, Retailer } from '../src/scrape/retailers/types';
import type { Deal } from '../src/store/catalogue';
import { product, range, tempFile } from './helpers';

const secret = 's'.repeat(32);

const retailer = (fetchListings: Retailer['fetchListings'], id = 'jd'): Retailer => ({ id, fetchListings });
const getDeals = async (app: Awaited<ReturnType<typeof createApp>>) =>
    (await (await app.routes['/webscrape/getBestDeals'].GET(new Request('http://local/'))).json()) as Deal[];
const scrapeRequest = (auth?: string) =>
    new Request('http://local/jobs/scrape', { method: 'POST', headers: auth ? { Authorization: auth } : {} });

async function setup(fetchListings: Retailer['fetchListings'], options: { cronSecret?: string; dataFile?: string } = {}) {
    const dataFile = options.dataFile ?? await tempFile();
    const app = await createApp({ retailers: [retailer(fetchListings)], dataFile, minDiscount: 30, cronSecret: options.cronSecret });
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
