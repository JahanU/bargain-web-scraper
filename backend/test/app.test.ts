// End-to-end scenarios: the real server and scrape loop, with fake retailers and a test-driven
// clock, exercised over HTTP the way the frontend uses it.
import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { type AppOptions, startApp } from '@/app';
import type { Deal } from '@/deals';
import type { DealPage } from '@/query';
import type { Retailer } from '@/retailers/types';
import { FIRST_RETRY_MS } from '@/scraper';
import { complete, type FakeRetailer, fakeRetailer, idsOf, manualSleep, product, range } from './helpers';

const INTERVAL_MS = 300_000;
const stops: (() => Promise<void>)[] = [];

afterEach(async () => {
    await Promise.all(stops.splice(0).map((stop) => stop()));
    mock.restore();
    Bun.env.LOG_LEVEL = 'silent';
});

/**
 * Starts the app with a fake JD whose first response is given up front (the first scrape begins
 * immediately). The scrape loop sleeps on a test-driven clock unless `loop` says otherwise.
 */
function start(
    firstResponse?: FakeRetailer['next'],
    options: { retailers?: Retailer[]; loop?: AppOptions['loop']; intervalMs?: number } = {},
) {
    const jd = fakeRetailer('jd', firstResponse);
    const clock = manualSleep();
    const app = startApp({
        port: 0,
        minDiscount: 30,
        scrapeIntervalMs: options.intervalMs ?? INTERVAL_MS,
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
        deals: async () => (await (await get('/v1/deals')).json()) as Deal[],
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

describe('paging through /v2/deals', () => {
    const discounts = (entries: Record<string, number>) =>
        complete(Object.entries(entries).map(([id, discount]) => product(id, { discount })));

    it('serves no deal twice and skips no survivor when a scrape lands between pages', async () => {
        const { jd, clock, get } = start(() => discounts({ a: 90, b: 80, c: 70, d: 60, e: 50, f: 40 }));
        await clock.scrapesDone(1);
        const page = async (query: string) => (await (await get(`/v2/deals?limit=2${query}`)).json()) as DealPage;

        const first = await page('');
        expect(idsOf(first.items)).toEqual(['a', 'b']);
        expect(first.total).toBe(6);

        // Gone: one already served and one still to come. New: one before the cursor, one after.
        jd.next = () => discounts({ b: 80, c: 70, e: 50, f: 40, early: 95, late: 55 });
        await clock.tick();

        const second = await page(`&cursor=${first.nextCursor}`);
        const third = await page(`&cursor=${second.nextCursor}`);
        expect(idsOf(second.items)).toEqual(['c', 'late']);
        expect(idsOf(third.items)).toEqual(['e', 'f']);
        expect(third.nextCursor).toBeNull();
        expect(second.total).toBe(6);
    });

    it('rejects a bad query before the first scrape, and names the configured stores', async () => {
        let release!: () => void;
        const { clock, get } = start(() => new Promise((resolve) => (release = () => resolve(complete([])))));

        const bad = await get('/v2/deals?store=nike');
        expect(bad.status).toBe(400);
        expect(await bad.json()).toEqual({ error: 'store must be one of jd' });
        expect((await get('/v2/deals?store=jd')).status).toBe(503);

        release();
        await clock.scrapesDone(1);
        expect((await get('/v2/deals?store=jd')).status).toBe(200);
    });

    it('stamps each deal with its store and counts every configured retailer', async () => {
        const other = fakeRetailer('other', () => complete([product('x', { discount: 70 })]));
        const jd = fakeRetailer('jd', () => complete(range(2)));
        const { get } = start(undefined, { retailers: [jd.retailer, other.retailer], loop: { firstRetryMs: 10 } });
        await Bun.sleep(50);

        const { items, facets } = (await (await get('/v2/deals?q=shop%20other')).json()) as DealPage;
        expect(items.map(({ url, store }) => [url, store])).toEqual([['https://example.com/x', 'other']]);
        expect(facets?.stores).toEqual([
            { store: 'jd', name: 'Shop jd', count: 0 },
            { store: 'other', name: 'Shop other', count: 1 },
        ]);
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

    it('keeps updating JD while Size fails, keeps the Size deals it had, and logs the failure', async () => {
        const jd = fakeRetailer('jd', () => complete([product('jd-old')]));
        const size = fakeRetailer('size', () => complete([product('size-kept')]));
        const { deals, health } = start(undefined, {
            retailers: [jd.retailer, size.retailer],
            loop: { firstRetryMs: 10 }, // real timers: every scrape and retry is 10ms apart
            intervalMs: 10,
        });
        await Bun.sleep(50);

        const logged = spyOn(console, 'error').mockImplementation(() => {});
        Bun.env.LOG_LEVEL = 'error';
        size.next = () => Promise.reject(new Error('Size is down'));
        jd.next = () => complete([product('jd-new')]);
        await Bun.sleep(100);

        const served = (await deals()).map((deal) => `${deal.store}:${deal.url.split('/').pop()}`);
        expect(served.sort()).toEqual(['jd:jd-new', 'size:size-kept']);
        expect(await health()).toMatchObject({
            runs: { jd: { status: 'ok' }, size: { status: 'failed', error: 'Error: Size is down' } },
        });
        expect(logged.mock.calls.flat().join('\n')).toContain('size scrape failed');
    });
});

describe('HTTP', () => {
    it('answers health checks on / and /health, and 404s unknown paths', async () => {
        const { clock, get, health } = start();
        await clock.scrapesDone(1);

        expect(await health()).toMatchObject({ ok: true, ready: true, deals: 0 });
        // Callable from the browser frontend (a different origin).
        expect((await get('/health')).headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect((await get('/')).status).toBe(200);
        const notFound = await get('/nope');
        expect(notFound.status).toBe(404);
        // Readable from the browser frontend, rather than surfacing as a CORS network error.
        expect(notFound.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
});
