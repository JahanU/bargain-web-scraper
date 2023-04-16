// Import the functions you need from the SDKs you need

import { TelegramUpdate } from "../interfaces/TelegramUpdate";

// import { getAnalytics } from 'firebase/analytics';
const { initializeApp } = require('firebase/app');
const {
    getFirestore, collection, getDocs, setDoc, doc,
} = require('firebase/firestore');

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: 'bargain-hunter-hxh.firebaseapp.com',
    projectId: 'bargain-hunter-hxh',
    storageBucket: 'bargain-hunter-hxh.appspot.com',
    messagingSenderId: '685313703711',
    appId: '1:685313703711:web:dc0d2c5b0afcfb75363a2a',
    measurementId: 'G-4LB7BNQRGB',
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userCollection = collection(db, 'users');

// Get a list of telegram users from  database
async function getUsers() {
    const userSnapshot = await getDocs(userCollection);
    const users = userSnapshot.docs.map((d: any) => {
        const user = d.data();
        user.telegramId = d.id;
        return user;
    });
    console.log('users: ', users);
    return users;
}

async function addUser(update: TelegramUpdate) {
    try {
        await setDoc(doc(db, 'users', update.message?.from.id.toString()), {
            fullName: (update.message?.from.first_name + ' ' + update.message?.from.last_name) || 'No Name Given',
        });
        console.log(`New user added!: ${update.message?.from.first_name + ' ' + update.message?.from.last_name}`);
    } catch (err) {
        console.log(err);
    }
}

module.exports = { getUsers, addUser };
