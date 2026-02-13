import { beforeEach, describe, expect, it, mock } from 'bun:test';

mock.restore();

const getMock = mock(async () => ({
    docs: [
        {
            id: '111',
            data: () => ({ fullName: 'Jane Doe' }),
        },
        {
            id: '222',
            data: () => ({ fullName: 'John Doe' }),
        },
    ],
}));

const setMock = mock(async (_payload: any) => {});
const docMock = mock((_id: string) => ({
    set: setMock,
}));
const collectionMock = mock((_name: string) => ({
    get: getMock,
    doc: docMock,
}));

const dbMock = {
    collection: collectionMock,
};

const initializeAppMock = mock(() => ({ app: true }));
const getFirestoreMock = mock((_app: unknown) => dbMock);

mock.module('firebase-admin/app', () => ({
    initializeApp: initializeAppMock,
}));

mock.module('firebase-admin/firestore', () => ({
    getFirestore: getFirestoreMock,
}));

const firebaseService = await import('./firebaseService.ts?firebase-service-real');

describe('firebaseService', () => {
    beforeEach(() => {
        getMock.mockClear();
        setMock.mockClear();
        docMock.mockClear();
        collectionMock.mockClear();
    });

    it('getUsers maps Firestore docs and adds telegramId', async () => {
        const users = await firebaseService.getUsers();

        expect(collectionMock.mock.calls[0]?.[0]).toBe('users');
        expect(users).toEqual([
            { fullName: 'Jane Doe', telegramId: '111' },
            { fullName: 'John Doe', telegramId: '222' },
        ]);
    });

    it('addUser writes fullName into users collection keyed by telegram id', async () => {
        const update = {
            message: {
                from: {
                    id: 123,
                    first_name: 'Jahan',
                    last_name: 'Ulhaque',
                },
            },
        };

        await firebaseService.addUser(update as any);

        expect(collectionMock.mock.calls[0]?.[0]).toBe('users');
        expect(docMock.mock.calls[0]?.[0]).toBe('123');
        expect(setMock.mock.calls[0]?.[0]).toEqual({
            fullName: 'Jahan Ulhaque',
        });
    });
});
