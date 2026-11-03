import { DealStore } from '@/deals';
import { DealsResponse, routes } from '@/http';
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

/** Starts a scrape loop per retailer and the HTTP server. `stop()` shuts them down (used by tests). */
export function startApp({ port, minDiscount, scrapeIntervalMs, retailers, loop }: AppOptions) {
    const store = new DealStore();
    const response = new DealsResponse();
    const lastRuns: Record<string, RetailerRun> = {};

    async function scrape(retailer: Retailer): Promise<boolean> {
        const run = await scrapeRetailer(retailer, store);
        lastRuns[retailer.id] = run;

        // Rebuild the response whenever a listing was accepted. Until the first one, the response
        // stays "not ready" and clients get a 503 asking them to retry.
        if (run.status !== 'failed') {
            response.update(store.deals(minDiscount));
        }
        return run.status !== 'failed';
    }

    // One loop per retailer. Deliberately not caught: a loop only fails on a bug, and crashing
    // lets Render restart the service, rather than quietly serving stale deals forever.
    const controller = new AbortController();
    const loopsDone = Promise.all(
        retailers.map((retailer) =>
            runScrapeLoop({
                scrape: () => scrape(retailer),
                intervalMs: scrapeIntervalMs,
                signal: controller.signal,
                ...loop,
            }),
        ),
    );

    const server = Bun.serve({
        port,
        routes: routes(response, () => ({ ok: true, ready: response.ready, deals: response.count, runs: lastRuns })),
        fetch: () => Response.json({ error: 'Not Found' }, { status: 404 }),
    });

    return {
        server,
        async stop() {
            controller.abort();
            await server.stop(true);
            await loopsDone;
        },
    };
}
