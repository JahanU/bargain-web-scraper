const express = require('express');

const router = express.Router();
const TG = require('telegram-bot-api');
const telegramMiddleware = require('../helper/telegramParser');
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
    .catch(console.err);
// Receive messages via event callback
api.on('update', (update) => { // update object is defined at: https://core.telegram.org/bots/api#update
    handleCommands(update); // handle all telegram bot commands
});

/* eslint-disable indent */
function handleCommands(request) { // google cloud functions?
    const user = telegramMiddleware(request);
    console.log(user);
    switch (user.reqFromUser) {
        case '/getbrands':
            handleGetBrands(user);
            break;
        case '/start':
            handleSignOnUser(user);
            break;
        default:
            break;
    }
}

function handleGetBrands(user) { // works for now cos when deserialised, all get given the same response message
    telegramController.getBrands(user);
}

async function handleSignOnUser(user) {
    await telegramController.signOnUser(user);
}

module.exports = router; // Export this as a module, so that the router is accessible from index.
