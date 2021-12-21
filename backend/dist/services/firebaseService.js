"use strict";
// Import the functions you need from the SDKs you need
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { getAnalytics } from 'firebase/analytics';
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, setDoc, doc, } = require('firebase/firestore');
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
// Get a list t of telegram users from  database
function getUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        const userSnapshot = yield getDocs(userCollection);
        const users = userSnapshot.docs.map((d) => {
            const user = d.data();
            user.telegramId = d.id;
            return user;
        });
        console.log('users: ', users);
        return users;
    });
}
function addUser(update) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield setDoc(doc(db, 'users', ((_a = update.message) === null || _a === void 0 ? void 0 : _a.from.id.toString()) + '111'), {
                fullName: (((_b = update.message) === null || _b === void 0 ? void 0 : _b.from.first_name) + ' ' + ((_c = update.message) === null || _c === void 0 ? void 0 : _c.from.last_name)) || 'No Name Given',
            });
            console.log(`New user added!: ${((_d = update.message) === null || _d === void 0 ? void 0 : _d.from.first_name) + ' ' + ((_e = update.message) === null || _e === void 0 ? void 0 : _e.from.last_name)}`);
        }
        catch (err) {
            console.log(err);
        }
    });
}
module.exports = { getUsers, addUser };
