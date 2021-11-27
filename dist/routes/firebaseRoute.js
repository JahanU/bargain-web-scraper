"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const firebaseController = require('../controllers/firebaseController');
router.get('/', (req, res) => {
    res.send('on firebase home');
});
router.get('/allUsers', firebaseController.getUsers);
router.post('/addUser', firebaseController.addUser);
module.exports = router; // Export this as a module, so that the router is accessible from index.
