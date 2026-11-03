import { log } from '../log';
import { reconcile, type Catalogue } from '../store/catalogue';
import type { Retailer } from './retailers/types';

export interface RunRecord {
    retailer: string;
    startedAt: string;
    ms: number;
    status: 'ok' | 'partial' | 'failed';
    hits: number;
    upserted: number;
    soldOut: number;
    error?: string;
}

/**
 * Fetches every retailer in parallel, then reconciles each into the catalogue.
 * One retailer failing is recorded and leaves its products untouched; the others carry on.
 */
export async function scrapeAll(catalogue: Catalogue, retailers: Retailer[]): Promise<RunRecord[]> {
    const startedAt = Date.now();
    const fetched = await Promise.allSettled(retailers.map((retailer) => retailer.fetchListings()));

    return retailers.map((retailer, index) => {
        const outcome = fetched[index]!;
        const base = { retailer: retailer.id, startedAt: new Date(startedAt).toISOString() };

        if (outcome.status === 'rejected') {
            log.error('scrape failed', { retailer: retailer.id, error: outcome.reason });
            return { ...base, ms: Date.now() - startedAt, status: 'failed', hits: 0, upserted: 0, soldOut: 0, error: String(outcome.reason) };
        }

        const result = reconcile(catalogue, retailer.id, outcome.value);
        const record: RunRecord = { ...base, ms: Date.now() - startedAt, ...result };

        if (result.status === 'partial') {
            log.warn('scrape partial: too few products seen, skipped removing missing ones', { ...record });
        } else {
            log.info('scrape finished', { ...record });
        }

        return record;
    });
}
