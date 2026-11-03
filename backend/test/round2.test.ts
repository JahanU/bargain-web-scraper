// Reproductions for the second code review. Each test fails on the code before the fix.
import { describe, expect, it } from 'bun:test';
import { loadConfig } from '../src/config';
import { acceptsGzip, BOOT_WAIT_MS, DealsSnapshot, SERVER_IDLE_TIMEOUT_SECONDS } from '../src/http/dealsSnapshot';
import { createJDRetailer } from '../src/scrape/retailers/jd';
import { createCatalogue, listActiveDeals, reconcile } from '../src/store/catalogue';
import { loadCatalogue, saveCatalogue } from '../src/store/file';
import { range, tempFile } from './helpers';

const deal = { name: 'X', wasPrice: 10, nowPrice: 5, discount: 50, url: 'u', inStock: 'IN STOCK' as const, timestamp: 1, gender: 'Male' };
const get = (headers: Record<string, string> = {}) => new Request('http://local/v1/deals', { headers });

describe('round 2 reproductions', () => {
    it('#1 a sale that ends completely is cleared after one confirming run', () => {
        const catalogue = createCatalogue();
        reconcile(catalogue, 'jd', range(100), 1000);
        reconcile(catalogue, 'jd', [], 2000);
        reconcile(catalogue, 'jd', [], 3000);
        expect(listActiveDeals(catalogue, 0)).toHaveLength(0);
    });

    it('#2 a request waiting for the boot scrape gets 503 instead of hanging past the server timeout', async () => {
        const snapshot = new DealsSnapshot(50);
        const response = await snapshot.respond(get());
        expect(response.status).toBe(503);
    }, 1000);

    it('#3 rejects scrape intervals that overflow setInterval', () => {
        expect(() => loadConfig({ SCRAPE_INTERVAL_MINUTES: '50000' })).toThrow('SCRAPE_INTERVAL_MINUTES');
    });

    it('#4 one failed JD listing keeps the others, marked incomplete', async () => {
        const impl = (async (input: string | URL | Request) => {
            const url = String(input);
            if (url.includes('broken')) return new Response('down', { status: 500 });
            if (!url.includes('algolia.net')) return new Response(pageFor());
            return Response.json({ hits: [{ name: 'Nike Air', slug: 's', objectID: '1', discountPct: '50%', price: 5, wasPrice: 10, inStock: true }], nbHits: 1, nbPages: 1 });
        }) as typeof fetch;
        const jd = createJDRetailer({ fetch: impl, listingUrls: ['https://jd/men/ok/', 'https://jd/men/broken/'] });

        const listing = await jd.fetchListings();
        expect(listing.products).toHaveLength(1);
        expect(listing.complete).toBe(false);
    });

    it('#5 does not send gzip to a client that refuses it', async () => {
        const snapshot = new DealsSnapshot();
        snapshot.update([deal]);
        const response = await snapshot.respond(get({ 'Accept-Encoding': 'gzip;q=0, identity' }));
        expect(response.headers.get('Content-Encoding')).toBeNull();
    });

    it('#6 matches weak and list-form validators, and gives gzip its own ETag', async () => {
        const snapshot = new DealsSnapshot();
        snapshot.update([deal]);
        const plainTag = (await snapshot.respond(get())).headers.get('ETag')!;
        const gzipTag = (await snapshot.respond(get({ 'Accept-Encoding': 'gzip' }))).headers.get('ETag')!;

        expect(gzipTag).not.toBe(plainTag);
        expect((await snapshot.respond(get({ 'If-None-Match': `W/${plainTag}` }))).status).toBe(304);
        expect((await snapshot.respond(get({ 'If-None-Match': `"other", ${plainTag}` }))).status).toBe(304);
    });

    it('#8 trusts a short last page when Algolia says its count is approximate', async () => {
        const hits = Array.from({ length: 1000 }, (_, i) => ({ name: 'Nike Air', slug: `s${i}`, objectID: String(i), discountPct: '50%', inStock: true }));
        const impl = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = String(input);
            if (!url.includes('algolia.net')) return new Response(pageFor());
            const page = JSON.parse(String(init?.body)).page;
            return Response.json({ hits: page === 0 ? hits : [], nbHits: 1012, nbPages: 2, exhaustiveNbHits: false });
        }) as typeof fetch;

        const listing = await createJDRetailer({ fetch: impl }).fetchListings();
        expect(listing.complete).toBe(true);
    });

    it('#10 rejects non-integer numbers', () => {
        expect(() => loadConfig({ PORT: '8000.5' })).toThrow('PORT');
        expect(() => loadConfig({ PORT: '0x1F40' })).toThrow('PORT');
        expect(() => loadConfig({ MIN_DISCOUNT: '1e1' })).toThrow('MIN_DISCOUNT');
    });
});

describe('round 2 guard rails', () => {
    it('#1 a truncated listing does not lower the baseline', () => {
        const catalogue = createCatalogue();
        reconcile(catalogue, 'jd', range(100), 1000);
        reconcile(catalogue, 'jd', range(10), 2000, false);
        expect(catalogue.lastInStock.get('jd')).toBe(100);
    });

    it('#1 the baseline survives a save and reload', async () => {
        const path = await tempFile();
        const catalogue = createCatalogue();
        reconcile(catalogue, 'jd', [], 1000);
        await saveCatalogue(path, catalogue);
        expect((await loadCatalogue(path)).lastInStock.get('jd')).toBe(0);
    });

    it('#1 an older v1 data file still loads, using the active count as its baseline', async () => {
        const path = await tempFile();
        const old = createCatalogue();
        reconcile(old, 'jd', range(10), 1000);
        await Bun.write(path, JSON.stringify({ version: 1, savedAt: '', products: [...old.products.values()] }));

        const loaded = await loadCatalogue(path);
        expect(loaded.products.size).toBe(10);
        expect(reconcile(loaded, 'jd', range(2), 2000).status).toBe('partial');
    });

    it('#2 the boot wait always ends before the server would drop the connection', () => {
        expect(BOOT_WAIT_MS).toBeLessThan(SERVER_IDLE_TIMEOUT_SECONDS * 1000);
        expect(SERVER_IDLE_TIMEOUT_SECONDS).toBeLessThanOrEqual(255); // Bun's maximum
    });

    it('#5 parses Accept-Encoding q-values', () => {
        expect(acceptsGzip('gzip')).toBe(true);
        expect(acceptsGzip('br, gzip;q=0.5')).toBe(true);
        expect(acceptsGzip('gzip;q=0')).toBe(false);
        expect(acceptsGzip('*')).toBe(true);
        expect(acceptsGzip('*, gzip;q=0')).toBe(false);
        expect(acceptsGzip('identity')).toBe(false);
        expect(acceptsGzip(null)).toBe(false);
    });

    it('#6 a gzip ETag only matches gzip requests', async () => {
        const snapshot = new DealsSnapshot();
        snapshot.update([deal]);
        const gzipTag = (await snapshot.respond(get({ 'Accept-Encoding': 'gzip' }))).headers.get('ETag')!;

        expect((await snapshot.respond(get({ 'Accept-Encoding': 'gzip', 'If-None-Match': gzipTag }))).status).toBe(304);
        expect((await snapshot.respond(get({ 'If-None-Match': gzipTag }))).status).toBe(200);
    });

    it('#8 still treats an exact count with missing products as incomplete', async () => {
        const hits = Array.from({ length: 1000 }, (_, i) => ({ name: 'Nike Air', slug: `s${i}`, objectID: String(i), discountPct: '50%', inStock: true }));
        const impl = (async (input: string | URL | Request, init?: RequestInit) => {
            if (!String(input).includes('algolia.net')) return new Response(pageFor());
            const page = JSON.parse(String(init?.body)).page;
            return Response.json({ hits: page === 0 ? hits : [], nbHits: 1150, nbPages: 2, exhaustive: { nbHits: true } });
        }) as typeof fetch;

        expect((await createJDRetailer({ fetch: impl }).fetchListings()).complete).toBe(false);
    });

    it('#4 fails the run when every listing fails', async () => {
        const impl = (async (_input: string | URL | Request) => new Response('down', { status: 500 })) as typeof fetch;
        const jd = createJDRetailer({ fetch: impl, listingUrls: ['https://jd/men/a/', 'https://jd/men/b/'] });
        await expect(jd.fetchListings()).rejects.toThrow('status 500');
    });
});

function pageFor() {
    const pageProps = {
        algoliaConfig: { applicationId: 'APP', searchApiKey: 'KEY', indices: [{ name: 'idx', type: 'main' }] },
        searchServerState: { initialResults: { a: { requestParams: [{ facetFilters: [['onSale:true']] }] } } },
    };
    return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script>`;
}
