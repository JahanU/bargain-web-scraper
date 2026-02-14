import { beforeEach, describe, expect, it, mock } from 'bun:test';

mock.restore();

process.env.CHAT_ID_JAHAN = '12345';

const sendPhotoMock = mock(async (_payload: any) => {});
const sendMessageMock = mock(async (_payload: any) => {});

class MockTG {
    constructor(_options: { token?: string }) {}

    sendPhoto = sendPhotoMock;
    sendMessage = sendMessageMock;
}

mock.module('telegram-bot-api', () => ({
    default: MockTG,
}));

const telegramService = await import('./telegramService.ts?telegram-service-real');

describe('telegramService', () => {
    beforeEach(() => {
        sendPhotoMock.mockClear();
        sendMessageMock.mockClear();
    });

    it('sendPhotosToUsers sends one photo per item to configured user', async () => {
        const items = [
            {
                name: 'Nike Tee',
                wasPrice: '50',
                nowPrice: '20',
                discount: 60,
                url: 'https://example.com/item-1',
                imageUrl: 'https://example.com/item-1.jpg',
                sizes: ['M'],
                timestamp: 1,
                gender: 'Male',
            },
            {
                name: 'Nike Shorts',
                wasPrice: '40',
                nowPrice: '25',
                discount: 37,
                url: 'https://example.com/item-2',
                imageUrl: 'https://example.com/item-2.jpg',
                sizes: ['L'],
                timestamp: 2,
                gender: 'Male',
            },
        ];

        await telegramService.sendPhotosToUsers(items as any);

        expect(sendPhotoMock.mock.calls.length).toBe(2);
        expect(sendPhotoMock.mock.calls[0]?.[0]).toMatchObject({
            chat_id: '12345',
            photo: 'https://example.com/item-1.jpg',
        });
    });

    it('sendMessage forwards chat id and response text', () => {
        const update = {
            message: {
                from: {
                    id: 999,
                },
            },
            response_to_user: 'hello',
        };

        telegramService.sendMessage(update as any);

        expect(sendMessageMock.mock.calls.length).toBe(1);
        expect(sendMessageMock.mock.calls[0]?.[0]).toEqual({
            chat_id: 999,
            text: 'hello',
        });
    });
});
