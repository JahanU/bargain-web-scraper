// TODO Ping (telegram bot) when discount is v high (say 75%+)
const TG = require('telegram-bot-api')
const fs = require('fs')

const api = new TG({
    token: process.env.TELEGRAM_API
})

// https://core.telegram.org/bots/api#sendphoto

async function sendPhotosToBot(items) {
    for (let i = 0; i < items.length; i++) {
        await sendPhoto(items[i]);
    }
}

async function sendPhoto(i) { // .itemName, .wasPrice, .nowPrice, .discount, .url, .imageUrl
    console.log(i)
    await api.sendPhoto({
        chat_id: process.env.CHAT_ID,
        caption: `Name: ${i.itemName} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}% \nLink: ${i.url}`,
        photo: i.imageUrl
    }).catch((err) => console.log(err))
}

module.exports = { sendPhotosToBot }