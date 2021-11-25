const TG = require('telegram-bot-api');

const api = new TG({ token: process.env.TELEGRAM_API });

async function sendPhotosToUsers(items) {
    // const users = await firebaseService.getUsers(); // TODO cache this, cache items too? User.length * item.length = O(n*m)
    const users = [{
        telegramId: 905610727,
    }];
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
