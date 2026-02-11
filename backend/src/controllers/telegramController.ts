import { TelegramUpdate } from '../interfaces/TelegramUpdate';
import { URLS } from '../helper/urls';
import * as firebaseService from '../services/firebaseService';
import * as telegramService from '../services/telegramService';

// Not the best use of controllers but keeps it consistent with the other controllers.
// Works pretty well - Maybe move into TelegramService

/*
    Start
    /command1 - see brands being searched
    /command2 - Github link
    /command3 - Website link
*/

// Start
export const signOnUser = async (telegramUpdate: TelegramUpdate) => {
    try {
        await firebaseService.addUser(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};

// C1
export const getBrands = async (telegramUpdate: TelegramUpdate) => {
    try {
        telegramUpdate.response_to_user = URLS.JD_ALL_MEN + '\n\n' + URLS.SHOES;
        telegramService.sendMessage(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};

// C2
export const seeCodeProject = async (telegramUpdate: TelegramUpdate) => {
    try {
        telegramUpdate.response_to_user = 'https://github.com/JahanU/bargain-web-scraper';
        telegramService.sendMessage(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};

// C3
export const getWebsite = async (telegramUpdate: TelegramUpdate) => {
    try {
        telegramUpdate.response_to_user = 'https://bargain-scraper.netlify.app/';
        telegramService.sendMessage(telegramUpdate);
    } catch (error) {
        console.log(error);
    }
};