/* eslint-disable indent */
const TG = require('telegram-bot-api');

const telegramMiddleware = require('../helper/telegramParse');
const firebaseService = require('./firebaseService');

const api = new TG({ token: process.env.TELEGRAM_API });
const mp = new TG.GetUpdateMessageProvider(); // Define your message provider

api.setMessageProvider(mp); // Set message provider and start API
api.start()
    .then(() => {
        console.log('Telegram Message handler API started');
    })
    .catch(console.err);
// Receive messages via event callback
api.on('update', (update) => { // update object is defined at: https://core.telegram.org/bots/api#update
    handleCommands(update);
});

function handleCommands(request) { // google cloud functions?
    const user = telegramMiddleware(request);
    switch (user.reqFromUser) {
        case '/brands':
            handleGetBrands(user);
            break;
        case '/start':
            signOnUser(user);
            break;
        default:
            break;
    }
}

function handleGetBrands(user) { // works for now cos when deserialised, all get given the same response message
    sendMessage(user);
}

async function signOnUser(user) {
    await firebaseService.addUser(user);
}

async function sendPhotosToUsers(items) {
    const users = await firebaseService.getUsers(); // TODO cache this, cache items too? User.length * item.length = O(n*m)

    // const users = [{
    //     telegramId: 905610727,
    // }];

    items.forEach((i) => { // .itemName, .wasPrice, .nowPrice, .discount, .url, .imageUrl, .sizes
        users.forEach((u) => {
            api.sendPhoto({ // https://core.telegram.org/bots/api#sendphoto
                chat_id: u.telegramId,
                caption: `Name: ${i.itemName} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}+% \nSize: ${i.sizes} \nLink: ${i.url}`,
                photo: i.imageUrl,
            }).catch((err) => console.log(err));
        });
    });
}

function sendMessage(user) {
    console.log(`sending back resp to user: ${user.telegramId} - ${user.fullName}`);
    api.sendMessage({
        chat_id: user.telegramId,
        text: user.resToUser,
    }).catch((err) => console.log(err));
}

module.exports = { sendPhotosToUsers, sendMessage };
