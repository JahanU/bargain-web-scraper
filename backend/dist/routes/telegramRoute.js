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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const TG = require('telegram-bot-api');
const telegramController = require('../controllers/telegramController');
const api = new TG({ token: process.env.TELEGRAM_API });
const mp = new TG.GetUpdateMessageProvider(); // Define your message provider
router.get('/', (req, res) => {
    res.send('on telegram home');
});
api.setMessageProvider(mp); // Set message provider and start API
api.start()
    .then(() => {
    console.log('Telegram Message handler API started');
})
    .catch((err) => console.log(err));
// Receive messages via event callback
api.on('update', (update) => {
    console.log('update: ', update);
    handleCommands(update); // handle all telegram bot commands
});
/* eslint-disable indent */
function handleCommands(update) {
    var _a;
    switch ((_a = update.message) === null || _a === void 0 ? void 0 : _a.text) {
        case '/start':
            handleSignOnUser(update);
            break;
        case '/command1':
            handleGetBrands(update);
            break;
        case '/command2':
            handleCodeProject(update);
            break;
        case '/command3':
            handleGetWebsite(update);
            break;
        default:
            break;
    }
}
function handleGetBrands(update) {
    telegramController.getBrands(update);
}
function handleSignOnUser(update) {
    return __awaiter(this, void 0, void 0, function* () {
        yield telegramController.signOnUser(update);
    });
}
function handleCodeProject(update) {
    return __awaiter(this, void 0, void 0, function* () {
        yield telegramController.seeCodeProject(update);
    });
}
function handleGetWebsite(update) {
    return __awaiter(this, void 0, void 0, function* () {
        yield telegramController.getWebsite(update);
    });
}
module.exports = router; // Export this as a module, so that the router is accessible from index.
