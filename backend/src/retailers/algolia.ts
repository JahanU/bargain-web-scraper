import { duration, type Logger } from '@/log';
import { request } from '@/retailers/request';

export interface SearchConfig {
    applicationId: string;
    searchApiKey: string;
    indexName: string;
}

interface SearchPage<Hit> {
    hits: Hit[];
    nbHits: number;
    nbPages: number;
    /** False when `nbHits` is an estimate. */
    exhaustiveNbHits?: boolean;
}

// Algolia's per-request maximum.
const HITS_PER_PAGE = 1000;

/** Values of the `splitBy` attribute from `min` up to, but not including, `max`. */
interface Range {
    min: number;
    max: number;
}

// The first place an open-ended range is cut, and the width below which a range is not cut again.
const FIRST_CUT = 64;
const NARROWEST_RANGE = 0.01;

/**
 * Every hit of one query against a shop's Algolia index. Page 0 says how many pages there are;
 * the rest are fetched in parallel. Algolia only pages so deep into one query, so a query holding
 * more than that is read as ranges of the numeric attribute `splitBy` (a price), each small enough
 * to page through (only where the index counts its hits exactly, or the halves can't be checked).
 * `complete` is false when some hits still could not be reached.
 */
export async function searchAll<Hit>(
    config: SearchConfig,
    query: object,
    log: Logger,
    label: string,
    splitBy?: string,
) {
    const { applicationId, searchApiKey, indexName } = config;

    async function searchPage(page: number, range?: Range) {
        const numericFilters = range && [
            `${splitBy}>=${range.min}`,
            ...(Number.isFinite(range.max) ? [`${splitBy}<${range.max}`] : []),
        ];
        const started = performance.now();
        const response = await request(
            'Algolia search',
            `https://${applicationId}-dsn.algolia.net/1/indexes/${indexName}/query`,
            {
                method: 'POST',
                headers: { 'x-algolia-application-id': applicationId, 'x-algolia-api-key': searchApiKey },
                body: JSON.stringify({
                    ...query,
                    numericFilters,
                    hitsPerPage: HITS_PER_PAGE,
                    page,
                    // Without these, Algolia adds match highlighting to every hit: 2.5MB a page instead of 320KB.
                    attributesToHighlight: [],
                    attributesToSnippet: [],
                }),
            },
        );
        const body = (await response.json()) as SearchPage<Hit>;
        log.debug(`algolia ${label} page ${page + 1}/${body.nbPages}`, {
            hits: body.hits.length,
            took: duration(performance.now() - started),
        });
        return body;
    }

    /** The hits of one range, given its page 0. A range Algolia won't page through is read as two halves. */
    async function readRange(first: SearchPage<Hit>, range?: Range): Promise<{ hits: Hit[]; complete: boolean }> {
        const rest = await Promise.all(Array.from({ length: first.nbPages - 1 }, (_, i) => searchPage(i + 1, range)));
        const pages = [first, ...rest];
        const hits = pages.flatMap((page) => page.hits);

        // A big index only estimates its count, so there is nothing exact to compare with. There,
        // a last page that isn't full shows we reached the end.
        const estimated = first.exhaustiveNbHits === false;
        const reachedEnd = estimated ? (pages.at(-1)?.hits.length ?? 0) < HITS_PER_PAGE : hits.length >= first.nbHits;
        if (reachedEnd) {
            return { hits, complete: true };
        }

        const { min, max } = range ?? { min: 0, max: Number.POSITIVE_INFINITY };
        if (!splitBy || estimated || max - min <= NARROWEST_RANGE) {
            return { hits, complete: false };
        }

        const middle = Number.isFinite(max) ? (min + max) / 2 : Math.max(min * 2, FIRST_CUT);
        const halves = [
            { min, max: middle },
            { min: middle, max },
        ];
        const firsts = await Promise.all(halves.map((half) => searchPage(0, half)));
        // Halves that don't add up to the whole mean the index can't filter on this attribute:
        // keep what the capped pages gave us.
        if (firsts.reduce((sum, page) => sum + page.nbHits, 0) !== first.nbHits) {
            return { hits, complete: false };
        }
        const read = await Promise.all(halves.map((half, i) => readRange(firsts[i] as SearchPage<Hit>, half)));
        return { hits: read.flatMap((half) => half.hits), complete: read.every((half) => half.complete) };
    }

    const first = await searchPage(0);
    const { hits, complete } = await readRange(first);

    // Keep what we got, but say it is not everything, so the products Algolia held back aren't
    // treated as gone.
    if (!complete) {
        log.warn('⚠ listing truncated by Algolia: missing products will not be removed this run', {
            query: label,
            nbHits: first.nbHits,
            returned: hits.length,
        });
    }
    return { hits, complete };
}

/**
 * Runs `read` with a config learned once from the shop's own page, and forgotten after any error
 * (rotated key, renamed index) so the next run relearns it.
 */
export function withLearnedConfig<T>(learn: () => Promise<SearchConfig>, read: (config: SearchConfig) => Promise<T>) {
    let config: SearchConfig | undefined;
    return async () => {
        try {
            config ??= await learn();
            return await read(config);
        } catch (error) {
            config = undefined;
            throw error;
        }
    };
}
