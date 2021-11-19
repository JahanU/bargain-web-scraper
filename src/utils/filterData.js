// remove unneeded elements (football t shirts, caps etc)
function removeUnneededItem(itemName) {
    const dislikedItems = ['fc', 'nba', 'home', 'hip', 'gloves', 'cap', 'training', 'away',
        'team', 'gb', 'england', 'scotland', 'wales', 'ireland', 'basketball', 'football'];
    return dislikedItems.find((badWord) => itemName.includes(badWord));
}

module.exports = { removeUnneededItem };