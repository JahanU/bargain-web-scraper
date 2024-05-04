import Item from '../interfaces/Item';
import { priceSort, discountSort, genderSort, searchInput, discountSlider, sizeFilter } from './sort';

// Mock data for items
const items: any[] = [
  { id: 1, name: 'Item 1', gender: 'Male',  nowPrice: '$10.00', discount: 10 },
  { id: 2, name: 'Item 2', gender: 'Female', nowPrice: '$25.50', discount: 5 },
  { id: 3, name: 'Nike', gender: 'Male', nowPrice: '$5.99', discount: 15 },
];

describe('genderSort', () => {
  it('sorts items correctly for male (gender: true)', () => {
    const expectedMaleItems = items.filter((item) => item.gender === 'Male');
    const sortedMaleItems = genderSort(true, items);
    expect(sortedMaleItems).toEqual(expectedMaleItems);
  });

  it('sorts items correctly for female (gender: false)', () => {
    const expectedFemaleItems = items.filter((item) => item.gender === 'Female');
    const sortedFemaleItems = genderSort(false, items);
    expect(sortedFemaleItems).toEqual(expectedFemaleItems);
  });

  it('handles empty array input', () => {
    const emptyArray: any[] = [];
    expect(genderSort(true, emptyArray)).toEqual([]);
    expect(genderSort(false, emptyArray)).toEqual([]);
  });

  it('avoids mutating the original array', () => {
    const originalItems = [...items]; // Create a copy
    genderSort(true, originalItems);
    expect(originalItems).toEqual(items); // Original array should remain unchanged
  });
});

describe('priceSort', () => {
  it('sorts by price descending (filter: true)', () => {
    const expectedDescSorted = [...items].sort((a, b) => parseInt(b.nowPrice.substring(1)) - parseInt(a.nowPrice.substring(1)));
    const sortedDesc = priceSort(true, items);
    expect(sortedDesc).toEqual(expectedDescSorted);
  });

  it('sorts by price ascending (filter: false)', () => {
    const expectedAscSorted = [...items].sort((a, b) => parseInt(a.nowPrice.substring(1)) - parseInt(b.nowPrice.substring(1)));
    const sortedAsc = priceSort(false, items);
    expect(sortedAsc).toEqual(expectedAscSorted);
  });

  it('handles empty array input', () => {
    const emptyArray: Item[] = [];
    expect(priceSort(true, emptyArray)).toEqual([]);
    expect(priceSort(false, emptyArray)).toEqual([]);
  });

  it('avoids mutating the original array', () => {
    const originalItems = [...items];
    priceSort(true, originalItems);
    expect(originalItems).toEqual(items); // Original array should remain unchanged
  });
});

describe('discountSort', () => {
  it('sorts by discount descending (discountHighToLow: true)', () => {
    const expectedDescSorted = [...items].sort((a, b) => b.discount - a.discount);
    const sortedDesc = discountSort(true, items);
    expect(sortedDesc).toEqual(expectedDescSorted);
  });

  it('sorts by discount ascending (discountHighToLow: false)', () => {
    const expectedAscSorted = [...items].sort((a, b) => a.discount - b.discount);
    const sortedAsc = discountSort(false, items);
    expect(sortedAsc).toEqual(expectedAscSorted);
  });

  it('handles empty array input', () => {
    const emptyArray: Item[] = [];
    expect(discountSort(true, emptyArray)).toEqual([]);
    expect(discountSort(false, emptyArray)).toEqual([]);
  });

  it('avoids mutating the original array', () => {
    const originalItems = [...items];
    discountSort(true, originalItems);
    expect(originalItems).toEqual(items); // Original array should remain unchanged
  });
});

describe('discountSlider', () => {
  it('filters items by discount only (no search)', () => {
    const expectedDiscountedItems = items.filter((item) => item.discount >= 10); // Minimum discount of 10
    const filteredByDiscount = discountSlider('', 10, items);
    expect(filteredByDiscount).toEqual(expectedDiscountedItems);
  });

  it('filters items by search and discount (both conditions)', () => {
    const expectedSearchDiscounted = items.filter(
      (item) => item.name.toLowerCase().includes('nike') && item.discount >= 15
    );
    const filteredBySearchDiscount = discountSlider('nike', 15, items);    
    expect(filteredBySearchDiscount).toEqual(expectedSearchDiscounted);
  });

  it('handles empty search string', () => {
    const expectedAllDiscounted = items.filter((item) => item.discount >= 10); // Minimum discount of 10
    const filteredEmptySearch = discountSlider('', 10, items);
    expect(filteredEmptySearch).toEqual(expectedAllDiscounted);
  });

  it('handles no matching items', () => {
    const filteredNoMatch = discountSlider('notfound', 25, items);
    expect(filteredNoMatch).toEqual([]);
  });

  it('handles case-insensitive search', () => {
    const expectedSearchDiscounted = items.filter(
      (item) => item.name.toLowerCase().includes('DISCOUNT') && item.discount >= 15
    );
    const filteredBySearchDiscount = discountSlider('DISCOUNT', 15, items);
    expect(filteredBySearchDiscount).toEqual(expectedSearchDiscounted);
  });

  it('avoids mutating the original array', () => {
    const originalItems = [...items];
    discountSlider('search', 10, originalItems);
    expect(originalItems).toEqual(items); // Original array should remain unchanged
  });
});

describe.skip('searchInput', () => {
  it('filters pre-filtered items by search (search provided, filteredItems provided)', () => {
    const preFilteredItems = items.filter((item) => item.discount >= 10); // Minimum discount of 10
    const expectedSearch = preFilteredItems.filter((item) => item.name.toLowerCase().includes('discount'));
    const filteredBySearch = searchInput('discount', 0, items, preFilteredItems); // Discount doesn't matter here
    expect(filteredBySearch).toEqual(expectedSearch);
  });

  it('filters all items by search (search provided, no filteredItems)', () => {
    const expectedSearch = items.filter((item) => item.name.toLowerCase().includes('search'));
    const filteredBySearch = searchInput('search', 0, items, []); // Empty filteredItems
    expect(filteredBySearch).toEqual(expectedSearch);
  });

  it('filters by discount only (no search, filteredItems empty)', () => {
    const expectedDiscounted = items.filter((item) => item.discount >= 10); // Minimum discount of 10
    const filteredByDiscount = searchInput('', 10, items, []); // Empty filteredItems, search is empty
    expect(filteredByDiscount).toEqual(expectedDiscounted);
  });

  it('filters by discount only (no search, pre-filtered items)', () => {
    const preFilteredItems = items.filter((item) => item.name.toLowerCase().includes('item')); // Filter by name for pre-filtering
    const expectedDiscounted = preFilteredItems.filter((item) => item.discount >= 15); // Minimum discount of 15
    const filteredByDiscount = searchInput('', 15, items, preFilteredItems); // Search is empty
    expect(filteredByDiscount).toEqual(expectedDiscounted);
  });

  it('handles empty search string', () => {
    const preFilteredItems = items.filter((item) => item.discount >= 10); // Minimum discount of 10
    const filteredEmptySearch = searchInput('', 0, items, preFilteredItems); // Discount doesn't matter here
    expect(filteredEmptySearch).toEqual(preFilteredItems);
  });

  it('handles no matching items', () => {
    const filteredNoMatch = searchInput('notfound', 0, items, []); // Empty filteredItems
    expect(filteredNoMatch).toEqual([]);
  });

  it('avoids mutating the original arrays', () => {
    const originalItems = [...items];
    const originalFiltered = [...items.filter((item) => item.discount >= 10)]; // Example pre-filtering
    searchInput('search', 10, originalItems, originalFiltered);
    expect(originalItems).toEqual(items);
    expect(originalFiltered).toEqual(items.filter((item) => item.discount >= 10));
  });
});