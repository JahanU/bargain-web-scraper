import type { Deal } from '@/deals';
import { bytes, createLogger, duration, type Level } from '@/log';

const log = createLogger('http');

// Browsers and CDNs may reuse a response for a minute, then revalidate in the background.
const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

/** How long clients should wait before asking again while the first scrape is still running. */
export const RETRY_AFTER_SECONDS = 10;

// The frontend is on another origin (Netlify). Browsers hide non-standard response headers from
// cross-origin JavaScript unless they are exposed, so Retry-After and ETag are listed explicitly.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Retry-After, ETag' };

interface Built {
    body: string;
    gzipped: Uint8Array<ArrayBuffer>;
    /** Without quotes, so the gzip variant can get its own tag. */
    hash: string;
    count: number;
}

/**
 * The deals response, serialised and compressed once per accepted scrape instead of once per
 * request. Until the first one, every request gets an immediate 503 + Retry-After.
 */
export class DealsResponse {
    private built: Built | undefined;

    update(deals: Deal[]): void {
        const body = JSON.stringify(deals);
        const gzipped = Bun.gzipSync(body);
        this.built = { body, gzipped, hash: Bun.hash(body).toString(36), count: deals.length };
        log.info(`✓ serving ${deals.length} deals`, {
            json: bytes(Buffer.byteLength(body)),
            gzip: bytes(gzipped.length),
        });
    }

    get ready(): boolean {
        return this.built !== undefined;
    }

    get count(): number {
        return this.built?.count ?? 0;
    }

    respond(request: Request): Response {
        if (!this.built) {
            return Response.json(
                { error: 'Deals are loading, try again shortly' },
                { status: 503, headers: { 'Retry-After': String(RETRY_AFTER_SECONDS), ...CORS } },
            );
        }

        const gzip = acceptsGzip(request.headers.get('Accept-Encoding'));
        // Each encoding is a different representation, so it gets its own ETag.
        const etag = gzip ? `"${this.built.hash}-gz"` : `"${this.built.hash}"`;
        const headers = new Headers({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': CACHE_CONTROL,
            ETag: etag,
            Vary: 'Accept-Encoding',
            ...CORS,
        });

        if (matchesEtag(request.headers.get('If-None-Match'), etag)) {
            return new Response(null, { status: 304, headers });
        }
        if (gzip) {
            headers.set('Content-Encoding', 'gzip');
            return new Response(this.built.gzipped, { headers });
        }
        return new Response(this.built.body, { headers });
    }
}

/** Route table for Bun.serve. Both deals paths serve the same response. */
export function routes(deals: DealsResponse, health: () => object) {
    // Health checks are frequent keep-awake pings, so they only show at LOG_LEVEL=debug.
    const healthResponse = logged(() => Response.json(health(), { headers: CORS }), 'debug');
    const dealsRoute = { GET: logged((request) => deals.respond(request)) };

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

const STATUS_NOTES: Record<number, string> = { 304: ' not modified', 404: ' not found', 503: ' still loading' };

/** Wraps a handler to log each request: method, path, status, encoding and time taken. */
function logged(handler: (request: Request) => Response, level: Level = 'info') {
    return (request: Request) => {
        const started = performance.now();
        const response = handler(request);
        const note = STATUS_NOTES[response.status] ?? '';
        log[level](`${request.method} ${new URL(request.url).pathname} → ${response.status}${note}`, {
            gzip: response.headers.get('Content-Encoding') === 'gzip' || undefined,
            took: duration(performance.now() - started),
        });
        return response;
    };
}

/** Whether Accept-Encoding allows gzip (directly or via `*`), honouring `q=0` as a refusal. */
export function acceptsGzip(header: string | null): boolean {
    for (const part of (header ?? '').toLowerCase().split(',')) {
        const [name, ...params] = part.split(';').map((piece) => piece.trim());
        if (name === 'gzip' || name === '*') {
            const q = params.find((param) => param.startsWith('q='));
            return q === undefined || Number(q.slice(2)) > 0;
        }
    }
    return false;
}

/** If-None-Match uses weak comparison: it may be a list, `*`, or W/-prefixed tags. */
export function matchesEtag(header: string | null, etag: string): boolean {
    return (header ?? '').split(',').some((tag) => {
        const trimmed = tag.trim();
        return trimmed === '*' || trimmed.replace(/^W\//, '') === etag;
    });
}
