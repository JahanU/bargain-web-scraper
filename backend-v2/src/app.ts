import type { Sql } from './db/sql';
import { listActiveDeals } from './db/products';
import { hasBearer } from './http/auth';
import { DealsSnapshot } from './http/dealsSnapshot';
import { log } from './log';
import { runScrape } from './scrape/runScrape';
import type { Retailer } from './scrape/retailers/types';

export interface AppOptions {
    sql: Sql;
    retailers: Retailer[];
    cronSecret: string;
    minDiscount: number;
}

/** Builds the route table. Kept apart from main.ts so tests can drive it without a real server. */
export function createApp({ sql, retailers, cronSecret, minDiscount }: AppOptions) {
    const snapshot = new DealsSnapshot(() => listActiveDeals(sql, minDiscount));
    let running: Promise<void> | undefined;

    /** Starts a scrape unless one is already running here; refreshes the snapshot when done. */
    function startScrape(): boolean {
        if (running) {
            return false;
        }

        running = runScrape(sql, retailers)
            .then((outcome) => (outcome === 'completed' ? snapshot.refresh().then(() => {}) : undefined))
            .catch((error) => log.error('scrape run crashed', { error }))
            .finally(() => {
                running = undefined;
            });

        return true;
    }

    const routes = {
        '/health': () => Response.json({ ok: true }),

        '/v1/deals': { GET: (request: Request) => snapshot.respond(request) },

        // The path the current frontend calls. Same payload as /v1/deals.
        '/webscrape/getBestDeals': { GET: (request: Request) => snapshot.respond(request) },

        // Called by Supabase cron. Answers at once; the scrape carries on in the background.
        '/jobs/scrape': {
            POST: (request: Request) => {
                if (!hasBearer(request, cronSecret)) {
                    return Response.json({ error: 'Unauthorized' }, { status: 401 });
                }

                const started = startScrape();
                return Response.json({ started }, { status: 202 });
            },
        },
    };

    return {
        routes,
        snapshot,
        /** Resolves once any scrape running in this process has finished. */
        idle: () => running ?? Promise.resolve(),
    };
}
