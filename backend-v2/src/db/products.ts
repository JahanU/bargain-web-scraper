import type { ProductSnapshot } from '../scrape/retailers/types';
import type { Sql } from './sql';

/** A deal exactly as the frontend's `Item` expects it. */
export interface Deal {
    name: string;
    wasPrice: number;
    nowPrice: number;
    discount: number;
    url: string;
    imageUrl?: string;
    sizes?: string[];
    inStock: 'IN STOCK';
    timestamp: number;
    gender: string;
}

interface ProductRow {
    name: string;
    url: string;
    image_url: string | null;
    gender: string;
    sizes: string[];
    was_price_pence: number;
    now_price_pence: number;
    discount: number;
    first_seen_at: Date;
}

/** Inserts or refreshes products seen this run, marking them active. Returns the row count. */
export async function upsertSeen(sql: Sql, retailer: string, products: ProductSnapshot[]): Promise<number> {
    if (!products.length) {
        return 0;
    }

    const rows = products.map((product) => ({
        retailer,
        external_id: product.externalId,
        name: product.name,
        url: product.url,
        image_url: product.imageUrl,
        gender: product.gender,
        sizes: product.sizes,
        was_price_pence: product.wasPricePence,
        now_price_pence: product.nowPricePence,
        discount: product.discount,
    }));

    const result = await sql`
        insert into products ${sql(rows)}
        on conflict (retailer, external_id) do update set
            name            = excluded.name,
            url             = excluded.url,
            image_url       = excluded.image_url,
            gender          = excluded.gender,
            sizes           = excluded.sizes,
            was_price_pence = excluded.was_price_pence,
            now_price_pence = excluded.now_price_pence,
            discount        = excluded.discount,
            status          = 'active',
            last_seen_at    = now(),
            sold_out_at     = null`;

    return result.count;
}

/** Marks the given products sold out. Returns how many were active before. */
export async function markSoldOut(sql: Sql, retailer: string, externalIds: string[]): Promise<number> {
    if (!externalIds.length) {
        return 0;
    }

    const result = await sql`
        update products set status = 'sold_out', sold_out_at = now()
        where retailer = ${retailer} and status = 'active' and external_id in ${sql(externalIds)}`;

    return result.count;
}

/**
 * Marks active products not seen in this transaction as sold out. now() is fixed for the
 * whole transaction, so anything upserted above has last_seen_at = now() and is untouched.
 */
export async function markMissingSoldOut(sql: Sql, retailer: string): Promise<number> {
    const result = await sql`
        update products set status = 'sold_out', sold_out_at = now()
        where retailer = ${retailer} and status = 'active' and last_seen_at < now()`;

    return result.count;
}

export async function countActive(sql: Sql, retailer: string): Promise<number> {
    const [row] = await sql`select count(*)::int as count from products where retailer = ${retailer} and status = 'active'`;
    return row.count;
}

/** All active deals at or above the discount floor, best first, in the API's shape. */
export async function listActiveDeals(sql: Sql, minDiscount: number): Promise<Deal[]> {
    const rows: ProductRow[] = await sql`
        select name, url, image_url, gender, sizes, was_price_pence, now_price_pence, discount, first_seen_at
        from products
        where status = 'active' and discount >= ${minDiscount}
        order by discount desc, now_price_pence asc`;

    return rows.map((row) => ({
        name: row.name,
        wasPrice: row.was_price_pence / 100,
        nowPrice: row.now_price_pence / 100,
        discount: row.discount,
        url: row.url,
        imageUrl: row.image_url ?? undefined,
        sizes: row.sizes.length ? row.sizes : undefined,
        inStock: 'IN STOCK',
        timestamp: row.first_seen_at.getTime(),
        gender: row.gender,
    }));
}

export interface ScrapeRunRecord {
    retailer: string;
    startedAt: Date;
    status: 'ok' | 'partial' | 'failed';
    hits?: number;
    upserted?: number;
    soldOut?: number;
    error?: string;
}

export async function recordRun(sql: Sql, run: ScrapeRunRecord): Promise<void> {
    await sql`
        insert into scrape_runs (retailer, started_at, status, hits, upserted, sold_out, error)
        values (${run.retailer}, ${run.startedAt}, ${run.status}, ${run.hits ?? 0}, ${run.upserted ?? 0},
                ${run.soldOut ?? 0}, ${run.error ?? null})`;
}
