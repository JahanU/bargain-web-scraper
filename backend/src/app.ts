import { DealStore } from '@/deals';
import { notFound, routes } from '@/http';
import { createLogger } from '@/log';
import { buildSnapshot, type Snapshot } from '@/query';
import type { Retailer } from '@/retailers/types';
import { type LoopOptions, type RetailerRun, runScrapeLoop, scrapeRetailer } from '@/scraper';

export interface AppOptions {
    port: number;
    minDiscount: number;
    scrapeIntervalMs: number;
    retailers: Retailer[];
    /** Overrides for tests. */
    loop?: Pick<LoopOptions, 'firstRetryMs' | 'sleep'>;
}

const log = createLogger('app');

/** Starts the HTTP server and a scrape loop per retailer. `stop()` shuts them down (used by tests). */
export function startApp({ port, minDiscount, scrapeIntervalMs, retailers, loop }: AppOptions) {
    const store = new DealStore();
    const stores = retailers.map(({ id, name }) => ({ id, name }));
    // What every request reads, rebuilt after each accepted scrape. Undefined until the first one,
    // so clients get a 503 asking them to retry.
    let snapshot: Snapshot | undefined;
    const lastRuns: Record<string, RetailerRun> = {};

    async function scrape(retailer: Retailer): Promise<boolean> {
        const run = await scrapeRetailer(retailer, store);
        lastRuns[retailer.id] = run;

        if (run.status !== 'failed') {
            snapshot = buildSnapshot(store.deals(minDiscount), stores, minDiscount);
            log.info(`✓ serving ${snapshot.deals.length} deals`);
        }
        return run.status !== 'failed';
    }

    const server = Bun.serve({
        port,
        routes: routes(
            stores,
            () => snapshot,
            () => ({ ok: true, ready: snapshot !== undefined, deals: snapshot?.deals.length ?? 0, runs: lastRuns }),
        ),
        fetch: notFound,
    });
    log.info(`✓ listening on ${server.url}`, { retailers: retailers.map((retailer) => retailer.id).join(',') });

    // One loop per retailer. Deliberately not caught: a loop only fails on a bug, and crashing
    // lets Render restart the service, rather than quietly serving stale deals forever.
    const controller = new AbortController();
    const loopsDone = Promise.all(
        retailers.map((retailer) =>
            runScrapeLoop({
                scrape: () => scrape(retailer),
                name: retailer.id,
                intervalMs: scrapeIntervalMs,
                signal: controller.signal,
                ...loop,
            }),
        ),
    );

    return {
        server,
        async stop() {
            controller.abort();
            await server.stop(true);
            await loopsDone;
        },
    };
}
