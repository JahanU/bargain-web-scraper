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
 * Fetches every retailer in parallel and feeds each listing to the store. A retailer that fails
 * (even by throwing synchronously) is recorded, and its previous products are kept.
 */
export async function scrapeOnce(retailers: Retailer[], store: DealStore): Promise<Record<string, RetailerRun>> {
    const at = new Date().toISOString();
    const fetched = await Promise.all(retailers.map(async (retailer) => ({ retailer, ...(await timed(retailer)) })));

    const runs: Record<string, RetailerRun> = {};
    for (const { retailer, ms, listing, error } of fetched) {
        if (!listing) {
            log.error('scrape failed', { retailer: retailer.id, error });
            runs[retailer.id] = { status: 'failed', at, ms, error: String(error) };
            continue;
        }

        const result = store.accept(retailer.id, listing);
        runs[retailer.id] = { at, ms, ...result };
        const level = result.status === 'ok' ? 'info' : 'warn';
        log[level]('scrape finished', { retailer: retailer.id, ms, ...result });
    }
    return runs;
}

async function timed(retailer: Retailer): Promise<{ ms: number; listing?: Listing; error?: unknown }> {
    const started = Date.now();
    try {
        const listing = await retailer.fetchListing();
        return { ms: Date.now() - started, listing };
    } catch (error) {
        return { ms: Date.now() - started, error };
    }
}

export interface LoopOptions {
    /** Runs one scrape; resolves to whether every retailer succeeded. */
    scrape: () => Promise<boolean>;
    intervalMs: number;
    firstRetryMs?: number;
    signal?: AbortSignal;
    sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/**
 * Scrapes now, then forever: the normal interval after a success, and a quick doubling retry
 * after a failure. One loop, so runs can never overlap.
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
