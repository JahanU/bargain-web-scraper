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
// Works pretty well
exports.getBrands = (telegramUpdate) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // eslint-disable-next-line no-param-reassign
        telegramUpdate.response_to_user = URLS.JD_ALL_MEN + '\n\n' + URLS.SHOES;
        telegramService.sendMessage(telegramUpdate);
    }
    catch (error) {
        console.log(error);
    }
});
exports.signOnUser = (telegramUpdate) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield firebaseService.addUser(telegramUpdate);
    }
    catch (error) {
        console.log(error);
    }
});
