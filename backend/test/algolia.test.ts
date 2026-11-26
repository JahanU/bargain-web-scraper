import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { createLogger } from '@/log';
import { searchAll } from '@/retailers/algolia';

const config = { applicationId: 'APP', searchApiKey: 'KEY', indexName: 'products' };
const log = createLogger('test');

interface Hit {
    objectID: string;
    price: number;
}

/**
 * An Algolia holding `hits` that pages no deeper than `cap` hits into one query. With `filters`
 * off it ignores numeric filters, like an index that can't filter on the attribute.
 */
function fakeAlgolia(hits: Hit[], { cap = 5000, filters = true } = {}) {
    const searches: { page: number; numericFilters?: string[] }[] = [];
    spyOn(globalThis, 'fetch').mockImplementation((async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        searches.push(body);
        const matching = hits.filter((hit) =>
            (filters ? (body.numericFilters ?? []) : []).every((filter: string) => {
                const [, operator, value] = filter.match(/^price(>=|<)(.+)$/) ?? [];
                return operator === '>=' ? hit.price >= Number(value) : hit.price < Number(value);
            }),
        );
        const reachable = matching.slice(0, cap);
        return Response.json({
            hits: reachable.slice(body.page * 1000, (body.page + 1) * 1000),
            nbHits: matching.length,
            nbPages: Math.ceil(reachable.length / 1000),
        });
    }) as typeof fetch);
    return searches;
}

const priced = (count: number, price: (i: number) => number) =>
    Array.from({ length: count }, (_, i) => ({ objectID: String(i), price: price(i) }));

afterEach(() => {
    mock.restore();
});

describe('searchAll', () => {
    it('reads a query within the pagination cap as it is, with no price filter', async () => {
        const searches = fakeAlgolia(priced(2500, (i) => i));
        const { hits, complete } = await searchAll<Hit>(config, {}, log, 'sale', 'price');
        expect(hits).toHaveLength(2500);
        expect(complete).toBe(true);
        expect(searches).toHaveLength(3);
        expect(searches.every((search) => search.numericFilters === undefined)).toBe(true);
    });

    it('reads a query past the cap in price ranges, each hit once', async () => {
        // Most of them cheap, as in a real sale, so one cut is not enough.
        fakeAlgolia(priced(12_000, (i) => (i < 11_000 ? (i % 6000) / 100 : i)));
        const { hits, complete } = await searchAll<Hit>(config, {}, log, 'sale', 'price');
        expect(complete).toBe(true);
        expect(new Set(hits.map((hit) => hit.objectID)).size).toBe(12_000);
        expect(hits).toHaveLength(12_000);
    });

    it('is incomplete when more hits share one price than the cap allows', async () => {
        fakeAlgolia(priced(6000, () => 20));
        const { hits, complete } = await searchAll<Hit>(config, {}, log, 'sale', 'price');
        expect(hits).toHaveLength(5000);
        expect(complete).toBe(false);
    });

    it('keeps the capped hits when the index ignores the price filter', async () => {
        const searches = fakeAlgolia(
            priced(6000, (i) => i),
            { filters: false },
        );
        const { hits, complete } = await searchAll<Hit>(config, {}, log, 'sale', 'price');
        expect(hits).toHaveLength(5000);
        expect(complete).toBe(false);
        // The capped pages, then page 0 of each half: no further cuts.
        expect(searches).toHaveLength(7);
    });

    it('does not split without an attribute to split by', async () => {
        const searches = fakeAlgolia(priced(6000, (i) => i));
        expect(await searchAll<Hit>(config, {}, log, 'sale')).toMatchObject({
            hits: { length: 5000 },
            complete: false,
        });
        expect(searches).toHaveLength(5);
    });
});
