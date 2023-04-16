"use strict";
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
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, collection, getDocs, setDoc, doc } = require('firebase-admin/firestore');
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
// Get a list of telegram users from  database
function getUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        const userSnapshot = yield getDocs('users').get();
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
            yield setDoc(doc(db, 'users', (_a = update.message) === null || _a === void 0 ? void 0 : _a.from.id.toString()), {
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
