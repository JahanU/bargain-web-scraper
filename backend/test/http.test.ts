import { describe, expect, it, spyOn } from 'bun:test';
import { loadConfig } from '../src/config';
import type { Deal } from '../src/store/catalogue';
import { hasBearer } from '../src/http/auth';
import { acceptsGzip, BOOT_WAIT_MS, DealsSnapshot, SERVER_IDLE_TIMEOUT_SECONDS } from '../src/http/dealsSnapshot';

const deal: Deal = {
    name: 'Nike Air Max 90', wasPrice: 135, nowPrice: 54.99, discount: 60,
    url: 'https://www.jdsports.co.uk/product/x/1/', inStock: 'IN STOCK', timestamp: 1, gender: 'Male',
};

const get = (headers: Record<string, string> = {}) => new Request('http://local/v1/deals', { headers });

describe('DealsSnapshot', () => {
    const ready = (deals: Deal[] = [deal]) => {
        const snapshot = new DealsSnapshot();
        snapshot.update(deals);
        return snapshot;
    };

    it('serves the deals it was given', async () => {
        const response = await ready().respond(get());
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([deal]);
    });

    it('holds requests until the first update', async () => {
        const snapshot = new DealsSnapshot();
        const pending = snapshot.respond(get());
        snapshot.update([deal]);
        expect(await (await pending).json()).toEqual([deal]);
    });

    it('answers 304 when the ETag matches', async () => {
        const snapshot = ready();
        const etag = (await snapshot.respond(get())).headers.get('ETag')!;

        const response = await snapshot.respond(get({ 'If-None-Match': etag }));
        expect(response.status).toBe(304);
        expect(response.body).toBeNull();
    });

    it('changes the ETag when the deals change', async () => {
        const snapshot = ready();
        const before = (await snapshot.respond(get())).headers.get('ETag');
        snapshot.update([{ ...deal, nowPrice: 40 }]);
        expect((await snapshot.respond(get())).headers.get('ETag')).not.toBe(before);
    });

    it('sends pre-compressed gzip when the client accepts it', async () => {
        const response = await ready().respond(get({ 'Accept-Encoding': 'br, gzip' }));

        expect(response.headers.get('Content-Encoding')).toBe('gzip');
        const bytes = new Uint8Array(await response.arrayBuffer());
        expect(JSON.parse(new TextDecoder().decode(Bun.gunzipSync(bytes)))).toEqual([deal]);
    });

    it('answers 503 if the first update takes longer than the boot wait', async () => {
        const response = await new DealsSnapshot(50).respond(get());
        expect(response.status).toBe(503);
        expect(response.headers.get('Retry-After')).toBe('10');
    }, 1000);

    it('shares one boot deadline between all waiting requests', async () => {
        const sleep = spyOn(Bun, 'sleep');
        try {
            const snapshot = new DealsSnapshot(50);
            await Promise.all([snapshot.respond(get()), snapshot.respond(get()), snapshot.respond(get())]);
            expect(sleep).toHaveBeenCalledTimes(1);
        } finally {
            sleep.mockRestore();
        }
    }, 1000);

    it('ends the boot wait before the server would drop the connection', () => {
        expect(BOOT_WAIT_MS).toBeLessThan(SERVER_IDLE_TIMEOUT_SECONDS * 1000);
        expect(SERVER_IDLE_TIMEOUT_SECONDS).toBeLessThanOrEqual(255); // Bun's maximum
    });

    it('does not send gzip to a client that refuses it', async () => {
        const response = await ready().respond(get({ 'Accept-Encoding': 'gzip;q=0, identity' }));
        expect(response.headers.get('Content-Encoding')).toBeNull();
    });

    it('matches weak and list-form validators', async () => {
        const snapshot = ready();
        const etag = (await snapshot.respond(get())).headers.get('ETag')!;
        expect((await snapshot.respond(get({ 'If-None-Match': `W/${etag}` }))).status).toBe(304);
        expect((await snapshot.respond(get({ 'If-None-Match': `"other", ${etag}` }))).status).toBe(304);
    });

    it('gives gzip its own ETag, matching only gzip requests', async () => {
        const snapshot = ready();
        const plainTag = (await snapshot.respond(get())).headers.get('ETag')!;
        const gzipTag = (await snapshot.respond(get({ 'Accept-Encoding': 'gzip' }))).headers.get('ETag')!;

        expect(gzipTag).not.toBe(plainTag);
        expect((await snapshot.respond(get({ 'Accept-Encoding': 'gzip', 'If-None-Match': gzipTag }))).status).toBe(304);
        expect((await snapshot.respond(get({ 'If-None-Match': gzipTag }))).status).toBe(200);
    });

    it('sets caching and CORS headers', async () => {
        const response = await ready().respond(get());
        expect(response.headers.get('Cache-Control')).toContain('max-age=60');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
});

describe('acceptsGzip', () => {
    it('honours q-values and wildcards', () => {
        expect(acceptsGzip('gzip')).toBe(true);
        expect(acceptsGzip('br, gzip;q=0.5')).toBe(true);
        expect(acceptsGzip('gzip;q=0')).toBe(false);
        expect(acceptsGzip('*')).toBe(true);
        expect(acceptsGzip('*, gzip;q=0')).toBe(false);
        expect(acceptsGzip('identity')).toBe(false);
        expect(acceptsGzip(null)).toBe(false);
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
    it('applies defaults, with the manual scrape endpoint off', () => {
        expect(loadConfig({})).toEqual({
            port: 8000, dataFile: './data/deals.json', minDiscount: 30, scrapeIntervalMs: 300_000, cronSecret: undefined,
        });
    });

    it('reads overrides', () => {
        expect(loadConfig({ PORT: '9000', DATA_FILE: '/var/data/d.json', MIN_DISCOUNT: '50', SCRAPE_INTERVAL_MINUTES: '10', CRON_SECRET: 'b'.repeat(32) }))
            .toEqual({ port: 9000, dataFile: '/var/data/d.json', minDiscount: 50, scrapeIntervalMs: 600_000, cronSecret: 'b'.repeat(32) });
    });

    it('fails fast on a weak secret', () => {
        expect(() => loadConfig({ CRON_SECRET: 'short' })).toThrow('at least 32');
    });

    it('keeps 0 as 0 instead of falling back to the default', () => {
        expect(loadConfig({ MIN_DISCOUNT: '0' }).minDiscount).toBe(0);
    });

    it('rejects typos and out-of-range numbers', () => {
        expect(() => loadConfig({ MIN_DISCOUNT: '3O' })).toThrow('MIN_DISCOUNT');
        expect(() => loadConfig({ MIN_DISCOUNT: '120' })).toThrow('MIN_DISCOUNT');
        expect(() => loadConfig({ SCRAPE_INTERVAL_MINUTES: '0' })).toThrow('SCRAPE_INTERVAL_MINUTES');
        expect(() => loadConfig({ PORT: 'abc' })).toThrow('PORT');
    });

    it('rejects scrape intervals that would overflow setInterval', () => {
        expect(() => loadConfig({ SCRAPE_INTERVAL_MINUTES: '50000' })).toThrow('SCRAPE_INTERVAL_MINUTES');
    });

    it('rejects non-integer numbers', () => {
        expect(() => loadConfig({ PORT: '8000.5' })).toThrow('PORT');
        expect(() => loadConfig({ PORT: '0x1F40' })).toThrow('PORT');
        expect(() => loadConfig({ MIN_DISCOUNT: '1e1' })).toThrow('MIN_DISCOUNT');
    });

    it('treats blank values as unset', () => {
        expect(loadConfig({ MIN_DISCOUNT: '  ' }).minDiscount).toBe(30);
    });
});
