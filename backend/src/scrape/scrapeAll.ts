import { log } from '@/log';
import type { Listing, Retailer } from '@/scrape/retailers/types';
import { type Catalogue, reconcile } from '@/store/catalogue';

export interface RunRecord {
    retailer: string;
    startedAt: string;
    ms: number;
    status: 'ok' | 'partial' | 'failed';
    hits: number;
    upserted: number;
    soldOut: number;
    complete?: boolean;
    error?: string;
}

type TimedFetch = { ms: number } & ({ listing: Listing } | { error: unknown });

/**
 * Fetches one retailer, timing it on its own. Being async, a synchronous throw from the
 * adapter becomes a failed result too, rather than escaping and sinking the whole scrape.
 */
async function timedFetch(retailer: Retailer): Promise<TimedFetch> {
    const started = Date.now();
    try {
        return { listing: await retailer.fetchListings(), ms: Date.now() - started };
    } catch (error) {
        return { error, ms: Date.now() - started };
    }
}

/**
 * Fetches every retailer in parallel, then reconciles each into the catalogue.
 * One retailer failing is recorded and leaves its products untouched; the others carry on.
 */
export async function scrapeAll(catalogue: Catalogue, retailers: Retailer[]): Promise<RunRecord[]> {
    const startedAt = new Date().toISOString();
    const fetched = await Promise.all(
        retailers.map(async (retailer) => ({ retailer, outcome: await timedFetch(retailer) })),
    );

    return fetched.map(({ retailer, outcome }) => {
        const base = { retailer: retailer.id, startedAt, ms: outcome.ms };

        if ('error' in outcome) {
            log.error('scrape failed', { retailer: retailer.id, error: outcome.error });
            return { ...base, status: 'failed', hits: 0, upserted: 0, soldOut: 0, error: String(outcome.error) };
        }

        const { products, complete } = outcome.listing;
        const result = reconcile(catalogue, retailer.id, products, Date.now(), complete);
        const record: RunRecord = { ...base, ...result, complete };

        if (result.status === 'partial') {
            log.warn('scrape partial: incomplete or suspiciously small listing, skipped removing missing products', {
                ...record,
            });
        } else {
            log.info('scrape finished', { ...record });
        }

        return record;
    });
}
