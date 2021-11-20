// TODO Ping (telegram bot) when discount is v high (say 75%+)
const TG = require('telegram-bot-api');

const api = new TG({ token: process.env.TELEGRAM_API });

// https://core.telegram.org/bots/api#sendphoto
function sendPhotosToBot(items) {
    for (let i = 0; i < items.length; i++) {
        sendPhotos(items[i]);
    }
}

function sendPhotos(i) { // .itemName, .wasPrice, .nowPrice, .discount, .url, .imageUrl, .sizes
    // const arr = [process.env.CHAT_ID_JAHAN, 1073999480];
    const arr = [];
    arr.forEach((chatId) => {
        api.sendPhoto({
            chat_id: chatId,
            caption: `Name: ${i.itemName} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}+% \nSize: ${i.sizes} \nLink: ${i.url}`,
            photo: i.imageUrl,
        }).catch((err) => console.log(err));
    });
}

function sendMessage(response) {
    console.log('sending back: ', response);

    api.sendMessage({
        chat_id: response.chatId,
        text: response.text,
    }).catch((err) => console.log(err));
}

module.exports = { sendPhotosToBot, sendMessage };
