import { Item } from "../interfaces/Item";

// remove unneeded elements (football t shirts, caps etc)
module.exports = (itemName: string) => {
    const dislikedItems = ['fc', 'nba', 'home', 'hip', 'gloves', 'cap', 'training', 'away',
        'team', 'gb', 'england', 'scotland', 'wales', 'ireland', 'basketball', 'football'];
    return dislikedItems.find((badWord) => itemName.includes(badWord));
};
