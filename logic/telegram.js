// TODO Ping (telegram bot) when discount is v high (say 75%+)
const TG = require('telegram-bot-api');

const api = new TG({
    token: process.env.TELEGRAM_API,
});

// https://core.telegram.org/bots/api#sendphoto
function sendPhotosToBot(items) {
    for (let i = 0; i < items.length; i++) {
        sendPhoto(items[i]);
    }
}

function sendPhoto(i) { // .itemName, .wasPrice, .nowPrice, .discount, .url, .imageUrl, .sizes
    const arr = [process.env.CHAT_ID_JAHAN, process.env.CHAT_ID_SHIRAZ];
    // let arr = [process.env.CHAT_ID_JAHAN];
    // let arr = [];
    arr.forEach((chatId) => {
        api.sendPhoto({
            chat_id: chatId,
            caption: `Name: ${i.itemName} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}+% \nSize: ${i.sizes} \nLink: ${i.url}`,
            photo: i.imageUrl,
        }).catch((err) => console.log(err));
    });
}

module.exports = { sendPhotosToBot };
