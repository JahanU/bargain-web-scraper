import { describe, expect, it } from 'bun:test';
import { DealStore } from '@/deals';
import type { Retailer } from '@/retailers/types';
import { runScrapeLoop, scrapeOnce } from '@/scraper';
import { complete, manualSleep, range } from './helpers';

describe('scrapeOnce', () => {
    it('records a failing retailer (even a synchronous throw) and still runs the others', async () => {
        const broken: Retailer = {
            id: 'broken',
            fetchListing: () => {
                throw new Error('bad config');
            },
        };
        const working: Retailer = { id: 'jd', fetchListing: async () => complete(range(2)) };
        const store = new DealStore();

        const runs = await scrapeOnce([broken, working], store);

        expect(runs.broken).toMatchObject({ status: 'failed', error: 'Error: bad config' });
        expect(runs.jd).toMatchObject({ status: 'ok', products: 2, added: 2 });
        expect(store.deals(0)).toHaveLength(2);
    });

    it('times each retailer on its own', async () => {
        const fast: Retailer = { id: 'fast', fetchListing: async () => complete([]) };
        const slow: Retailer = {
            id: 'slow',
            fetchListing: async () => {
                await Bun.sleep(60);
                return complete([]);
            },
        };

        const runs = await scrapeOnce([fast, slow], new DealStore());
        expect(runs.fast?.ms).toBeLessThan(30);
        expect(runs.slow?.ms).toBeGreaterThanOrEqual(50);
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
