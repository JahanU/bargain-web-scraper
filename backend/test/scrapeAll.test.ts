import { describe, expect, it } from 'bun:test';
import type { Retailer } from '@/scrape/retailers/types';
import { scrapeAll } from '@/scrape/scrapeAll';
import { createCatalogue } from '@/store/catalogue';
import { range } from './helpers';

describe('scrapeAll', () => {
    it('records a synchronous throw as one failed retailer, and still runs the others', async () => {
        const broken: Retailer = {
            id: 'broken',
            fetchListings: () => {
                throw new Error('bad config');
            },
        };
        const working: Retailer = { id: 'jd', fetchListings: async () => ({ products: range(2), complete: true }) };
        const catalogue = createCatalogue();

        const runs = await scrapeAll(catalogue, [broken, working]);

        expect(runs).toMatchObject([
            { retailer: 'broken', status: 'failed', error: 'Error: bad config' },
            { retailer: 'jd', status: 'ok', hits: 2, complete: true },
        ]);
        expect(catalogue.products.size).toBe(2);
    });

    it('times each retailer on its own', async () => {
        const fast: Retailer = { id: 'fast', fetchListings: async () => ({ products: [], complete: true }) };
        const slow: Retailer = {
            id: 'slow',
            fetchListings: async () => {
                await Bun.sleep(60);
                return { products: [], complete: true };
            },
        };

        const [fastRun, slowRun] = await scrapeAll(createCatalogue(), [fast, slow]);

        expect(fastRun!.ms).toBeLessThan(30);
        expect(slowRun!.ms).toBeGreaterThanOrEqual(50);
    });

    it('reports an incomplete listing as partial', async () => {
        const truncated: Retailer = { id: 'jd', fetchListings: async () => ({ products: range(1), complete: false }) };
        const [run] = await scrapeAll(createCatalogue(), [truncated]);
        expect(run).toMatchObject({ status: 'partial', complete: false });
    });
});
