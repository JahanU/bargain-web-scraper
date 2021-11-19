const TG = require('telegram-bot-api');
const sendUpdate = require('./sendUpdate');

const api = new TG({
    token: process.env.TELEGRAM_API,
});

// Define your message provider
const mp = new TG.GetUpdateMessageProvider();

// Set message provider and start API
api.setMessageProvider(mp);
api.start()
    .then(() => {
        console.log('Telegram Message handler API started');
    })
    .catch(console.err);

// Receive messages via event callback
api.on('update', (update) => {
    // update object is defined at
    // https://core.telegram.org/bots/api#update
    console.log('update: ', update);
});

const sendPhotosToBot = (newDeals) => sendUpdate.sendPhotosToBot(newDeals);
const test = () => console.log('test');

module.exports = { sendPhotosToBot, test };
