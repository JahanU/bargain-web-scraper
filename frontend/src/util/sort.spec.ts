import Item from '../interfaces/Item';
import { priceSort, discountSort, genderSort, searchInput, discountSlider, sizeFilter } from './sort';

// Mock data for items
const items: any[] = [
    { id: 1, name: 'Item 1', gender: 'Male' },
    { id: 2, name: 'Item 2', gender: 'Female' },
    { id: 3, name: 'Item 3', gender: 'Male' },
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

