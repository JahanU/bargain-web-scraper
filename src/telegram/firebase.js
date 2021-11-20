// Import the functions you need from the SDKs you need
// import { getAnalytics } from 'firebase/analytics';
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

// Get a list t of telegram users from  database
async function getUsers() {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    console.log('all users: ', userSnapshot.docs.map((doc) => doc.data()));
    return userSnapshot.docs.map((doc) => doc.data());

    //     const snapshot = await db.collection('users').get();
    // snapshot.forEach((doc) => {
    //   console.log(doc.id, '=>', doc.data());
    // }); - both work
}

module.exports = { getUsers };
