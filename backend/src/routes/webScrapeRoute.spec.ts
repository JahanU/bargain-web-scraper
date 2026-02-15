import { beforeEach, describe, expect, it, mock } from 'bun:test';

mock.restore();

const getBestDealsListMock = mock((c: any) => c.json([{ name: 'Deal 1' }], 200));

mock.module('../controllers/webScrapeController', () => ({
    getBestDealsList: getBestDealsListMock,
}));

const { webScrapeRoute } = await import('./webScrapeRoute');

describe('webScrapeRoute', () => {
    beforeEach(() => {
        getBestDealsListMock.mockClear();
    });

    it('GET / returns route home text', async () => {
        const response = await webScrapeRoute.request('http://localhost/');
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('on webScrape home');
    });

    it('GET /getBestDeals delegates to controller', async () => {
        const response = await webScrapeRoute.request('http://localhost/getBestDeals');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([{ name: 'Deal 1' }]);
        expect(getBestDealsListMock.mock.calls.length).toBe(1);
    });
});
