import type { Deal } from '../store/catalogue';

interface Snapshot {
    body: string;
    gzipped: Uint8Array<ArrayBuffer>;
    etag: string;
    count: number;
}

// Browsers and CDNs may reuse a response for a minute, then revalidate in the background.
const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

/**
 * The deals list, serialised and compressed once per scrape instead of once per request.
 * Requests that arrive before the first update (straight after boot) wait for it.
 */
export class DealsSnapshot {
    private current: Snapshot | undefined;
    private markReady!: () => void;
    private readonly ready = new Promise<void>((resolve) => {
        this.markReady = resolve;
    });

    update(deals: Deal[]): void {
        const body = JSON.stringify(deals);
        this.current = {
            body,
            gzipped: Bun.gzipSync(body),
            etag: `"${Bun.hash(body).toString(36)}"`,
            count: deals.length,
        };
        this.markReady();
    }

    get count(): number {
        return this.current?.count ?? 0;
    }

    async respond(request: Request): Promise<Response> {
        if (!this.current) {
            await this.ready;
        }
        const snapshot = this.current!;

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
