// @ts-ignore — telegram-bot-api has no type declarations
import TG from 'telegram-bot-api';
import type { TelegramUpdate } from '../interfaces/TelegramUpdate';
import type { Item } from '../interfaces/Item';
import type { FirebaseUser } from '../interfaces/FirebaseUser';
import * as firebaseService from './firebaseService';

const api = new TG({ token: process.env.TELEGRAM_API });

export async function sendPhotosToUsers(items: Item[]) {

    // const users = await firebaseService.getUsers();

    const users = [{
        telegramId: process.env.CHAT_ID_JAHAN,
        fullName: 'Jahan',
    }];

    items.forEach((i: Item) => { // .itemName, .wasPrice, .nowPrice, .discount, .url, .imageUrl, .sizes
        users.forEach((u: any) => {
            api.sendPhoto({ // https://core.telegram.org/bots/api#sendphoto
                chat_id: u.telegramId,
                caption: `Name: ${i.name} \nPrice: ${i.nowPrice} \nDiscount: ${i.discount}+% \nSize: ${i.sizes} \nLink: ${i.url}`,
                photo: i.imageUrl,
            }).catch((err: Error) => console.log(err));
        });
    });
}

export function sendMessage(telegramUpdate: TelegramUpdate) {
    api.sendMessage({
        chat_id: telegramUpdate.message?.from.id,
        text: telegramUpdate.response_to_user,
    }).catch((err: Error) => console.log(err));
}
