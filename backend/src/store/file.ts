import { mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { log } from '../log';
import { keyOf, type Catalogue, type StoredProduct } from './catalogue';

const FORMAT_VERSION = 1;

interface CatalogueFile {
    version: number;
    savedAt: string;
    products: StoredProduct[];
}

/**
 * Reads the catalogue saved by a previous run. A missing or unreadable file just means
 * starting empty: everything in it can be rebuilt by the next scrape.
 */
export async function loadCatalogue(path: string): Promise<Catalogue> {
    const file = Bun.file(path);
    if (!(await file.exists())) {
        return new Map();
    }

    try {
        const data = await file.json() as Partial<CatalogueFile>;
        if (data.version !== FORMAT_VERSION || !Array.isArray(data.products)) {
            throw new Error(`unrecognised format (version ${data.version})`);
        }

        const products = data.products.filter(isStoredProduct);
        if (products.length < data.products.length) {
            log.warn('skipped malformed products in data file', { path, skipped: data.products.length - products.length });
        }

        return new Map(products.map((product) => [keyOf(product.retailer, product.externalId), product]));
    } catch (error) {
        log.warn('ignoring unreadable data file; the next scrape rebuilds it', { path, error });
        return new Map();
    }
}

/**
 * Saves the catalogue. Writes a temporary file and renames it over the old one, which is
 * atomic: a crash mid-write leaves the previous file intact, never a half-written one.
 */
export async function saveCatalogue(path: string, catalogue: Catalogue): Promise<void> {
    const data: CatalogueFile = {
        version: FORMAT_VERSION,
        savedAt: new Date().toISOString(),
        products: [...catalogue.values()],
    };

    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.tmp`;
    await Bun.write(temporaryPath, JSON.stringify(data));
    await rename(temporaryPath, path);
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Checks every field the app reads, so one bad entry is dropped instead of crashing boot. */
function isStoredProduct(value: unknown): value is StoredProduct {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const product = value as Record<string, unknown>;
    return isString(product.retailer) && isString(product.externalId) && isString(product.name)
        && isString(product.url) && isString(product.gender)
        && (product.imageUrl === null || isString(product.imageUrl))
        && Array.isArray(product.sizes) && product.sizes.every(isString)
        && isNumber(product.wasPricePence) && isNumber(product.nowPricePence) && isNumber(product.discount)
        && (product.status === 'active' || product.status === 'sold_out')
        && isNumber(product.firstSeenAt) && isNumber(product.lastSeenAt)
        && (product.soldOutAt === null || isNumber(product.soldOutAt));
}
