import { describe, expect, it } from 'bun:test';
import { dealsResponse, RETRY_AFTER_SECONDS, routes } from '@/http';
import type { DealPage } from '@/query';

const page: DealPage = {
    items: [
        {
            name: 'Nike Air Max 90',
            wasPrice: 135,
            nowPrice: 54.99,
            discount: 60,
            url: 'https://www.jdsports.co.uk/product/x/1/',
            timestamp: 1,
            gender: 'Male',
            brand: 'Nike',
            category: 'Shoes',
            store: 'jd',
        },
    ],
    total: 1,
    nextCursor: null,
    trackingSince: 1,
};

describe('dealsResponse', () => {
    it('answers 503 with a readable Retry-After until the first scrape', () => {
        const response = dealsResponse(undefined);
        expect(response.status).toBe(503);
        expect(response.headers.get('Retry-After')).toBe(String(RETRY_AFTER_SECONDS));
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        // Cross-origin JavaScript can only read Retry-After if it is exposed.
        expect(response.headers.get('Access-Control-Expose-Headers')).toContain('Retry-After');
    });

    it('serves the page as JSON with caching and CORS headers', async () => {
        const response = dealsResponse(page);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(page);
        expect(response.headers.get('Content-Type')).toContain('application/json');
        expect(response.headers.get('Cache-Control')).toContain('max-age=60');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('treats an empty page as ready', async () => {
        const empty = { ...page, items: [], total: 0, trackingSince: 0 };
        const response = dealsResponse(empty);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(empty);
    });
});

describe('routes', () => {
    it('serves only the health checks and /v2/deals', () => {
        const table = routes(
            [],
            () => undefined,
            () => ({}),
        );
        expect(Object.keys(table)).toEqual(['/', '/health', '/v2/deals']);
    });
});
