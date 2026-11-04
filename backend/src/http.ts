import type { Deal } from '@/deals';
import { createLogger, duration, type Level } from '@/log';

const log = createLogger('http');

// Browsers may reuse the list for a minute, then refresh it in the background.
// No compression here: Render compresses every response (Brotli) on its way out.
const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

/** How long clients should wait before asking again while the first scrape is still running. */
export const RETRY_AFTER_SECONDS = 10;

// The frontend is on another origin (Netlify). Browsers hide Retry-After from cross-origin
// JavaScript unless it is exposed.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Retry-After' };

/** The deals, or a 503 asking the client to retry while the first scrape is still running. */
export function dealsResponse(deals: Deal[] | undefined): Response {
    if (!deals) {
        return Response.json(
            { error: 'Deals are loading, try again shortly' },
            { status: 503, headers: { 'Retry-After': String(RETRY_AFTER_SECONDS), ...CORS } },
        );
    }
    return Response.json(deals, { headers: { 'Cache-Control': CACHE_CONTROL, ...CORS } });
}

/** Route table for Bun.serve. `deals()` is undefined until the first good scrape. */
export function routes(deals: () => Deal[] | undefined, health: () => object) {
    // Health checks are frequent keep-awake pings, so they only show at LOG_LEVEL=debug.
    const healthResponse = logged(() => Response.json(health(), { headers: CORS }), 'debug');
    const dealsRoute = { GET: logged(() => dealsResponse(deals())) };

    return {
        // `/` as well, so a keep-awake ping or platform health check aimed at the root gets a 200.
        '/': healthResponse,
        '/health': healthResponse,
        '/v1/deals': dealsRoute,
        // The path the current frontend calls.
        '/webscrape/getBestDeals': dealsRoute,
    };
}

/** Anything that isn't a known route. */
export const notFound = logged(() => Response.json({ error: 'Not Found' }, { status: 404 }));

const STATUS_NOTES: Record<number, string> = { 404: ' not found', 503: ' still loading' };

/** Wraps a handler to log each request: method, path, status and time taken. */
function logged(handler: (request: Request) => Response, level: Level = 'info') {
    return (request: Request) => {
        const started = performance.now();
        const response = handler(request);
        const note = STATUS_NOTES[response.status] ?? '';
        log[level](`${request.method} ${new URL(request.url).pathname} → ${response.status}${note}`, {
            took: duration(performance.now() - started),
        });
        return response;
    };
}
