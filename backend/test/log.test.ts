import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { bytes, createLogger, duration, format } from '@/log';

const at = new Date(2026, 10, 4, 9, 41, 3, 10);

/** Runs `fn` with environment variables temporarily set (undefined = removed). */
function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
    const saved = Object.fromEntries(Object.keys(vars).map((key) => [key, Bun.env[key]]));
    Object.assign(Bun.env, vars);
    for (const [key, value] of Object.entries(vars)) {
        if (value === undefined) delete Bun.env[key];
    }
    try {
        fn();
    } finally {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete Bun.env[key];
            else Bun.env[key] = value;
        }
    }
}

describe('format', () => {
    afterEach(() => {
        delete Bun.env.FORCE_COLOR;
    });

    it('lines up time, level, scope, message and key=value fields', () => {
        withEnv({ FORCE_COLOR: '0' }, () => {
            expect(format('info', 'scraper', '✓ jd scraped', { status: 'ok', products: 312, took: '888ms' }, at)).toBe(
                '09:41:03.010 INFO  scraper  ✓ jd scraped  status=ok products=312 took=888ms',
            );
        });
    });

    it('quotes values with spaces, shows objects as JSON, and skips undefined fields', () => {
        withEnv({ FORCE_COLOR: '0' }, () => {
            expect(format('warn', 'jd', 'note', { url: 'a b', list: [1, 2], none: undefined, empty: '' }, at)).toBe(
                '09:41:03.010 WARN  jd       note  url="a b" list=[1,2] empty=""',
            );
        });
    });

    it('shows an error message inline and its stack trace indented below', () => {
        withEnv({ FORCE_COLOR: '0' }, () => {
            const lines = format('error', 'scraper', '✗ failed', { error: new Error('boom') }, at).split('\n');
            expect(lines[0]).toBe('09:41:03.010 ERROR scraper  ✗ failed  error="boom"');
            expect(lines[1]).toMatch(/^\s+at /);
        });
    });

    it('adds colour when forced, and none when disabled', () => {
        withEnv({ FORCE_COLOR: '1' }, () => {
            expect(format('info', 'http', 'hi', {}, at)).toContain('\x1b[1;36mINFO');
        });
        withEnv({ FORCE_COLOR: undefined, NO_COLOR: '1' }, () => {
            expect(format('info', 'http', 'hi', {}, at)).not.toContain('\x1b[');
        });
    });
});

describe('createLogger', () => {
    function capture(level: string | undefined, fn: (log: ReturnType<typeof createLogger>) => void) {
        const out = spyOn(console, 'log').mockImplementation(() => {});
        const err = spyOn(console, 'error').mockImplementation(() => {});
        try {
            withEnv({ LOG_LEVEL: level, FORCE_COLOR: '0' }, () => fn(createLogger('test')));
            return {
                out: out.mock.calls.map((call) => String(call[0])),
                err: err.mock.calls.map((call) => String(call[0])),
            };
        } finally {
            out.mockRestore();
            err.mockRestore();
        }
    }

    it('shows info and above by default, sending warnings and errors to stderr', () => {
        const { out, err } = capture(undefined, (log) => {
            log.debug('hidden');
            log.info('shown');
            log.warn('careful');
            log.error('broken');
        });
        expect(out).toEqual([expect.stringContaining('INFO  test     shown')]);
        expect(err).toEqual([expect.stringContaining('careful'), expect.stringContaining('broken')]);
    });

    it('shows debug lines at LOG_LEVEL=debug, and nothing at silent', () => {
        expect(capture('debug', (log) => log.debug('detail')).out).toHaveLength(1);
        expect(capture('silent', (log) => log.error('quiet')).err).toHaveLength(0);
    });
});

describe('helpers', () => {
    it('formats durations', () => {
        expect(duration(0.34)).toBe('0.3ms');
        expect(duration(888)).toBe('888ms');
        expect(duration(15_000)).toBe('15s');
        expect(duration(1_250)).toBe('1.3s');
        expect(duration(300_000)).toBe('5m');
    });

    it('formats sizes', () => {
        expect(bytes(512)).toBe('512B');
        expect(bytes(98_426)).toBe('96.1KB');
    });
});
