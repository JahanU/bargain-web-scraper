import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { URLS } from '../helper/urls';

mock.restore();

const addUserMock = mock(async () => {});
const sendMessageMock = mock(() => {});

mock.module('../services/firebaseService', () => ({
    addUser: addUserMock,
}));

mock.module('../services/telegramService', () => ({
    sendMessage: sendMessageMock,
}));

const controller = await import('./telegramController');

function createUpdate(command = '/start') {
    return {
        update_id: 1,
        date: Date.now(),
        text: command,
        entities: [],
        response_to_user: '',
        message: {
            message_id: 1,
            text: command,
            date: Date.now(),
            from: {
                id: 42,
                first_name: 'Jahan',
                last_name: 'Ulhaque',
            },
            chat: {
                id: 42,
                first_name: 'Jahan',
                last_name: 'Ulhaque',
                type: 'private',
            },
            sender_chat: {
                id: 42,
                first_name: 'Jahan',
                last_name: 'Ulhaque',
                type: 'private',
            },
            forward_from: {
                id: 42,
                first_name: 'Jahan',
                last_name: 'Ulhaque',
            },
            forward_from_chat: {
                id: 42,
                first_name: 'Jahan',
                last_name: 'Ulhaque',
                type: 'private',
            },
        },
    };
}

describe('telegramController', () => {
    beforeEach(() => {
        addUserMock.mockClear();
        sendMessageMock.mockClear();
    });

    it('signOnUser adds telegram user through firebaseService', async () => {
        const update = createUpdate('/start');
        await controller.signOnUser(update as any);

        expect(addUserMock.mock.calls.length).toBe(1);
        expect(addUserMock.mock.calls[0]?.[0]).toEqual(update);
    });

    it('getBrands sets response and sends message', async () => {
        const update = createUpdate('/command1');
        await controller.getBrands(update as any);

        expect(update.response_to_user).toBe(`${URLS.JD_ALL_MEN}\n\n${URLS.SHOES}`);
        expect(sendMessageMock.mock.calls[0]?.[0]).toEqual(update);
    });

    it('seeCodeProject sends repository link', async () => {
        const update = createUpdate('/command2');
        await controller.seeCodeProject(update as any);

        expect(update.response_to_user).toBe('https://github.com/JahanU/bargain-web-scraper');
        expect(sendMessageMock.mock.calls[0]?.[0]).toEqual(update);
    });

    it('getWebsite sends site link', async () => {
        const update = createUpdate('/command3');
        await controller.getWebsite(update as any);

        expect(update.response_to_user).toBe('https://bargain-scraper.netlify.app/');
        expect(sendMessageMock.mock.calls[0]?.[0]).toEqual(update);
    });
});
