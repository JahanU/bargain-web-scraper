import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProductSnapshot } from '@/scrape/retailers/types';

export const product = (id: string, overrides: Partial<ProductSnapshot> = {}): ProductSnapshot => ({
    externalId: id,
    name: `Product ${id}`,
    url: `https://example.com/${id}`,
    imageUrl: null,
    gender: 'Male',
    sizes: ['8', '9'],
    wasPricePence: 10000,
    nowPricePence: 5000,
    discount: 50,
    inStock: true,
    ...overrides,
});

export const range = (count: number, from = 0) => Array.from({ length: count }, (_, i) => product(String(from + i)));

export const tempFile = async (name = 'deals.json') => join(await mkdtemp(join(tmpdir(), 'bargain-')), name);
