"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// remove unneeded elements (football t shirts, caps etc)
module.exports = (itemName) => {
    const dislikedItems = ['fc', 'nba', 'home', 'hip', 'gloves', 'cap', 'training', 'away',
        'team', 'gb', 'england', 'scotland', 'wales', 'ireland', 'basketball', 'football'];
    return dislikedItems.find((badWord) => itemName.includes(badWord));
};
