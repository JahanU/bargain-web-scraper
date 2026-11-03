import { countActive, markMissingSoldOut, markSoldOut, upsertSeen } from '../db/products';
import type { Sql } from '../db/sql';
import type { ProductSnapshot } from './retailers/types';

// If a run sees fewer than half the products we currently list, assume the fetch was
// incomplete rather than that half the catalogue sold out in five minutes.
export const MIN_SEEN_RATIO = 0.5;

export interface ReconcileResult {
    status: 'ok' | 'partial';
    hits: number;
    upserted: number;
    soldOut: number;
}

/**
 * Brings one retailer's stored products in line with what it lists right now, atomically:
 * upsert what is in stock, mark out-of-stock and disappeared products sold out.
 */
export async function reconcile(sql: Sql, retailer: string, snapshots: ProductSnapshot[]): Promise<ReconcileResult> {
    // The same product can appear in more than one listing; one upsert may only touch a row once.
    const byId = new Map<string, ProductSnapshot>();
    for (const snapshot of snapshots) {
        const existing = byId.get(snapshot.externalId);
        if (!existing || (snapshot.inStock && !existing.inStock)) {
            byId.set(snapshot.externalId, snapshot);
        }
    }

    const inStock = [...byId.values()].filter((snapshot) => snapshot.inStock);
    const outOfStockIds = [...byId.values()].filter((snapshot) => !snapshot.inStock).map((snapshot) => snapshot.externalId);

    return sql.begin(async (tx) => {
        const activeBefore = await countActive(tx, retailer);
        const upserted = await upsertSeen(tx, retailer, inStock);
        let soldOut = await markSoldOut(tx, retailer, outOfStockIds);

        const looksComplete = inStock.length >= activeBefore * MIN_SEEN_RATIO;
        if (looksComplete) {
            soldOut += await markMissingSoldOut(tx, retailer);
        }

        return { status: looksComplete ? 'ok' : 'partial', hits: byId.size, upserted, soldOut };
    });
}
