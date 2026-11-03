import { describe, expect, it } from 'bun:test';
import { DealStore } from '@/deals';
import type { Retailer } from '@/retailers/types';
import { runScrapeLoop, scrapeRetailer } from '@/scraper';
import { complete, manualSleep, range } from './helpers';

describe('scrapeRetailer', () => {
    it('feeds a successful listing to the store and reports the result', async () => {
        const store = new DealStore();
        const run = await scrapeRetailer({ id: 'jd', fetchListing: async () => complete(range(2)) }, store);

        expect(run).toMatchObject({ status: 'ok', products: 2, added: 2, removed: 0 });
        expect(store.deals(0)).toHaveLength(2);
    });

    it('records a failure, even a synchronous throw, and keeps the previous products', async () => {
        const store = new DealStore();
        store.accept('jd', complete(range(2)));
        const broken: Retailer = {
            id: 'jd',
            fetchListing: () => {
                throw new Error('bad config');
            },
        };

        expect(await scrapeRetailer(broken, store)).toMatchObject({ status: 'failed', error: 'Error: bad config' });
        expect(store.deals(0)).toHaveLength(2);
    });

    it('times the fetch', async () => {
        const slow: Retailer = {
            id: 'slow',
            fetchListing: async () => {
                await Bun.sleep(60);
                return complete([]);
            },
        };
        expect((await scrapeRetailer(slow, new DealStore())).ms).toBeGreaterThanOrEqual(50);
    });
});

describe('runScrapeLoop', () => {
    it('waits the interval after a success, and retries sooner, doubling, after failures', async () => {
        const results = [false, false, false, false, true, false];
        const clock = manualSleep();
        const controller = new AbortController();
        const loop = runScrapeLoop({
            scrape: async () => results.shift() ?? true,
            intervalMs: 100,
            firstRetryMs: 15,
            sleep: clock.sleep,
            signal: controller.signal,
        });

        await clock.scrapesDone(1);
        for (let i = 0; i < 5; i++) {
            await clock.tick();
        }
        controller.abort();
        await loop;

        // fail, fail, fail, fail (capped at the interval), success, fail (back to the first retry)
        expect(clock.delays).toEqual([15, 30, 60, 100, 100, 15]);
    });

    it('stops when aborted, even mid-sleep', async () => {
        const controller = new AbortController();
        let scrapes = 0;
        const loop = runScrapeLoop({
            scrape: async () => {
                scrapes++;
                return true;
            },
            intervalMs: 60_000,
            signal: controller.signal,
        });

        await Bun.sleep(10);
        controller.abort();
        await loop;
        expect(scrapes).toBe(1);
    });
});
