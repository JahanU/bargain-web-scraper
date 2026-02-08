import Item from "../interfaces/Item";

export interface ItemFilterOptions {
    search: string;
    minDiscount: number;
    sizes: string[];
    priceHighToLow: boolean | null;
    discountHighToLow: boolean | null;
}

function normalizeSearchTerm(value: string): string {
    return value.trim().toLowerCase();
}

function getPriceValue(value: string): number {
    const normalizedPrice = value.replace(/[^0-9.]+/g, "");
    return Number.parseFloat(normalizedPrice) || 0;
}

function filterBySearch(items: Item[], search: string): Item[] {
    const normalizedSearch = normalizeSearchTerm(search);

    if (!normalizedSearch) {
        return [...items];
    }

    return items.filter((item: Item) => item.name.toLowerCase().includes(normalizedSearch));
}

function filterByDiscount(items: Item[], minDiscount: number): Item[] {
    return items.filter((item: Item) => item.discount >= minDiscount);
}

function filterBySizes(items: Item[], sizes: string[]): Item[] {
    if (sizes.length === 0) {
        return [...items];
    }

    const selectedSizes = new Set(sizes);
    return items.filter((item: Item) => item.sizes?.some((size) => selectedSizes.has(size)));
}

function priceSort(filter: boolean, items: Item[]) {
    if (filter) {
        // Sort Desc
        return [...items].sort((a, b) => getPriceValue(b.nowPrice) - getPriceValue(a.nowPrice));
    }

    return [...items].sort((a, b) => getPriceValue(a.nowPrice) - getPriceValue(b.nowPrice));
}

function discountSort(discountHighToLow: boolean, items: Item[]) {
    if (discountHighToLow) {
        // Sort Desc
        return [...items].sort((a, b) => b.discount - a.discount);
    }

    return [...items].sort((a, b) => a.discount - b.discount);
}

function genderSort(gender: boolean, allItems: Item[]) {
    if (gender) {
        // Gender -> male = true, female = false
        return [...allItems].filter((item: Item) => item.gender === "Male");
    }

    return [...allItems].filter((item: Item) => item.gender === "Female");
}

function discountSlider(search: string, discount: number, allItems: Item[]) {
    return filterByDiscount(filterBySearch(allItems, search), discount);
}

function searchInput(search: string, discount: number, allItems: Item[], filteredItems: Item[]) {
    const normalizedSearch = normalizeSearchTerm(search);
    const source = filteredItems.length ? filteredItems : allItems;

    if (normalizedSearch) {
        return filterBySearch(source, normalizedSearch);
    }

    return filterByDiscount(allItems, discount);
}

function sizeFilter(sizes: string[], discount: number, allItems: Item[]) {
    const discountedItems = filterByDiscount(allItems, discount);
    return filterBySizes(discountedItems, sizes);
}

function applyItemFilters(items: Item[], options: ItemFilterOptions): Item[] {
    let filteredItems = filterBySearch(items, options.search);
    filteredItems = filterByDiscount(filteredItems, options.minDiscount);
    filteredItems = filterBySizes(filteredItems, options.sizes);

    if (options.priceHighToLow !== null) {
        return priceSort(options.priceHighToLow, filteredItems);
    }

    if (options.discountHighToLow !== null) {
        return discountSort(options.discountHighToLow, filteredItems);
    }

    return filteredItems;
}

export { priceSort, discountSort, genderSort, discountSlider, sizeFilter, searchInput, applyItemFilters };
