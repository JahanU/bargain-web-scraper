import { SQL } from 'bun';

export type Sql = SQL;

/** One pooled Postgres client per process. Bun's built-in driver: no dependency needed. */
export function createSql(url: string): SQL {
    return new SQL({ url, max: 5, idleTimeout: 30 });
}
