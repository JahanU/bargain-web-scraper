// /* eslint-disable indent */
// const urls = require('../helper/urls');
// const sendUpdate = require('./sendUpdate');
// const firebase = require('./firebase');

// function handleCommands(request) {
//     const user = deserialiseUserFromRequest(request);
//     switch (user.textFromUser) {
//         case '/brands':
//             handleGetBrands(user);
//             break;
//         case '/start':
//             signOnUser(user);
//             break;
//         default:
//             break;
//     }
// }

// function deserialiseUserFromRequest(request) {
//     return {
//         telegramId: request.message.from.id,
//         fullName: request.message.from.first_name.concat(' ', request.message.from.last_name),
//         textFromUser: request.message.text,
//         responseBack: urls.URLS.JD_ALL_MEN,
//     };
// }

// function handleGetBrands(user) {
//     sendUpdate.sendMessage(user);
// }

// async function signOnUser(user) {
//     try {
//         await firebase.addUser(user);
//     } catch (err) {
//         console.log(err);
//     }
// }

// // function defaultCommand(request) {
// //     const message =
// // }

// module.exports = { handleCommands };

// // update:  {
// //     update_id: 115173346,
// //     message: {
// //       message_id: 3031,
// //       from: {
// //         id: 905610727,
// //         is_bot: false,
// //         first_name: 'Jahan',
// //         last_name: 'U',
// //         language_code: 'en'
// //       },
// //       chat: {
// //         id: 905610727,
// //         first_name: 'Jahan',
// //         last_name: 'U',
// //         type: 'private'
// //       },
// //       date: 1637351295,
// //       text: '/brands',
// //       entities: [ [Object] ]
// //     }
// //   }
