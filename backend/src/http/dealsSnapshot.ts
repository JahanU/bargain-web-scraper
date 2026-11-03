import type { Deal } from '../store/catalogue';

interface Snapshot {
    body: string;
    gzipped: Uint8Array<ArrayBuffer>;
    /** Strong ETags differ per representation, so a cache can never serve gzip to an identity client. */
    etag: string;
    gzipEtag: string;
    count: number;
}

// Browsers and CDNs may reuse a response for a minute, then revalidate in the background.
const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

/** How long a request made before the first scrape waits for it before getting a 503. */
export const BOOT_WAIT_MS = 30_000;

/**
 * Bun closes a connection that sends nothing for this long (its default is 10s). It must
 * outlast BOOT_WAIT_MS, or a waiting request would be dropped with no response at all.
 */
export const SERVER_IDLE_TIMEOUT_SECONDS = 60;

/**
 * The deals list, serialised and compressed once per scrape instead of once per request.
 * Requests that arrive before the first update (straight after boot) wait for it, up to a limit.
 */
export class DealsSnapshot {
    private current: Snapshot | undefined;
    private markReady!: () => void;
    private readonly ready = new Promise<void>((resolve) => {
        this.markReady = resolve;
    });
    /** One shared deadline for every request waiting on boot, rather than a timer per request. */
    private bootDeadline: Promise<void> | undefined;

    constructor(private readonly bootWaitMs = BOOT_WAIT_MS) {}

    update(deals: Deal[]): void {
        const body = JSON.stringify(deals);
        const hash = Bun.hash(body).toString(36);
        this.current = {
            body,
            gzipped: Bun.gzipSync(body),
            etag: `"${hash}"`,
            gzipEtag: `"${hash}-gz"`,
            count: deals.length,
        };
        this.markReady();
    }

    get count(): number {
        return this.current?.count ?? 0;
    }

    async respond(request: Request): Promise<Response> {
        if (!this.current) {
            this.bootDeadline ??= Promise.race([this.ready, Bun.sleep(this.bootWaitMs)]);
            await this.bootDeadline;
        }

        const snapshot = this.current;
        if (!snapshot) {
            return Response.json(
                { error: 'Deals are still loading, try again shortly' },
                { status: 503, headers: { 'Retry-After': '10', 'Access-Control-Allow-Origin': '*' } },
            );
        }

        const gzip = acceptsGzip(request.headers.get('Accept-Encoding'));
        const etag = gzip ? snapshot.gzipEtag : snapshot.etag;

        const headers = new Headers({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': CACHE_CONTROL,
            'ETag': etag,
            'Vary': 'Accept-Encoding',
            'Access-Control-Allow-Origin': '*',
        });

        if (matchesIfNoneMatch(request.headers.get('If-None-Match'), etag)) {
            return new Response(null, { status: 304, headers });
        }

        if (gzip) {
            headers.set('Content-Encoding', 'gzip');
            return new Response(snapshot.gzipped, { headers });
        }

        return new Response(snapshot.body, { headers });
    }
}

/**
 * Whether Accept-Encoding allows gzip, honouring q-values: "gzip;q=0" refuses it, and an
 * explicit gzip entry overrides a "*" wildcard.
 */
export function acceptsGzip(header: string | null): boolean {
    let wildcard: number | undefined;

    for (const part of (header ?? '').split(',')) {
        const [name = '', ...params] = part.trim().toLowerCase().split(';');
        const qParam = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
        const q = qParam ? Number(qParam.slice(2)) : 1;

        if (name.trim() === 'gzip') {
            return q > 0;
        }
        if (name.trim() === '*') {
            wildcard = q;
        }
    }

    return wildcard !== undefined && wildcard > 0;
}

/**
 * If-None-Match uses weak comparison (RFC 9110): it may be a list, "*", or W/-prefixed tags,
 * since proxies that recompress weaken strong ETags.
 */
export function matchesIfNoneMatch(header: string | null, etag: string): boolean {
    if (!header) {
        return false;
    }

    const opaque = (tag: string) => tag.trim().replace(/^W\//, '');
    return header.split(',').some((tag) => tag.trim() === '*' || opaque(tag) === opaque(etag));
}
