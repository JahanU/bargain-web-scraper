import { Hono } from 'hono';
import type { TelegramUpdate } from '../interfaces/TelegramUpdate';
import * as telegramController from '../controllers/telegramController';

// @ts-ignore — telegram-bot-api has no type declarations
import TG from 'telegram-bot-api';

export const telegramRoute = new Hono();

const api = new TG({ token: process.env.TELEGRAM_API });
const mp = new TG.GetUpdateMessageProvider();

telegramRoute.get('/', (c) => {
    return c.text('on telegram home');
});

api.setMessageProvider(mp);
api.start()
    .then(() => {
        console.log('Telegram Message handler API started');
    })
    .catch((err: Error) => console.log(err));

// Receive messages via event callback
api.on('update', (update: TelegramUpdate) => {
    console.log('update: ', update);
    handleCommands(update);
});

/* eslint-disable indent */
function handleCommands(update: TelegramUpdate) {
    switch (update.message?.text) {
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

function handleGetBrands(update: TelegramUpdate) {
    telegramController.getBrands(update);
}

async function handleSignOnUser(update: TelegramUpdate) {
    await telegramController.signOnUser(update);
}

async function handleCodeProject(update: TelegramUpdate) {
    await telegramController.seeCodeProject(update);
}

async function handleGetWebsite(update: TelegramUpdate) {
    await telegramController.getWebsite(update);
}
