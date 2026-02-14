import { beforeEach, describe, expect, it, mock } from 'bun:test';

mock.restore();

const signOnUserMock = mock(async () => {});
const getBrandsMock = mock(async () => {});
const seeCodeProjectMock = mock(async () => {});
const getWebsiteMock = mock(async () => {});

mock.module('../controllers/telegramController', () => ({
    signOnUser: signOnUserMock,
    getBrands: getBrandsMock,
    seeCodeProject: seeCodeProjectMock,
    getWebsite: getWebsiteMock,
}));

const setMessageProviderMock = mock(() => {});
const startMock = mock(async () => {});
let updateHandler: ((update: any) => void) | undefined;
const onMock = mock((event: string, callback: (update: any) => void) => {
    if (event === 'update') {
        updateHandler = callback;
    }
});

class MockTG {
    static GetUpdateMessageProvider = class {};

    constructor(_options: { token?: string }) {}

    setMessageProvider = setMessageProviderMock;
    start = startMock;
    on = onMock;
}

mock.module('telegram-bot-api', () => ({
    default: MockTG,
}));

const { telegramRoute } = await import('./telegramRoute');

function makeUpdate(text: string) {
    return {
        message: {
            text,
        },
    };
}

describe('telegramRoute', () => {
    beforeEach(() => {
        signOnUserMock.mockClear();
        getBrandsMock.mockClear();
        seeCodeProjectMock.mockClear();
        getWebsiteMock.mockClear();
    });

    it('GET / returns route home text', async () => {
        const response = await telegramRoute.request('http://localhost/');
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('on telegram home');
    });

    it('boots telegram API on module load', () => {
        expect(setMessageProviderMock.mock.calls.length).toBe(1);
        expect(startMock.mock.calls.length).toBe(1);
        expect(onMock.mock.calls.length).toBe(1);
        expect(onMock.mock.calls[0]?.[0]).toBe('update');
        expect(updateHandler).toBeDefined();
    });

    it('dispatches /start to signOnUser', async () => {
        updateHandler?.(makeUpdate('/start'));
        await Bun.sleep(0);
        expect(signOnUserMock.mock.calls.length).toBe(1);
    });

    it('dispatches /command1 to getBrands', async () => {
        updateHandler?.(makeUpdate('/command1'));
        await Bun.sleep(0);
        expect(getBrandsMock.mock.calls.length).toBe(1);
    });

    it('dispatches /command2 to seeCodeProject', async () => {
        updateHandler?.(makeUpdate('/command2'));
        await Bun.sleep(0);
        expect(seeCodeProjectMock.mock.calls.length).toBe(1);
    });

    it('dispatches /command3 to getWebsite', async () => {
        updateHandler?.(makeUpdate('/command3'));
        await Bun.sleep(0);
        expect(getWebsiteMock.mock.calls.length).toBe(1);
    });

    it('ignores unknown commands', async () => {
        updateHandler?.(makeUpdate('/unknown'));
        await Bun.sleep(0);
        expect(signOnUserMock.mock.calls.length).toBe(0);
        expect(getBrandsMock.mock.calls.length).toBe(0);
        expect(seeCodeProjectMock.mock.calls.length).toBe(0);
        expect(getWebsiteMock.mock.calls.length).toBe(0);
    });
});
