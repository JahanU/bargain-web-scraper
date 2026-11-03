import { hasBearer } from './http/auth';
import { DealsSnapshot } from './http/dealsSnapshot';
import { log } from './log';
import { scrapeAll, type RunRecord } from './scrape/scrapeAll';
import type { Retailer } from './scrape/retailers/types';
import { listActiveDeals, purgeSoldOut } from './store/catalogue';
import { loadCatalogue, saveCatalogue } from './store/file';

export interface AppOptions {
    retailers: Retailer[];
    dataFile: string;
    minDiscount: number;
    cronSecret?: string;
}

/** Loads saved state and builds the route table. Kept apart from index.ts so tests can drive it. */
export async function createApp({ retailers, dataFile, minDiscount, cronSecret }: AppOptions) {
    const catalogue = await loadCatalogue(dataFile);
    const snapshot = new DealsSnapshot();
    let lastRuns: RunRecord[] = [];
    let running: Promise<void> | undefined;

    // Serve what the last process saved straight away, if it holds any deals. Otherwise early
    // requests wait for the boot scrape rather than getting an empty list.
    const savedDeals = listActiveDeals(catalogue, minDiscount);
    if (savedDeals.length) {
        snapshot.update(savedDeals);
    }

    /** Starts a scrape unless one is already running. Returns whether it started. */
    function scrape(): boolean {
        if (running) {
            return false;
        }

        running = (async () => {
            try {
                lastRuns = await scrapeAll(catalogue, retailers);
                purgeSoldOut(catalogue);
            } finally {
                // Always publish, even after a failure, so requests waiting on boot are answered.
                snapshot.update(listActiveDeals(catalogue, minDiscount));
            }
            await saveCatalogue(dataFile, catalogue);
        })()
            .catch((error) => log.error('scrape run crashed', { error }))
            .finally(() => {
                running = undefined;
            });

        return true;
    }

    const health = () => Response.json({ ok: true, deals: snapshot.count, lastRuns });

    const routes = {
        // `/` too, so a keep-awake ping or platform health check aimed at the root still gets 200.
        '/': health,
        '/health': health,

        '/v1/deals': { GET: (request: Request) => snapshot.respond(request) },

        // The path the current frontend calls. Same payload as /v1/deals.
        '/webscrape/getBestDeals': { GET: (request: Request) => snapshot.respond(request) },

        // Manual trigger. Only enabled when CRON_SECRET is set. Answers at once; scrapes in the background.
        '/jobs/scrape': {
            POST: (request: Request) => {
                if (!cronSecret || !hasBearer(request, cronSecret)) {
                    return Response.json({ error: 'Unauthorized' }, { status: 401 });
                }
                return Response.json({ started: scrape() }, { status: 202 });
            },
        },
    };

    return {
        routes,
        scrape,
        /** Resolves once any running scrape has finished. */
        idle: () => running ?? Promise.resolve(),
    };
}
