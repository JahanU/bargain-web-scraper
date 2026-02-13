import { beforeEach, describe, expect, it, mock } from 'bun:test';

mock.restore();

const getUsersMock = mock((c: any) => c.json([{ telegramId: '1', fullName: 'Jane' }], 200));
const addUserMock = mock((c: any) => c.json({ message: 'ok' }, 200));

mock.module('../controllers/firebaseController', () => ({
    getUsers: getUsersMock,
    addUser: addUserMock,
}));

const { firebaseRoute } = await import('./firebaseRoute');

describe('firebaseRoute', () => {
    beforeEach(() => {
        getUsersMock.mockClear();
        addUserMock.mockClear();
    });

    it('GET / returns route home text', async () => {
        const response = await firebaseRoute.request('http://localhost/');
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('on firebase home');
    });

    it('GET /allUsers delegates to getUsers controller', async () => {
        const response = await firebaseRoute.request('http://localhost/allUsers');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([{ telegramId: '1', fullName: 'Jane' }]);
        expect(getUsersMock.mock.calls.length).toBe(1);
    });

    it('POST /addUser delegates to addUser controller', async () => {
        const response = await firebaseRoute.request('http://localhost/addUser', {
            method: 'POST',
            body: JSON.stringify({ foo: 'bar' }),
            headers: { 'Content-Type': 'application/json' },
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ message: 'ok' });
        expect(addUserMock.mock.calls.length).toBe(1);
    });
});
