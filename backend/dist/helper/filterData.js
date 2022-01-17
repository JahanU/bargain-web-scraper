"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// remove unneeded elements (football t shirts, caps etc)
module.exports = (itemName) => {
    const dislikedItems = ['fc', 'nba', 'home', 'hip', 'gloves', 'cap', 'training', 'away',
        'team', 'gb', 'england', 'scotland', 'wales', 'ireland', 'basketball', 'football',
        'milan', 'inter', 'juventus', 'roma', 'liverpool', 'chelsea', 'arsenal', 'manchester',
        'manchester city', 'barcelona', 'bayern', 'bayern munich', 'juventus', 'real', 'bayern',
        'houston', 'atlanta', 'boston', 'chicago', 'charlotte', 'cleveland', 'dallas', 'denver', 'jacksonville',];
    return dislikedItems.find((badWord) => itemName.includes(badWord));
};
