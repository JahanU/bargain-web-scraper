import { describe, expect, it } from 'bun:test';
import { isBlockedName } from '../src/scrape/filters';

describe('isBlockedName', () => {
    it('blocks team kits and accessories', () => {
        expect(isBlockedName('Nike FC Jersey')).toBe(true);
        expect(isBlockedName('Manchester City Away Shirt')).toBe(true);
        expect(isBlockedName('Nike Cap')).toBe(true);
    });

    it('allows ordinary products', () => {
        expect(isBlockedName('Nike Running Shorts')).toBe(false);
    });

    it('matches whole words only', () => {
        expect(isBlockedName('Nike Capri Leggings')).toBe(false);   // "cap"
        expect(isBlockedName('Realtree Camo Jacket')).toBe(false);  // "real"
        expect(isBlockedName('Homage Tee')).toBe(false);            // "home"
        expect(isBlockedName('Nike Hipster Bag')).toBe(false);      // "hip"
    });
});
