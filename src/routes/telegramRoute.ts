import express, { Request, Response, NextFunction } from 'express';
import { TelegramUpdate } from "../interfaces/TelegramUpdate";

const router = express.Router();
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
    .catch((err: Error) => console.log(err));
// Receive messages via event callback
api.on('update', (update: TelegramUpdate) => { // update object is defined at: https://core.telegram.org/bots/api#update
    console.log('update: ', update);
    handleCommands(update); // handle all telegram bot commands
});

/* eslint-disable indent */
function handleCommands(update: TelegramUpdate) { // google cloud functions?

    switch (update.message?.text) {
        case '/getbrands':
            handleGetBrands(update);
            break;
        case '/start':
            handleSignOnUser(update);
            break;
        default:
            break;
    }
}

function handleGetBrands(update: TelegramUpdate) {
    telegramController.getBrands(update);
}

async function handleSignOnUser(update: TelegramUpdate) {
    await telegramController.signOnUser(update);
}

module.exports = router; // Export this as a module, so that the router is accessible from index.
