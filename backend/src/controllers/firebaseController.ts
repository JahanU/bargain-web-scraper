import type { Context } from 'hono';
import * as firebaseService from '../services/firebaseService';

export const getUsers = async (c: Context) => {
    try {
        const users = await firebaseService.getUsers();
        return c.json(users, 200);
    } catch (err) {
        return c.json({ error: { message: (err as Error).message } }, 500);
    }
};

export const addUser = async (c: Context) => {
    try {
        const body = await c.req.json();
        const result = await firebaseService.addUser(body);
        return c.json(result, 200);
    } catch (err) {
        return c.json({ error: { message: (err as Error).message } }, 500);
    }
};
