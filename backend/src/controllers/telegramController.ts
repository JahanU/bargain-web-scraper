import { TelegramUpdate } from "../interfaces/TelegramUpdate";

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
exports.signOnUser = async (telegramUpdate: TelegramUpdate) => { // /start command
    try {
        await firebaseService.addUser(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};

// C1
exports.getBrands = async (telegramUpdate: TelegramUpdate) => { // /getBrands command
    try {
        telegramUpdate.response_to_user = URLS.JD_ALL_MEN + '\n\n' + URLS.SHOES;
        telegramService.sendMessage(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};

// C2
exports.seeCodeProject = async (telegramUpdate: TelegramUpdate) => { // /seeCode command
    try {
        telegramUpdate.response_to_user = 'https://github.com/JahanU/bargain-web-scraper';
        telegramService.sendMessage(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};

// C3
exports.getWebsite = async (telegramUpdate: TelegramUpdate) => { // /getWebsite command
    try {
        telegramUpdate.response_to_user = 'https://bargain-scraper.netlify.app/';
        telegramService.sendMessage(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};