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
const URLS = require('../helper/urls');
const firebaseService = require('../services/firebaseService');
const telegramService = require('../services/telegramService');
// Not the best use of controllers but keeps it consistent with the other controllers.
// Works pretty well - Maybe move into TelegramService
/*
    Start
    /command1 - see brands being searched
    /command2 - Github link
    /command3 - Website link
*/
// Start
exports.signOnUser = (telegramUpdate) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield firebaseService.addUser(telegramUpdate);
    }
    catch (error) {
        console.log(error);
    }
});
// C1
exports.getBrands = (telegramUpdate) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        telegramUpdate.response_to_user = URLS.JD_ALL_MEN + '\n\n' + URLS.SHOES;
        telegramService.sendMessage(telegramUpdate);
    }
    catch (error) {
        console.log(error);
    }
});
// C2
exports.seeCodeProject = (telegramUpdate) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        telegramUpdate.response_to_user = 'https://github.com/JahanU/bargain-web-scraper';
        telegramService.sendMessage(telegramUpdate);
    }
    catch (error) {
        console.log(error);
    }
});
// C3
exports.getWebsite = (telegramUpdate) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        telegramUpdate.response_to_user = 'https://bargain-scraper.netlify.app/';
        telegramService.sendMessage(telegramUpdate);
    }
    catch (error) {
        console.log(error);
    }
});
