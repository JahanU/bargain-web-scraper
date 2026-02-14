import { describe, expect, it, mock } from 'bun:test';

mock.restore();

const deals = [
    {
        name: 'Nike Tee',
        wasPrice: '50',
        nowPrice: '20',
        discount: 60,
        url: 'https://example.com/nike-tee',
        timestamp: 1,
        gender: 'Male',
    },
];

const getDealsMock = mock(() => deals);

mock.module('../services/webScrapeService', () => ({
    getBestDealsList: getDealsMock,
}));

const controller = await import('./webScrapeController');

describe('webScrapeController.getBestDealsList', () => {
    it('returns JSON payload with copied deals array', () => {
        const json = mock((body: unknown) => body);
        const c = { json } as any;

        const response = controller.getBestDealsList(c);

        expect(getDealsMock.mock.calls.length).toBe(1);
        expect(json.mock.calls.length).toBe(1);
        const body = json.mock.calls[0]?.[0] as unknown[];
        expect(body).toEqual(deals);
        expect(body).not.toBe(deals);
        expect(response).toEqual(deals);
    });
});
