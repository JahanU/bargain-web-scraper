import { describe, expect, it } from 'bun:test';
import { brandName, withOneSpellingPerBrand } from '@/retailers/brands';

describe('brandName', () => {
    it.each([
        ['Adidas', 'adidas'], // listed: our spelling
        ['  Carhartt WIP ', 'Carhartt WIP'], // not listed: the shop's own
        ['', undefined],
        [null, undefined],
        [undefined, undefined],
        [42, undefined], // a shop's index can hold anything
    ])('reads %p as %p', (spelling, expected) => {
        expect(brandName(spelling)).toBe(expected);
    });
});

describe('withOneSpellingPerBrand', () => {
    const brandsOf = (...brands: string[]) =>
        withOneSpellingPerBrand(brands.map((brand) => ({ brand }))).map((item) => item.brand);

    it('gives a brand one spelling, ignoring case and punctuation', () => {
        expect(brandsOf('Amiri', 'AMIRI', 'Gallery Dept.', 'Gallery Dept')).toEqual([
            'AMIRI',
            'AMIRI',
            'Gallery Dept',
            'Gallery Dept',
        ]);
    });

    it('keeps the same spelling however many items use each, so a saved link keeps matching', () => {
        expect(brandsOf('Skims', 'Skims', 'Skims', 'SKIMS')).toEqual(brandsOf('SKIMS', 'SKIMS', 'SKIMS', 'Skims'));
    });

    it('keeps apart brands that differ by an accented letter, and ones with no letters at all', () => {
        expect(brandsOf('Samsøe', 'Samse', '***', '+++')).toEqual(['Samsøe', 'Samse', '***', '+++']);
    });

    it('leaves different brands alone', () => {
        expect(brandsOf('Nike', 'Nike SB')).toEqual(['Nike', 'Nike SB']);
    });
});
