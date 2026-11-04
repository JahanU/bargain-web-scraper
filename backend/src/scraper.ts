import type { AcceptStatus, DealStore } from '@/deals';
import { createLogger, duration } from '@/log';
import type { Listing, Retailer } from '@/retailers/types';

export interface RetailerRun {
    status: AcceptStatus | 'failed';
    at: string;
    ms: number;
    products?: number;
    added?: number;
    removed?: number;
    error?: string;
}

const log = createLogger('scraper');

/** The first retry after a failure. It doubles each time, up to the normal interval. */
export const FIRST_RETRY_MS = 15_000;

/**
 * Fetches one retailer and feeds its listing to the store. A failure (even a synchronous throw)
 * is recorded and the retailer's previous products are kept.
 */
export async function scrapeRetailer(retailer: Retailer, store: DealStore): Promise<RetailerRun> {
    const at = new Date().toISOString();
    const started = Date.now();
    log.info(`▶ scraping ${retailer.id}`);

    let listing: Listing;
    try {
        listing = await retailer.fetchListing();
    } catch (error) {
        const ms = Date.now() - started;
        log.error(`✗ ${retailer.id} scrape failed`, { error, took: duration(ms) });
        return { status: 'failed', at, ms, error: String(error) };
    }

    const ms = Date.now() - started;
    const result = store.accept(retailer.id, listing);
    const summary = { ...result, took: duration(ms) };
    if (result.status === 'ok') {
        log.info(`✓ ${retailer.id} scraped`, summary);
    } else if (result.status === 'held') {
        log.warn(`⚠ ${retailer.id}: sudden drop held back (applied if the next scrape confirms it)`, summary);
    } else {
        log.warn(`⚠ ${retailer.id}: incomplete listing (added and updated only, nothing removed)`, summary);
    }
    return { at, ms, ...result };
}

export interface LoopOptions {
    /** Runs one scrape; resolves to whether it succeeded. */
    scrape: () => Promise<boolean>;
    /** Used to label log lines, e.g. the retailer id. */
    name?: string;
    intervalMs: number;
    firstRetryMs?: number;
    signal?: AbortSignal;
    sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/**
 * Scrapes now, then forever: the normal interval after a success, and a quick doubling retry
 * after a failure. Each retailer gets its own loop, so its runs never overlap, and one failing
 * retailer's retries never make the healthy ones scrape more often.
 */
export async function runScrapeLoop({
    scrape,
    name = 'scrape',
    intervalMs,
    firstRetryMs = FIRST_RETRY_MS,
    signal,
    sleep = abortableSleep,
}: LoopOptions): Promise<void> {
    let failures = 0;
    while (!signal?.aborted) {
        const ok = await scrape();
        failures = ok ? 0 : failures + 1;
        const delay = ok ? intervalMs : Math.min(firstRetryMs * 2 ** (failures - 1), intervalMs);
        if (ok) {
            log.info(`⏱ ${name}: next scrape in ${duration(delay)}`);
        } else {
            log.warn(`↻ ${name}: retrying in ${duration(delay)}`, { failures });
        }
        await sleep(delay, signal);
    }
}

/** Like Bun.sleep, but wakes early when the signal aborts. */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(timer);
                resolve();
            },
            { once: true },
        );
    });
}
