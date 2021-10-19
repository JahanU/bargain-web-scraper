// TODO remove unneeded elements (football t shirts, caps etc)
// Remove words such as: [FC, NBA, Home, hip, gloves]
function removeUnnecessaryItem(itemName) {
    let dislikedItems = ['fc', 'nba', 'home', 'hip', 'gloves', 'cap', 'training'];
    return dislikedItems.find(badWord => itemName.includes(badWord));
}

// TODO Create highest discount filter/sort (mainly for myself to reach, not being used for performance)
function sortByDiscount(items) {

    const sortedItems = items.sort((a, b) => b.discount - a.discount);
    console.log(sortedItems);
}

module.exports = { removeUnnecessaryItem, sortByDiscount }