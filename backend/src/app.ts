import { DealStore } from '@/deals';
import { DealsResponse, routes } from '@/http';
import type { Retailer } from '@/retailers/types';
import { type LoopOptions, type RetailerRun, runScrapeLoop, scrapeOnce } from '@/scraper';

export interface AppOptions {
    port: number;
    minDiscount: number;
    scrapeIntervalMs: number;
    retailers: Retailer[];
    /** Overrides for tests. */
    loop?: Pick<LoopOptions, 'firstRetryMs' | 'sleep'>;
}

/** Starts the scrape loop and the HTTP server. `stop()` shuts both down (used by tests). */
export function startApp({ port, minDiscount, scrapeIntervalMs, retailers, loop }: AppOptions) {
    const store = new DealStore();
    const response = new DealsResponse();
    let lastRuns: Record<string, RetailerRun> = {};

    async function scrape(): Promise<boolean> {
        lastRuns = await scrapeOnce(retailers, store);
        const runs = Object.values(lastRuns);

        // Rebuild the response whenever any retailer's listing was accepted. Until the first one,
        // the response stays "not ready" and clients get a 503 asking them to retry.
        if (runs.some((run) => run.status !== 'failed')) {
            response.update(store.deals(minDiscount));
        }
        return runs.every((run) => run.status !== 'failed');
    }

    // Deliberately not caught: the loop only fails on a bug, and crashing lets Render restart the
    // service, rather than quietly serving stale deals forever.
    const controller = new AbortController();
    const loopDone = runScrapeLoop({ scrape, intervalMs: scrapeIntervalMs, signal: controller.signal, ...loop });

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
            await loopDone;
        },
    };
}
