const urls = require('../utils/urls');
const sendUpdate = require('./sendUpdate');

function handleCommands(request) {
    console.log('message is: ', request.message.text);
    switch (request.message.text) {
        case '/brands':
            handleGetBrands(request);
            break;
        default:
    }
}

function handleGetBrands(request) {
    const response = {
        chatId: request.message.from.id,
        text: urls.URLS.JD_ALL_MEN,
    };
    sendUpdate.sendMessage(response);
}

module.exports = { handleCommands };

// update:  {
//     update_id: 115173346,
//     message: {
//       message_id: 3031,
//       from: {
//         id: 905610727,
//         is_bot: false,
//         first_name: 'Jahan',
//         last_name: 'U',
//         language_code: 'en'
//       },
//       chat: {
//         id: 905610727,
//         first_name: 'Jahan',
//         last_name: 'U',
//         type: 'private'
//       },
//       date: 1637351295,
//       text: '/brands',
//       entities: [ [Object] ]
//     }
//   }
