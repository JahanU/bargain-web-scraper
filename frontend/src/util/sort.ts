
import Item from "../interfaces/Item";

function priceSort(filter: boolean, items: Item[]) {
    if (filter)// Sort Desc // TODO: Parse type for quick fix until backend is updated
        return [...items].sort((a, b) => parseInt(b.nowPrice.substring(1)) - parseInt(a.nowPrice.substring(1)));
    else
        return [...items].sort((a, b) => parseInt(a.nowPrice.substring(1)) - parseInt(b.nowPrice.substring(1)));
}
function discountSort(discountHighToLow: boolean, items: Item[]) {
    if (discountHighToLow)// Sort Desc
        return [...items].sort((a, b) => b.discount - a.discount);
    else
        return [...items].sort((a, b) => a.discount - b.discount);
}
function genderSort(gender: boolean, allItems: Item[]) {
    if (gender)
        // Gender -> male = true, female = false
        return [...allItems].filter((item: Item) => item.gender === "Male");
    else
        return [...allItems].filter((item: Item) => item.gender === "Female");
}
function discountSlider(search: string, discount: number, allItems: Item[]) {
    if (search)
        return [...allItems].filter((item: Item) => item.name.toLowerCase().includes(search) && item.discount >= discount);
    else
        return [...allItems].filter((item: Item) => item.discount >= discount);
}
function searchInput(search: string, discount: number, allItems: Item[], filteredItems: Item[]) {
    if (search)
        return [...filteredItems].filter((item: Item) => item.name.toLowerCase().includes(search));
    else if (search)
        return [...allItems].filter((item: Item) => item.name.toLowerCase().includes(search));
    else
        return [...allItems].filter((item: Item) => item.discount >= discount);
}

function sizeFilter(sizes: string[], discount: number, allItems: Item[]) {
    if (sizes.length > 0) {
        let filteredItems: Item[] = [];
        for (const item of allItems) {
            if (item.sizes)
                for (const size of sizes) {
                    if (item.sizes.includes(size)) {
                        filteredItems.push(item);
                        break;
                    }
                };
        };
        return filteredItems;
    }

    else
        return [...allItems].filter((item: Item) => item.discount >= discount);
}

export { priceSort, discountSort, genderSort, discountSlider, sizeFilter, searchInput };
