import type { Listing, Product, Retailer } from '@/retailers/types';

export const product = (id: string, overrides: Partial<Product> = {}): Product => ({
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

export const complete = (products: Product[]): Listing => ({ products, complete: true });

export interface FakeRetailer {
    retailer: Retailer;
    calls: number;
    /** What the next fetch returns (or throws). Set it before the scrape that should see it. */
    next: () => Promise<Listing> | Listing;
}

/** A retailer whose responses each test scripts by setting `next`. */
export function fakeRetailer(id = 'jd', first: FakeRetailer['next'] = () => complete([])): FakeRetailer {
    const fake: FakeRetailer = {
        calls: 0,
        next: first,
        retailer: {
            id,
            fetchListing: async () => {
                fake.calls++;
                return fake.next();
            },
        },
    };
    return fake;
}

/**
 * A stand-in for the scrape loop's sleep that the test controls. The loop sleeps after every
 * scrape, so "the loop is sleeping" means "a scrape just finished".
 */
export function manualSleep() {
    const delays: number[] = [];
    let wake: (() => void) | undefined;
    const waiters: { count: number; resolve: () => void }[] = [];

    const sleep = (ms: number, signal?: AbortSignal) => {
        delays.push(ms);
        for (const waiter of waiters.filter((w) => w.count <= delays.length)) {
            waiter.resolve();
        }
        return new Promise<void>((resolve) => {
            wake = resolve;
            signal?.addEventListener('abort', () => resolve(), { once: true });
        });
    };

    /** Resolves once the loop has slept `count` times in total (i.e. finished `count` scrapes). */
    const scrapesDone = (count: number) =>
        delays.length >= count ? Promise.resolve() : new Promise<void>((resolve) => waiters.push({ count, resolve }));

    return {
        sleep,
        delays,
        scrapesDone,
        /** Ends the current sleep and waits for the next scrape to finish. */
        async tick() {
            const target = delays.length + 1;
            wake?.();
            await scrapesDone(target);
        },
    };
}
