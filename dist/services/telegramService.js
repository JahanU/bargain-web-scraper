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
const TG = require('telegram-bot-api');
const api = new TG({ token: process.env.TELEGRAM_API });
function sendPhotosToUsers(items) {
    return __awaiter(this, void 0, void 0, function* () {
        // const users = await firebaseService.getUsers(); // TODO cache this, cache items too? User.length * item.length = O(n*m)
        const users = [{
                telegramId: 905610727,
            }];
        items.forEach((i) => {
            users.forEach((u) => {
                api.sendPhoto({
                    chat_id: u.telegramId,
                    caption: `Name: ${i.name} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}+% \nSize: ${i.sizes} \nLink: ${i.url}`,
                    photo: i.imageUrl,
                }).catch((err) => console.log(err));
            });
        });
    });
}
function sendMessage(telegramUpdate) {
    var _a;
    api.sendMessage({
        chat_id: (_a = telegramUpdate.message) === null || _a === void 0 ? void 0 : _a.from.id,
        text: telegramUpdate.response_to_user,
    }).catch((err) => console.log(err));
}
module.exports = { sendPhotosToUsers, sendMessage };
