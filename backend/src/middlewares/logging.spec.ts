import { describe, expect, it, mock } from 'bun:test';
import { loggingMiddleware } from './logging';

mock.restore();

describe('loggingMiddleware', () => {
    it('logs and invokes next middleware', async () => {
        const next = mock(async () => {});
        const originalLog = console.log;
        const logMock = mock(() => {});
        console.log = logMock as unknown as typeof console.log;

        try {
            await loggingMiddleware({} as any, next as any);
        } finally {
            console.log = originalLog;
        }

        expect(logMock.mock.calls.length).toBe(1);
        expect(String(logMock.mock.calls[0]?.[0])).toContain('Request was made at:');
        expect(next.mock.calls.length).toBe(1);
    });
});
