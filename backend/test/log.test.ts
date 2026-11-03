import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { log } from '@/log';

describe('log', () => {
    const silent = Bun.env.LOG_LEVEL;
    afterEach(() => {
        Bun.env.LOG_LEVEL = silent;
    });

    it('writes one JSON line per message, with errors serialised', () => {
        Bun.env.LOG_LEVEL = '';
        const out = spyOn(console, 'log').mockImplementation(() => {});
        const err = spyOn(console, 'error').mockImplementation(() => {});
        try {
            log.info('scrape finished', { retailer: 'jd', products: 3 });
            log.error('scrape failed', { error: new Error('boom') });

            expect(JSON.parse(out.mock.calls[0]?.[0] as string)).toMatchObject({
                level: 'info',
                msg: 'scrape finished',
                retailer: 'jd',
                products: 3,
            });
            expect(JSON.parse(err.mock.calls[0]?.[0] as string)).toMatchObject({
                level: 'error',
                error: { message: 'boom', stack: expect.any(String) },
            });
        } finally {
            out.mockRestore();
            err.mockRestore();
        }
    });

    it('writes nothing when LOG_LEVEL=silent', () => {
        const out = spyOn(console, 'log').mockImplementation(() => {});
        try {
            log.warn('quiet');
            expect(out).not.toHaveBeenCalled();
        } finally {
            out.mockRestore();
        }
    });
});
