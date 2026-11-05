import { describe, expect, it } from 'bun:test';
import type { Deal } from '@/deals';
import { dealsResponse, RETRY_AFTER_SECONDS } from '@/http';

const deal: Deal = {
    name: 'Nike Air Max 90',
    wasPrice: 135,
    nowPrice: 54.99,
    discount: 60,
    url: 'https://www.jdsports.co.uk/product/x/1/',
    timestamp: 1,
    gender: 'Male',
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

    it('serves the deals as JSON with caching and CORS headers', async () => {
        const response = dealsResponse([deal]);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([deal]);
        expect(response.headers.get('Content-Type')).toContain('application/json');
        expect(response.headers.get('Cache-Control')).toContain('max-age=60');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('treats an empty list as ready', async () => {
        const response = dealsResponse([]);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });
});
