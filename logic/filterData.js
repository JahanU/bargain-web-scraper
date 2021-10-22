// remove unneeded elements (football t shirts, caps etc)
function removeUnnecessaryItem(itemName) {
    let dislikedItems = ['fc', 'nba', 'home', 'hip', 'gloves', 'cap', 'training', 'away', 'team', 'gb', 'england', 'scotland', 'wales'];
    return dislikedItems.find(badWord => itemName.includes(badWord));
}

// Create highest discount filter/sort (mainly for myself to reach, not being used for performance)
function sortByDiscount(items) {
    const deepCopy = JSON.parse(JSON.stringify(items));
    let sortedItems = deepCopy.sort((a, b) => a.discount - b.discount);
    sortedItems.forEach((item) => item.discount = item.discount + '%');
    return sortedItems;
}


module.exports = { removeUnnecessaryItem, sortByDiscount }
