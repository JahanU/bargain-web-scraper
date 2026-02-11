import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { TelegramUpdate } from '../interfaces/TelegramUpdate';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD7fcPb8cGDClIrWsvEvtBnUsTBobY2LAA",
    authDomain: "bargain-hunter-hxh.firebaseapp.com",
    projectId: "bargain-hunter-hxh",
    storageBucket: "bargain-hunter-hxh.appspot.com",
    messagingSenderId: "685313703711",
    appId: "1:685313703711:web:dc0d2c5b0afcfb75363a2a"
};

const app = initializeApp(firebaseConfig); // Initialize Firebase
const db = getFirestore(app); // Initialize Cloud Firestore and get a reference to the service

// Get a list of telegram users from database
export async function getUsers() {
    const userSnapshot = await db.collection('users').get();
    const users = userSnapshot.docs.map((d: any) => {
        const user = d.data();
        user.telegramId = d.id;
        return user;
    });
    console.log('users: ', users);
    return users;
}

export async function addUser(update: TelegramUpdate) {
    try {
        await db.collection('users').doc(update.message?.from.id.toString() as string).set({
            fullName: (update.message?.from.first_name + ' ' + update.message?.from.last_name) || 'No Name Given',
        });
        console.log(`New user added!: ${update.message?.from.first_name + ' ' + update.message?.from.last_name}`);
    } catch (err) {
        console.log(err);
    }
}
