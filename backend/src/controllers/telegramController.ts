import { TelegramUpdate } from "../interfaces/TelegramUpdate";

const URLS = require('../helper/urls');
const firebaseService = require('../services/firebaseService');
const telegramService = require('../services/telegramService');

// Not the best use of controllers but keeps it consistent with the other controllers.
// Works pretty well
exports.getBrands = async (telegramUpdate: TelegramUpdate) => { // /getBrands command
    try {
        // eslint-disable-next-line no-param-reassign
        telegramUpdate.response_to_user = URLS.JD_ALL_MEN + '\n\n' + URLS.SHOES;
        telegramService.sendMessage(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};

exports.signOnUser = async (telegramUpdate: TelegramUpdate) => { // /start command
    try {
        await firebaseService.addUser(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};
