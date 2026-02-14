import { beforeEach, describe, expect, it, mock } from 'bun:test';

mock.restore();

const webScrapeService = await import('./webScrapeService.ts?webscrape-service-real');
const { __test__: webScrapeTest, getBestDealsList } = webScrapeService;

function makeItem(id: string, discount = 40) {
    return {
        name: `Item ${id}`,
        wasPrice: '100',
        nowPrice: '50',
        discount,
        url: `https://example.com/${id}`,
        timestamp: Date.now(),
        gender: 'Male',
        sizes: ['M'],
    };
}

describe('webScrapeService cache helpers', () => {
    beforeEach(() => {
        webScrapeTest.resetStateForTests();
    });

    it('cacheDeals stores only unseen URLs', () => {
        const first = makeItem('first');
        const duplicate = { ...first };
        const second = makeItem('second');

        const newItems = webScrapeTest.cacheDeals([first, duplicate, second]);

        expect(newItems).toEqual([first, second]);
        expect(getBestDealsList().map((item) => item.url)).toEqual([first.url, second.url]);
    });

    it('getBestDealsList returns cached snapshot after reset', () => {
        const original = makeItem('snapshot');
        webScrapeTest.cacheDeals([original]);
        webScrapeTest.resetCache();

        const deals = getBestDealsList();
        expect(deals.length).toBe(1);
        expect(deals[0]?.url).toBe(original.url);
    });

    it('resetCache snapshots items with cloned sizes array', () => {
        const original = makeItem('clone');
        webScrapeTest.cacheDeals([original]);
        webScrapeTest.resetCache();

        original.sizes?.push('XL');
        const cached = getBestDealsList();

        expect(cached[0]?.sizes).toEqual(['M']);
    });

    it('sendDeals logs when there are no high-discount items', () => {
        const originalLog = console.log;
        const logMock = mock(() => { });
        console.log = logMock as unknown as typeof console.log;

        try {
            webScrapeTest.sendDeals([makeItem('low', 40)]);
        } finally {
            console.log = originalLog;
        }

        expect(String(logMock.mock.calls[0]?.[0])).toContain('No high-discount items');
    });

    it('sendDeals logs when high-discount items are found', () => {
        const originalLog = console.log;
        const logMock = mock(() => { });
        console.log = logMock as unknown as typeof console.log;

        try {
            webScrapeTest.sendDeals([makeItem('high', 70)]);
        } finally {
            console.log = originalLog;
        }

        expect(String(logMock.mock.calls[0]?.[0])).toContain('Found 1 new high-discount items');
    });
});
