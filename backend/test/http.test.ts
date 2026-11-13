import { describe, expect, it } from 'bun:test';
import type { Deal } from '@/deals';
import { dealsResponse, RETRY_AFTER_SECONDS, routes } from '@/http';

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

describe('GET /v1/deals?gender=', () => {
    const male = deal;
    const female: Deal = { ...deal, name: 'Nike Dunk Low', url: 'https://example.com/2', gender: 'Female' };
    const unisex: Deal = { ...deal, name: 'Crocs Classic', url: 'https://example.com/3', gender: 'Unisex' };
    const health = () => ({});
    const getFrom = (deals: Deal[] | undefined, query: string) =>
        routes(() => deals, health)['/v1/deals'].GET(new Request(`http://localhost/v1/deals${query}`));
    const get = (query: string) => getFrom([male, female, unisex], query);

    it.each([
        ['Male', male],
        ['Female', female],
        ['Unisex', unisex],
    ])('serves only %s deals', async (gender, expected) => {
        const response = get(`?gender=${gender}`);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([expected]);
    });

    it('serves every deal without the param', async () => {
        expect(await get('').json()).toEqual([male, female, unisex]);
    });

    it.each(['?gender=Kids', '?gender='])('rejects %s with a 400', async (query) => {
        const response = get(query);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'gender must be one of Male, Female, Unisex' });
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('rejects an unknown gender before the first scrape', () => {
        expect(getFrom(undefined, '?gender=Kids').status).toBe(400);
        expect(getFrom(undefined, '?gender=Male').status).toBe(503);
    });
});
