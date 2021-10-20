// TODO Ping (telegram bot) when discount is v high (say 75%+)
const TG = require('telegram-bot-api')
const fs = require('fs')

const api = new TG({
    token: process.env.TELEGRAM_API
})

// https://core.telegram.org/bots/api#sendphoto
async function sendPhoto() {

    await api.sendPhoto({
        chat_id: process.env.CHAT_ID,
        caption: 'Price: x \nReduction: y \nLink: x',
        photo: 'https://i8.amplience.net/t/jpl/jd_product_list?plu=jd_381398_al&qlt=92&w=363&h=363&v=1&fmt=auto.png'
    }).catch((err) => console.log(err))

}

sendPhoto();

// module.exports = { pingBot }