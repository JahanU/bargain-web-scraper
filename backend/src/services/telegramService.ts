const TG = require('telegram-bot-api');
import { TelegramUpdate, User } from "../interfaces/TelegramUpdate";
import { Item } from "../interfaces/Item";
import { FirebaseUser } from "../interfaces/FirebaseUser";
const firebaseService = require("../services/firebaseService");

const api = new TG({ token: process.env.TELEGRAM_API });

async function sendPhotosToUsers(items: Item[]) {

    // const users = await firebaseService.getUsers();

    const users = [{
        telegramId: process.env.CHAT_ID_JAHAN,
        fullName: 'Jahan',
    }];

    items.forEach((i) => { // .itemName, .wasPrice, .nowPrice, .discount, .url, .imageUrl, .sizes
        users.forEach((u) => {
            api.sendPhoto({ // https://core.telegram.org/bots/api#sendphoto
                chat_id: u.telegramId,
                caption: `Name: ${i.name} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}+% \nSize: ${i.sizes} \nLink: ${i.url}`,
                photo: i.imageUrl,
            }).catch((err: Error) => console.log(err));
        });
    });
}

function sendMessage(telegramUpdate: TelegramUpdate) {
    api.sendMessage({
        chat_id: telegramUpdate.message?.from.id,
        text: telegramUpdate.response_to_user,
    }).catch((err: Error) => console.log(err));
}

module.exports = { sendPhotosToUsers, sendMessage };
