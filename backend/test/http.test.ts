import { describe, expect, it } from 'bun:test';
import type { Deal } from '@/deals';
import { acceptsGzip, DealsResponse, matchesEtag, RETRY_AFTER_SECONDS } from '@/http';

const deal: Deal = {
    name: 'Nike Air Max 90',
    wasPrice: 135,
    nowPrice: 54.99,
    discount: 60,
    url: 'https://www.jdsports.co.uk/product/x/1/',
    timestamp: 1,
    gender: 'Male',
};

const get = (headers: Record<string, string> = {}) => new Request('http://local/v1/deals', { headers });

const ready = (deals: Deal[] = [deal]) => {
    const response = new DealsResponse();
    response.update(deals);
    return response;
};

describe('DealsResponse', () => {
    it('answers 503 with Retry-After until the first update', () => {
        const response = new DealsResponse().respond(get());
        expect(response.status).toBe(503);
        expect(response.headers.get('Retry-After')).toBe(String(RETRY_AFTER_SECONDS));
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('serves the deals with caching and CORS headers', async () => {
        const response = ready().respond(get());
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([deal]);
        expect(response.headers.get('Cache-Control')).toContain('max-age=60');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Vary')).toBe('Accept-Encoding');
    });

    it('treats an empty list as ready', async () => {
        const response = ready([]).respond(get());
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });

    it('sends pre-compressed gzip when accepted, with its own ETag', async () => {
        const deals = ready();
        const plain = deals.respond(get());
        const gzipped = deals.respond(get({ 'Accept-Encoding': 'br, gzip' }));

        expect(gzipped.headers.get('Content-Encoding')).toBe('gzip');
        expect(gzipped.headers.get('ETag')).not.toBe(plain.headers.get('ETag'));
        const bytes = new Uint8Array(await gzipped.arrayBuffer());
        expect(JSON.parse(new TextDecoder().decode(Bun.gunzipSync(bytes)))).toEqual([deal]);
    });

    it('answers 304 when the ETag matches, including weak and list forms', () => {
        const deals = ready();
        const etag = deals.respond(get()).headers.get('ETag') as string;

        for (const header of [etag, `W/${etag}`, `"other", ${etag}`, '*']) {
            const response = deals.respond(get({ 'If-None-Match': header }));
            expect(response.status).toBe(304);
            expect(response.body).toBeNull();
        }
        expect(deals.respond(get({ 'If-None-Match': '"other"' })).status).toBe(200);
    });

    it('changes the ETag when the deals change', () => {
        const deals = ready();
        const before = deals.respond(get()).headers.get('ETag');
        deals.update([{ ...deal, nowPrice: 40 }]);
        expect(deals.respond(get()).headers.get('ETag')).not.toBe(before);
    });
});

describe('acceptsGzip', () => {
    it('honours q-values and the wildcard', () => {
        expect(acceptsGzip('gzip')).toBe(true);
        expect(acceptsGzip('br, GZIP;q=0.5')).toBe(true);
        expect(acceptsGzip('*')).toBe(true);
        expect(acceptsGzip('gzip;q=0')).toBe(false);
        expect(acceptsGzip('gzip; q=0.0, identity')).toBe(false);
        expect(acceptsGzip('identity')).toBe(false);
        expect(acceptsGzip(null)).toBe(false);
    });
});

describe('matchesEtag', () => {
    it('handles missing headers', () => {
        expect(matchesEtag(null, '"a"')).toBe(false);
        expect(matchesEtag('', '"a"')).toBe(false);
    });
});
