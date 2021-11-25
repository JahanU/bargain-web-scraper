const urls = require('./urls');

// get request from telegram and convert it into the same cols as firebase + better readability
module.exports = (req, res, next) => {
    console.log('telegram parser');
    return {
        telegramId: req.message.from.id,
        fullName: req.message.from.first_name.concat(' ', req.message.from.last_name),
        reqFromUser: req.message.text,
        resToUser: '',
    };
};

// NOTE:
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
