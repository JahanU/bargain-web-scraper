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
}

// Algolia's per-request maximum.
const HITS_PER_PAGE = 1000;

/**
 * Every hit of one query against a shop's Algolia index. Page 0 says how many pages there are;
 * the rest are fetched in parallel. `complete` is false when Algolia held some hits back.
 */
export async function searchAll<Hit>(config: SearchConfig, query: object, log: Logger, label: string) {
    const { applicationId, searchApiKey, indexName } = config;

    async function searchPage(page: number) {
        const started = performance.now();
        const response = await request(
            'Algolia search',
            `https://${applicationId}-dsn.algolia.net/1/indexes/${indexName}/query`,
            {
                method: 'POST',
                headers: { 'x-algolia-application-id': applicationId, 'x-algolia-api-key': searchApiKey },
                body: JSON.stringify({
                    ...query,
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

    const first = await searchPage(0);
    const rest = await Promise.all(Array.from({ length: first.nbPages - 1 }, (_, i) => searchPage(i + 1)));
    const hits = [first, ...rest].flatMap((page) => page.hits);

    // Algolia caps how deep pagination goes. Keep what we got, but say it is not everything,
    // so the products it held back aren't treated as gone.
    const complete = hits.length >= first.nbHits;
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
