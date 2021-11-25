const URLS = require('../helper/urls');
const firebaseService = require('../services/firebaseService');
const telegramService = require('../services/telegramService');

// Not the best use of controllers but keeps it consistent with the other controllers.
// Works pretty well

exports.getBrands = async (reqUser) => { // /getBrands command
    try {
        // eslint-disable-next-line no-param-reassign
        reqUser.resToUser = URLS.JD_ALL_MEN;
        telegramService.sendMessage(reqUser);
    } catch (error) {
        console.log(error);
    }
};

exports.signOnUser = async (reqUser) => { // /start command
    try {
        await firebaseService.addUser(reqUser);
    } catch (error) {
        console.log(error);
    }
};
