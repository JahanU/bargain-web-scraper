// TODO Ping (telegram bot) when discount is v high (say 75%+)
const TG = require('telegram-bot-api')
const fs = require('fs')

const api = new TG({
    token: process.env.TELEGRAM_API
})

// https://core.telegram.org/bots/api#sendphoto
function sendPhotosToBot(items) {
    for (let i = 0; i < items.length; i++) {
        sendPhoto(items[i]);
    }
}

function sendPhoto(i) { // .itemName, .wasPrice, .nowPrice, .discount, .url, .imageUrl
    console.log(i)

    let arr = [process.env.CHAT_ID_SHIRAZ, process.env.CHAT_ID];
    arr.forEach((chatId) => {
        api.sendPhoto({
            chat_id: chatId,
            caption: `Name: ${i.itemName} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}% \nLink: ${i.url}`,
            photo: i.imageUrl
        }).catch((err) => console.log(err))
    });

}

module.exports = { sendPhotosToBot }