import type { AcceptStatus, DealStore } from '@/deals';
import { log } from '@/log';
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

/** The first retry after a failure. It doubles each time, up to the normal interval. */
export const FIRST_RETRY_MS = 15_000;

/**
 * Fetches one retailer and feeds its listing to the store. A failure (even a synchronous throw)
 * is recorded and the retailer's previous products are kept.
 */
export async function scrapeRetailer(retailer: Retailer, store: DealStore): Promise<RetailerRun> {
    const at = new Date().toISOString();
    const started = Date.now();
    let listing: Listing;
    try {
        listing = await retailer.fetchListing();
    } catch (error) {
        const ms = Date.now() - started;
        log.error('scrape failed', { retailer: retailer.id, ms, error });
        return { status: 'failed', at, ms, error: String(error) };
    }

    const ms = Date.now() - started;
    const result = store.accept(retailer.id, listing);
    log[result.status === 'ok' ? 'info' : 'warn']('scrape finished', { retailer: retailer.id, ms, ...result });
    return { at, ms, ...result };
}

export interface LoopOptions {
    /** Runs one scrape; resolves to whether it succeeded. */
    scrape: () => Promise<boolean>;
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
