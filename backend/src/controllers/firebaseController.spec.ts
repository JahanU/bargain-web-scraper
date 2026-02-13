import { beforeEach, describe, expect, it, mock } from 'bun:test';

mock.restore();

const getUsersMock = mock(async () => [{ telegramId: '1', fullName: 'Jane Doe' }]);
const addUserMock = mock(async () => {});

mock.module('../services/firebaseService', () => ({
    getUsers: getUsersMock,
    addUser: addUserMock,
}));

const controller = await import('./firebaseController');

function createContext(body?: unknown) {
    const json = mock((payload: unknown, status?: number) => ({ payload, status }));
    return {
        req: {
            json: async () => body,
        },
        json,
    } as any;
}

describe('firebaseController', () => {
    beforeEach(() => {
        getUsersMock.mockClear();
        addUserMock.mockClear();
    });

    it('getUsers returns users and 200 on success', async () => {
        const c = createContext();
        await controller.getUsers(c);

        expect(getUsersMock.mock.calls.length).toBe(1);
        expect(c.json.mock.calls[0]).toEqual([[{ telegramId: '1', fullName: 'Jane Doe' }], 200]);
    });

    it('getUsers returns 500 on service error', async () => {
        getUsersMock.mockImplementationOnce(async () => {
            throw new Error('firebase down');
        });
        const c = createContext();
        await controller.getUsers(c);

        expect(c.json.mock.calls[0]?.[0]).toEqual({ error: { message: 'firebase down' } });
        expect(c.json.mock.calls[0]?.[1]).toBe(500);
    });

    it('addUser forwards body and returns 200 on success', async () => {
        const body = { message: { from: { id: 7 } } };
        const c = createContext(body);

        await controller.addUser(c);

        expect(addUserMock.mock.calls[0]?.[0]).toEqual(body);
        expect(c.json.mock.calls[0]).toEqual([{ message: 'User added successfully' }, 200]);
    });

    it('addUser returns 500 on error', async () => {
        addUserMock.mockImplementationOnce(async () => {
            throw new Error('write failed');
        });
        const c = createContext({ foo: 'bar' });

        await controller.addUser(c);

        expect(c.json.mock.calls[0]?.[0]).toEqual({ error: { message: 'write failed' } });
        expect(c.json.mock.calls[0]?.[1]).toBe(500);
    });
});
