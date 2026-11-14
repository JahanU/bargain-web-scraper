import { type BrandCount, brandCounts, CATEGORIES, type Deal, type DealFilter, filterDeals, GENDERS } from '@/deals';
import { createLogger, duration, type Level } from '@/log';
import {
    DEFAULT_SORT,
    type DealPage,
    type DealQuery,
    decodeCursor,
    queryDeals,
    type Snapshot,
    SORT_IDS,
    type Store,
} from '@/query';

const log = createLogger('http');

// Browsers may reuse the list for a minute, then refresh it in the background.
// No compression here: Render compresses every response (Brotli) on its way out.
const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

/** How long clients should wait before asking again while the first scrape is still running. */
export const RETRY_AFTER_SECONDS = 10;

// The frontend is on another origin (Netlify). Browsers hide Retry-After from cross-origin
// JavaScript unless it is exposed.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Retry-After' };

/** The deals (a list, a page, or their brand counts), or a 503 asking the client to retry while the first scrape is still running. */
export function dealsResponse(deals: Deal[] | BrandCount[] | DealPage | undefined): Response {
    if (!deals) {
        return Response.json(
            { error: 'Deals are loading, try again shortly' },
            { status: 503, headers: { 'Retry-After': String(RETRY_AFTER_SECONDS), ...CORS } },
        );
    }
    return Response.json(deals, { headers: { 'Cache-Control': CACHE_CONTROL, ...CORS } });
}

function badRequest(error: string): Response {
    return Response.json({ error }, { status: 400, headers: CORS });
}

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
    return (allowed as readonly string[]).includes(value);
}

/**
 * The filter a query asks for, or the 400 saying what is wrong with it. An absent parameter means
 * "any" (the deployed frontend sends none).
 */
function parseFilter(params: URLSearchParams): DealFilter | Response {
    const gender = params.get('gender') ?? undefined;
    if (gender !== undefined && !isOneOf(GENDERS, gender)) {
        return badRequest(`gender must be one of ${GENDERS.join(', ')}`);
    }
    const category = params.get('category') ?? undefined;
    if (category !== undefined && !isOneOf(CATEGORIES, category)) {
        return badRequest(`category must be one of ${CATEGORIES.join(', ')}`);
    }
    // Only an empty brand is rejected. One that no deal has matches nothing: brands come and go
    // with stock every scrape, so a saved link must keep working.
    const brands = params.getAll('brand');
    if (brands.some((brand) => brand.trim() === '')) {
        return badRequest('brand must not be empty');
    }
    return { gender, category, brands };
}

const MAX_SEARCH_LENGTH = 64;
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 100;

/** A parameter that must be plain digits within range: its value (the fallback when absent), or undefined if it is anything else. */
function wholeNumber(raw: string | null, fallback: number, min: number, max: number): number | undefined {
    if (raw === null) {
        return fallback;
    }
    const value = Number(raw);
    return /^\d+$/.test(raw) && value >= min && value <= max ? value : undefined;
}

/** The `/v2/deals` query a request asks for, or the 400 saying what is wrong with it. */
function parseQuery(params: URLSearchParams, stores: Store[]): DealQuery | Response {
    const filter = parseFilter(params);
    if (filter instanceof Response) {
        return filter;
    }

    // Unlike a brand, the set of stores is fixed at startup, so an unknown one is a mistake.
    const storeIds = stores.map((store) => store.id);
    const wantedStores = params.getAll('store');
    if (wantedStores.some((store) => !storeIds.includes(store))) {
        return badRequest(`store must be one of ${storeIds.join(', ')}`);
    }
    // Sizes come and go with stock like brands do: only an empty one is rejected.
    const sizes = params.getAll('size');
    if (sizes.some((size) => size.trim() === '')) {
        return badRequest('size must not be empty');
    }
    const search = params.get('q')?.trim();
    if (search !== undefined && (search === '' || search.length > MAX_SEARCH_LENGTH)) {
        return badRequest(`q must be 1 to ${MAX_SEARCH_LENGTH} characters`);
    }
    const minDiscount = wholeNumber(params.get('minDiscount'), 0, 0, 100);
    if (minDiscount === undefined) {
        return badRequest('minDiscount must be a whole number from 0 to 100');
    }
    const sort = params.get('sort') ?? DEFAULT_SORT;
    if (!isOneOf(SORT_IDS, sort)) {
        return badRequest(`sort must be one of ${SORT_IDS.join(', ')}`);
    }
    const limit = wholeNumber(params.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
    if (limit === undefined) {
        return badRequest(`limit must be a whole number from 1 to ${MAX_LIMIT}`);
    }
    const cursor = params.get('cursor');
    const after = cursor === null ? undefined : decodeCursor(cursor);
    if (cursor !== null && !after) {
        return badRequest('cursor is not valid');
    }

    return {
        ...filter,
        stores: wantedStores,
        sizes,
        words: search?.toLowerCase().split(/\s+/) ?? [],
        minDiscount,
        sort,
        limit,
        after,
    };
}

/** One page of the deals matching the query. Like v1, a bad query is a 400 even before the first scrape. */
function pageFor(request: Request, stores: Store[], snapshot: Snapshot | undefined): Response {
    const query = parseQuery(new URL(request.url).searchParams, stores);
    if (query instanceof Response) {
        return query;
    }
    return dealsResponse(snapshot && queryDeals(snapshot, query));
}

/** The deals matching the query. A bad query is a 400 even before the first scrape: retrying won't fix it. */
function dealsFor(request: Request, deals: Deal[] | undefined): Response {
    const filter = parseFilter(new URL(request.url).searchParams);
    if (filter instanceof Response) {
        return filter;
    }
    return dealsResponse(deals && filterDeals(deals, filter));
}

/** The brands among the deals matching `gender` and `category`, each with how many it has. */
function brandsFor(request: Request, deals: Deal[] | undefined): Response {
    const params = new URL(request.url).searchParams;
    // The list is what the brand filter chooses from, so a selected brand must not narrow it.
    params.delete('brand');
    const filter = parseFilter(params);
    if (filter instanceof Response) {
        return filter;
    }
    return dealsResponse(deals && brandCounts(filterDeals(deals, filter)));
}

/** Route table for Bun.serve. `snapshot()` is undefined until the first good scrape. */
export function routes(stores: Store[], snapshot: () => Snapshot | undefined, health: () => object) {
    const deals = () => snapshot()?.deals;
    // Health checks are frequent keep-awake pings, so they only show at LOG_LEVEL=debug.
    const healthResponse = logged(() => Response.json(health(), { headers: CORS }), 'debug');
    const dealsRoute = { GET: logged((request) => dealsFor(request, deals())) };

    return {
        // `/` as well, so a keep-awake ping or platform health check aimed at the root gets a 200.
        '/': healthResponse,
        '/health': healthResponse,
        '/v1/deals': dealsRoute,
        '/v1/brands': { GET: logged((request) => brandsFor(request, deals())) },
        '/v2/deals': { GET: logged((request) => pageFor(request, stores, snapshot())) },
        // The path the current frontend calls.
        '/webscrape/getBestDeals': dealsRoute,
    };
}

/** Anything that isn't a known route. */
export const notFound = logged(() => Response.json({ error: 'Not Found' }, { status: 404, headers: CORS }));

const STATUS_NOTES: Record<number, string> = { 400: ' bad request', 404: ' not found', 503: ' still loading' };

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
