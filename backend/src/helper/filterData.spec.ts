import { describe, expect, it } from 'bun:test';
import { filterData } from './filterData';

describe('filterData', () => {
    it('returns a matched blocked keyword when item should be filtered', () => {
        expect(filterData('nike fc jersey')).toBe('fc');
    });

    it('returns undefined when item has no blocked keywords', () => {
        expect(filterData('nike running shorts')).toBeUndefined();
    });

    it('matches the first blocked keyword in array order', () => {
        expect(filterData('manchester city away shirt')).toBe('away');
    });
});
