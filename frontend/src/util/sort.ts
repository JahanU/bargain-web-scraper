import Item from "../interfaces/Item";
import { Sort } from "../interfaces/Sort";

export interface ItemFilterOptions {
  search: string;
  minDiscount: number;
  sizes: string[];
  sort: Sort | null;
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

function priceSort(highToLow: boolean, items: Item[]) {
  if (highToLow) {
    return [...items].sort((a, b) => getPriceValue(b.nowPrice) - getPriceValue(a.nowPrice));
  }

  return [...items].sort((a, b) => getPriceValue(a.nowPrice) - getPriceValue(b.nowPrice));
}

function discountSort(highToLow: boolean, items: Item[]) {
  if (highToLow) {
    return [...items].sort((a, b) => b.discount - a.discount);
  }

  return [...items].sort((a, b) => a.discount - b.discount);
}

function applyItemFilters(items: Item[], options: ItemFilterOptions): Item[] {
  let filteredItems = filterBySearch(items, options.search);
  filteredItems = filterByDiscount(filteredItems, options.minDiscount);
  filteredItems = filterBySizes(filteredItems, options.sizes);

  switch (options.sort) {
    case Sort.priceHighToLow:
      return priceSort(true, filteredItems);
    case Sort.priceLowToHigh:
      return priceSort(false, filteredItems);
    case Sort.discountHighToLow:
      return discountSort(true, filteredItems);
    case Sort.discountLowToHigh:
      return discountSort(false, filteredItems);
    default:
      return filteredItems;
  }
}

export { priceSort, discountSort, applyItemFilters };
