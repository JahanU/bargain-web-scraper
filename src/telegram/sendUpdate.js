// // TODO Ping (telegram bot) when discount is v high (say 75%+)
// const TG = require('telegram-bot-api');
// const firebase = require('./firebase');

// const api = new TG({ token: process.env.TELEGRAM_API });

// async function sendPhotosToBot(items) {
//     // const users = await firebase.getUsers(); // TODO cache this, cache items too? User.length * item.length = O(n*m)
//     const users = [905610727];
//     items.forEach((item) => sendPhotos(item, users));
// }

// // https://core.telegram.org/bots/api#sendphoto
// function sendPhotos(i, users) { // .itemName, .wasPrice, .nowPrice, .discount, .url, .imageUrl, .sizes
//     users.forEach((user) => {
//         api.sendPhoto({
//             chat_id: user.telegramId,
//             caption: `Name: ${i.itemName} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}+% \nSize: ${i.sizes} \nLink: ${i.url}`,
//             photo: i.imageUrl,
//         }).catch((err) => console.log(err));
//     });
// }

// function sendMessage(user) {
//     console.log(`sending back resp to user: ${user.chatId} - ${user}`);
//     api.sendMessage({
//         chat_id: user.telegramId,
//         text: user.responseBack,
//     }).catch((err) => console.log(err));
// }

// module.exports = { sendPhotosToBot, sendMessage };
