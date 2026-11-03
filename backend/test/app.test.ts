// End-to-end scenarios: the real server and scrape loop, with a fake retailer and a test-driven
// clock, exercised over HTTP the way the frontend uses it.
import { afterEach, describe, expect, it } from 'bun:test';
import { startApp } from '@/app';
import type { Deal } from '@/deals';
import { complete, type FakeRetailer, fakeRetailer, manualSleep, product, range } from './helpers';

type App = ReturnType<typeof startApp>;
const running: App[] = [];

afterEach(async () => {
    await Promise.all(running.splice(0).map((app) => app.stop()));
});

/** Starts the app. The first scrape begins immediately, so its JD response is given up front. */
function start(firstResponse?: FakeRetailer['next']) {
    const jd = fakeRetailer('jd', firstResponse);
    const clock = manualSleep();
    const app = startApp({
        port: 0,
        minDiscount: 30,
        scrapeIntervalMs: 300_000,
        retailers: [jd.retailer],
        loop: { sleep: clock.sleep, firstRetryMs: 15_000 },
    });
    running.push(app);

    const url = (path: string) => new URL(path, app.server.url);
    return {
        jd,
        clock,
        getDeals: () => fetch(url('/webscrape/getBestDeals')),
        dealIds: async () =>
            ((await (await fetch(url('/v1/deals'))).json()) as Deal[]).map((deal) => deal.url.split('/').pop()),
        health: async () => (await fetch(url('/health'))).json() as Promise<Record<string, unknown>>,
    };
}

describe('after a deploy', () => {
    it('answers 503 + Retry-After while the first scrape runs, then serves the deals', async () => {
        let release!: () => void;
        const { clock, getDeals, dealIds } = start(
            () => new Promise((resolve) => (release = () => resolve(complete(range(3))))),
        );

        const loading = await getDeals();
        expect(loading.status).toBe(503);
        expect(loading.headers.get('Retry-After')).toBe('10');

        release();
        await clock.scrapesDone(1);
        expect(await dealIds()).toEqual(['0', '1', '2']);
    });

    it('keeps answering 503 while JD is down, retries quickly, and recovers', async () => {
        const { jd, clock, getDeals, dealIds, health } = start(() => Promise.reject(new Error('JD is down')));

        await clock.scrapesDone(1);
        expect((await getDeals()).status).toBe(503);
        expect(await health()).toMatchObject({ ready: false, runs: { jd: { status: 'failed' } } });
        expect(clock.delays).toEqual([15_000]);

        jd.next = () => complete(range(2));
        await clock.tick();
        expect(await dealIds()).toEqual(['0', '1']);
        expect(clock.delays).toEqual([15_000, 300_000]);
    });

    it('serves an empty list (not an error) when the sale is genuinely empty', async () => {
        const { clock, getDeals } = start();
        await clock.scrapesDone(1);

        const response = await getDeals();
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });
});

describe('while running', () => {
    it('removes sold-out and delisted products on the next scrape', async () => {
        const { jd, clock, dealIds } = start(() => complete(range(4)));
        await clock.scrapesDone(1);

        jd.next = () => complete([product('0'), product('1'), product('2', { inStock: false })]);
        await clock.tick();
        expect(await dealIds()).toEqual(['0', '1']);
    });

    it('keeps serving the last deals when JD fails, and reports it on /health', async () => {
        const { jd, clock, dealIds, health } = start(() => complete(range(2)));
        await clock.scrapesDone(1);

        jd.next = () => Promise.reject(new Error('timeout'));
        await clock.tick();
        expect(await dealIds()).toEqual(['0', '1']);
        expect(await health()).toMatchObject({
            ok: true,
            ready: true,
            deals: 2,
            runs: { jd: { status: 'failed', error: 'Error: timeout' } },
        });
    });

    it('holds back a suspicious drop once, then applies it when confirmed', async () => {
        const { jd, clock, dealIds } = start(() => complete(range(10)));
        await clock.scrapesDone(1);

        jd.next = () => complete(range(2));
        await clock.tick();
        expect(await dealIds()).toHaveLength(10);

        await clock.tick();
        expect(await dealIds()).toEqual(['0', '1']);
    });

    it('clears everything when a sale ends, after one confirming scrape', async () => {
        const { jd, clock, dealIds } = start(() => complete(range(5)));
        await clock.scrapesDone(1);

        jd.next = () => complete([]);
        await clock.tick();
        await clock.tick();
        expect(await dealIds()).toEqual([]);
    });

    it('adds new deals from an incomplete listing without removing the rest', async () => {
        const { jd, clock, dealIds } = start(() => complete(range(3)));
        await clock.scrapesDone(1);

        jd.next = () => ({ products: [product('new')], complete: false });
        await clock.tick();
        expect(await dealIds()).toEqual(['0', '1', '2', 'new']);
    });

    it('only serves deals at or above the discount floor', async () => {
        const { clock, dealIds } = start(() =>
            complete([product('big', { discount: 60 }), product('small', { discount: 10 })]),
        );
        await clock.scrapesDone(1);
        expect(await dealIds()).toEqual(['big']);
    });
});

describe('several retailers', () => {
    it('retries a failing retailer quickly without re-scraping the healthy one', async () => {
        const healthy = fakeRetailer('jd', () => complete(range(2)));
        const broken = fakeRetailer('other', () => Promise.reject(new Error('blocked')));
        const app = startApp({
            port: 0,
            minDiscount: 30,
            scrapeIntervalMs: 300_000,
            retailers: [healthy.retailer, broken.retailer],
            loop: { firstRetryMs: 10 }, // real timers: retries at 10ms, 20ms, 40ms…
        });
        running.push(app);

        await Bun.sleep(100);
        expect(broken.calls).toBeGreaterThanOrEqual(3);
        expect(healthy.calls).toBe(1);

        const deals = (await (await fetch(new URL('/v1/deals', app.server.url))).json()) as Deal[];
        expect(deals).toHaveLength(2);
    });
});

describe('HTTP', () => {
    it('answers health checks on / and /health, and 404s unknown paths', async () => {
        const { clock, health } = start();
        await clock.scrapesDone(1);
        expect(await health()).toMatchObject({ ok: true, ready: true, deals: 0 });

        const app = running[0] as App;
        expect((await fetch(new URL('/', app.server.url))).status).toBe(200);
        expect((await fetch(new URL('/nope', app.server.url))).status).toBe(404);
    });
});
