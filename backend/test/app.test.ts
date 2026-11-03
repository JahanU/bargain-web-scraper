// End-to-end scenarios: the real server and scrape loop, with fake retailers and a test-driven
// clock, exercised over HTTP the way the frontend uses it.
import { afterEach, describe, expect, it } from 'bun:test';
import { type AppOptions, startApp } from '@/app';
import type { Deal } from '@/deals';
import type { Retailer } from '@/retailers/types';
import { FIRST_RETRY_MS } from '@/scraper';
import { complete, type FakeRetailer, fakeRetailer, idsOf, manualSleep, product, range } from './helpers';

const INTERVAL_MS = 300_000;
const stops: (() => Promise<void>)[] = [];

afterEach(async () => {
    await Promise.all(stops.splice(0).map((stop) => stop()));
});

/**
 * Starts the app with a fake JD whose first response is given up front (the first scrape begins
 * immediately). The scrape loop sleeps on a test-driven clock unless `loop` says otherwise.
 */
function start(
    firstResponse?: FakeRetailer['next'],
    options: { retailers?: Retailer[]; loop?: AppOptions['loop'] } = {},
) {
    const jd = fakeRetailer('jd', firstResponse);
    const clock = manualSleep();
    const app = startApp({
        port: 0,
        minDiscount: 30,
        scrapeIntervalMs: INTERVAL_MS,
        retailers: options.retailers ?? [jd.retailer],
        loop: options.loop ?? { sleep: clock.sleep },
    });
    stops.push(app.stop);

    const get = (path: string) => fetch(new URL(path, app.server.url));
    return {
        jd,
        clock,
        get,
        dealIds: async () => idsOf((await (await get('/v1/deals')).json()) as Deal[]),
        health: async () => (await get('/health')).json() as Promise<Record<string, unknown>>,
    };
}

describe('after a deploy', () => {
    it('answers 503 + Retry-After while the first scrape runs, then serves the deals', async () => {
        let release!: () => void;
        const { clock, get, dealIds } = start(
            () => new Promise((resolve) => (release = () => resolve(complete(range(3))))),
        );

        const loading = await get('/webscrape/getBestDeals');
        expect(loading.status).toBe(503);
        expect(loading.headers.get('Retry-After')).toBe('10');

        release();
        await clock.scrapesDone(1);
        expect(await dealIds()).toEqual(['0', '1', '2']);
    });

    it('keeps answering 503 while JD is down, retries quickly, and recovers', async () => {
        const { jd, clock, get, dealIds, health } = start(() => Promise.reject(new Error('JD is down')));

        await clock.scrapesDone(1);
        expect((await get('/webscrape/getBestDeals')).status).toBe(503);
        expect(await health()).toMatchObject({ ready: false, runs: { jd: { status: 'failed' } } });
        expect(clock.delays).toEqual([FIRST_RETRY_MS]);

        jd.next = () => complete(range(2));
        await clock.tick();
        expect(await dealIds()).toEqual(['0', '1']);
        expect(clock.delays).toEqual([FIRST_RETRY_MS, INTERVAL_MS]);
    });

    it('serves an empty list (not an error) when the sale is genuinely empty', async () => {
        const { clock, get } = start();
        await clock.scrapesDone(1);

        const response = await get('/webscrape/getBestDeals');
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
        const { dealIds } = start(undefined, {
            retailers: [healthy.retailer, broken.retailer],
            loop: { firstRetryMs: 10 }, // real timers: retries at 10ms, 20ms, 40ms…
        });

        await Bun.sleep(100);
        expect(broken.calls).toBeGreaterThanOrEqual(3);
        expect(healthy.calls).toBe(1);
        expect(await dealIds()).toEqual(['0', '1']);
    });
});

describe('HTTP', () => {
    it('answers health checks on / and /health, and 404s unknown paths', async () => {
        const { clock, get, health } = start();
        await clock.scrapesDone(1);

        expect(await health()).toMatchObject({ ok: true, ready: true, deals: 0 });
        expect((await get('/')).status).toBe(200);
        expect((await get('/nope')).status).toBe(404);
    });
});
