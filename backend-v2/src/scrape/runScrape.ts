import { recordRun } from '../db/products';
import type { Sql } from '../db/sql';
import { log } from '../log';
import { reconcile } from './reconcile';
import type { Retailer } from './retailers/types';

// Any constant works; it just has to be the same for every instance.
const SCRAPE_LOCK_KEY = 7_270_131;

export type ScrapeOutcome = 'completed' | 'skipped';

/**
 * Runs every retailer once. A Postgres advisory lock makes this safe to trigger from anywhere:
 * if another run is in progress, in this process or another instance, this one is skipped.
 * One retailer failing is recorded and does not stop the others.
 */
export async function runScrape(sql: Sql, retailers: Retailer[]): Promise<ScrapeOutcome> {
    const lockConnection = await sql.reserve();

    try {
        const [{ locked }] = await lockConnection`select pg_try_advisory_lock(${SCRAPE_LOCK_KEY}) as locked`;
        if (!locked) {
            log.info('scrape skipped: another run holds the lock');
            return 'skipped';
        }

        try {
            for (const retailer of retailers) {
                await scrapeRetailer(sql, retailer);
            }
        } finally {
            await lockConnection`select pg_advisory_unlock(${SCRAPE_LOCK_KEY})`;
        }

        return 'completed';
    } finally {
        lockConnection.release();
    }
}

async function scrapeRetailer(sql: Sql, retailer: Retailer): Promise<void> {
    const startedAt = new Date();

    try {
        const snapshots = await retailer.fetchListings();
        const result = await reconcile(sql, retailer.id, snapshots);
        await recordRun(sql, { retailer: retailer.id, startedAt, ...result });

        const fields = { retailer: retailer.id, ...result, ms: Date.now() - startedAt.getTime() };
        if (result.status === 'partial') {
            log.warn('scrape partial: too few products seen, skipped removing missing ones', fields);
        } else {
            log.info('scrape finished', fields);
        }
    } catch (error) {
        log.error('scrape failed', { retailer: retailer.id, error });
        await recordRun(sql, { retailer: retailer.id, startedAt, status: 'failed', error: String(error) })
            .catch((recordError) => log.error('could not record failed run', { error: recordError }));
    }
}
