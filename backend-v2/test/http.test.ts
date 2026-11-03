import { describe, expect, it } from 'bun:test';
import { loadConfig } from '../src/config';
import type { Deal } from '../src/db/products';
import { hasBearer } from '../src/http/auth';
import { DealsSnapshot } from '../src/http/dealsSnapshot';

const deal: Deal = {
    name: 'Nike Air Max 90', wasPrice: 135, nowPrice: 54.99, discount: 60,
    url: 'https://www.jdsports.co.uk/product/x/1/', inStock: 'IN STOCK', timestamp: 1, gender: 'Male',
};

const get = (headers: Record<string, string> = {}) => new Request('http://local/v1/deals', { headers });

describe('DealsSnapshot', () => {
    it('loads lazily, then serves from memory', async () => {
        let loads = 0;
        const snapshot = new DealsSnapshot(async () => (loads++, [deal]));

        const response = await snapshot.respond(get());
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([deal]);

        await snapshot.respond(get());
        expect(loads).toBe(1);
    });

    it('shares one load between concurrent first requests', async () => {
        let loads = 0;
        const snapshot = new DealsSnapshot(async () => (loads++, await Bun.sleep(5), [deal]));
        await Promise.all([snapshot.respond(get()), snapshot.respond(get()), snapshot.respond(get())]);
        expect(loads).toBe(1);
    });

    it('answers 304 when the ETag matches', async () => {
        const snapshot = new DealsSnapshot(async () => [deal]);
        const etag = (await snapshot.respond(get())).headers.get('ETag')!;

        const response = await snapshot.respond(get({ 'If-None-Match': etag }));
        expect(response.status).toBe(304);
        expect(response.body).toBeNull();
    });

    it('changes the ETag when the deals change', async () => {
        let deals = [deal];
        const snapshot = new DealsSnapshot(async () => deals);
        const before = (await snapshot.respond(get())).headers.get('ETag');

        deals = [{ ...deal, nowPrice: 40 }];
        await snapshot.refresh();
        expect((await snapshot.respond(get())).headers.get('ETag')).not.toBe(before);
    });

    it('sends pre-compressed gzip when the client accepts it', async () => {
        const snapshot = new DealsSnapshot(async () => [deal]);
        const response = await snapshot.respond(get({ 'Accept-Encoding': 'br, gzip' }));

        expect(response.headers.get('Content-Encoding')).toBe('gzip');
        const bytes = new Uint8Array(await response.arrayBuffer());
        expect(JSON.parse(new TextDecoder().decode(Bun.gunzipSync(bytes)))).toEqual([deal]);
    });

    it('sets caching and CORS headers', async () => {
        const response = await new DealsSnapshot(async () => [deal]).respond(get());
        expect(response.headers.get('Cache-Control')).toContain('max-age=60');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('reloads in the background once stale, serving the old copy meanwhile', async () => {
        let clock = 0;
        let loads = 0;
        const snapshot = new DealsSnapshot(async () => [{ ...deal, discount: 50 + loads++ }], 1000, () => clock);

        const firstDiscount = async () => ((await (await snapshot.respond(get())).json()) as Deal[])[0]?.discount;

        expect(await firstDiscount()).toBe(50);
        clock = 2000;
        expect(await firstDiscount()).toBe(50);
        await Bun.sleep(0);
        expect(await firstDiscount()).toBe(51);
    });

    it('answers 503 when the first load fails, and recovers on the next request', async () => {
        let fail = true;
        const snapshot = new DealsSnapshot(async () => {
            if (fail) throw new Error('db down');
            return [deal];
        });

        expect((await snapshot.respond(get())).status).toBe(503);
        fail = false;
        expect((await snapshot.respond(get())).status).toBe(200);
    });
});

describe('hasBearer', () => {
    const secret = 'a'.repeat(40);
    const withAuth = (value?: string) =>
        new Request('http://local/jobs/scrape', { method: 'POST', headers: value ? { Authorization: value } : {} });

    it('accepts the right secret only', () => {
        expect(hasBearer(withAuth(`Bearer ${secret}`), secret)).toBe(true);
        expect(hasBearer(withAuth('Bearer wrong'), secret)).toBe(false);
        expect(hasBearer(withAuth(secret), secret)).toBe(false);
        expect(hasBearer(withAuth('Bearer '), secret)).toBe(false);
        expect(hasBearer(withAuth(), secret)).toBe(false);
    });
});

describe('loadConfig', () => {
    const valid = { DATABASE_URL: 'postgres://x', CRON_SECRET: 'b'.repeat(32) };

    it('applies defaults', () => {
        expect(loadConfig(valid)).toEqual({ port: 8000, databaseUrl: 'postgres://x', cronSecret: 'b'.repeat(32), minDiscount: 30 });
    });

    it('fails fast on missing or weak settings', () => {
        expect(() => loadConfig({ CRON_SECRET: valid.CRON_SECRET })).toThrow('DATABASE_URL');
        expect(() => loadConfig({ DATABASE_URL: 'postgres://x', CRON_SECRET: 'short' })).toThrow('at least 32');
    });
});
