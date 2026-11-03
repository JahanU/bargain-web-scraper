import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Sql } from './sql';
import { createSql } from './sql';

const MIGRATIONS_DIR = join(import.meta.dir, '../../db/migrations');

/** Applies each not-yet-applied .sql file in name order, each in its own transaction. */
export async function migrate(sql: Sql): Promise<string[]> {
    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const applied = new Set((await sql`select name from schema_migrations`).map((row: { name: string }) => row.name));

    const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();
    const ran: string[] = [];

    for (const file of files) {
        if (applied.has(file)) {
            continue;
        }

        const body = await Bun.file(join(MIGRATIONS_DIR, file)).text();
        await sql.begin(async (tx) => {
            await tx.unsafe(body);
            await tx`insert into schema_migrations (name) values (${file})`;
        });
        ran.push(file);
    }

    return ran;
}

if (import.meta.main) {
    const url = Bun.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }

    const sql = createSql(url);
    const ran = await migrate(sql);
    console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Database is up to date.');
    await sql.close();
}
