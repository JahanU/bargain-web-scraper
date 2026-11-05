import { describe, expect, it } from 'bun:test';
import { loadConfig } from '@/config';

describe('loadConfig', () => {
    it('applies defaults', () => {
        expect(loadConfig({})).toEqual({ port: 8000, minDiscount: 30, scrapeIntervalMs: 300_000 });
    });

    it('reads overrides, keeping 0 as 0', () => {
        expect(loadConfig({ PORT: '9000', MIN_DISCOUNT: '0', SCRAPE_INTERVAL_MINUTES: '10' })).toEqual({
            port: 9000,
            minDiscount: 0,
            scrapeIntervalMs: 600_000,
        });
    });

    it('treats blank values as unset', () => {
        expect(loadConfig({ MIN_DISCOUNT: '  ' }).minDiscount).toBe(30);
    });

    it('fails fast on typos, decimals, hex and out-of-range values', () => {
        for (const [name, value] of [
            ['MIN_DISCOUNT', '3O'],
            ['MIN_DISCOUNT', '120'],
            ['MIN_DISCOUNT', '1e1'],
            ['PORT', '8000.5'],
            ['PORT', '0x1F40'],
            ['SCRAPE_INTERVAL_MINUTES', '0'],
            ['SCRAPE_INTERVAL_MINUTES', '50000'], // would overflow setTimeout
        ] as const) {
            expect(() => loadConfig({ [name]: value })).toThrow(name);
        }
    });
});
