import { Hono } from 'hono';
import * as firebaseController from '../controllers/firebaseController';

export const firebaseRoute = new Hono();

firebaseRoute.get('/', (c) => {
    return c.text('on firebase home');
});

firebaseRoute.get('/allUsers', firebaseController.getUsers);
firebaseRoute.post('/addUser', firebaseController.addUser);
