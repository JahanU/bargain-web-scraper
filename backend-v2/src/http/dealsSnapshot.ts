import type { Deal } from '../db/products';

interface Snapshot {
    body: string;
    gzipped: Uint8Array<ArrayBuffer>;
    etag: string;
    builtAt: number;
}

// Browsers and CDNs may reuse a response for a minute, then revalidate in the background.
const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

/**
 * The deals list, serialised and compressed once per refresh instead of once per request.
 * Loads lazily on first request (so a restart serves from the database straight away) and
 * reloads in the background once older than `maxAgeMs`, so every instance stays current
 * even if a different one ran the scrape.
 */
export class DealsSnapshot {
    private current: Snapshot | undefined;
    private inFlight: Promise<Snapshot> | undefined;

    constructor(
        private readonly load: () => Promise<Deal[]>,
        private readonly maxAgeMs = 60_000,
        private readonly now: () => number = Date.now,
    ) {}

    /** Rebuilds from the database. Concurrent callers share one load. */
    refresh(): Promise<Snapshot> {
        this.inFlight ??= this.load()
            .then((deals) => {
                const body = JSON.stringify(deals);
                this.current = {
                    body,
                    gzipped: Bun.gzipSync(body),
                    etag: `"${Bun.hash(body).toString(36)}"`,
                    builtAt: this.now(),
                };
                return this.current;
            })
            .finally(() => {
                this.inFlight = undefined;
            });

        return this.inFlight;
    }

    async respond(request: Request): Promise<Response> {
        let snapshot = this.current;

        if (!snapshot) {
            try {
                snapshot = await this.refresh();
            } catch {
                return Response.json({ error: 'Deals are temporarily unavailable' }, { status: 503, headers: { 'Retry-After': '30' } });
            }
        } else if (this.now() - snapshot.builtAt > this.maxAgeMs) {
            // Serve what we have now; the next request gets the fresh copy.
            this.refresh().catch(() => {});
        }

        const headers = new Headers({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': CACHE_CONTROL,
            'ETag': snapshot.etag,
            'Vary': 'Accept-Encoding',
            'Access-Control-Allow-Origin': '*',
        });

        if (request.headers.get('If-None-Match') === snapshot.etag) {
            return new Response(null, { status: 304, headers });
        }

        if (/\bgzip\b/.test(request.headers.get('Accept-Encoding') ?? '')) {
            headers.set('Content-Encoding', 'gzip');
            return new Response(snapshot.gzipped, { headers });
        }

        return new Response(snapshot.body, { headers });
    }
}
