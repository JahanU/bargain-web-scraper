import { describe, expect, it } from 'bun:test';
import { brandName, withOneSpellingPerBrand } from '@/retailers/brands';

describe('brandName', () => {
    it.each([
        ['Adidas', 'adidas'], // listed: our spelling
        ['  Carhartt WIP ', 'Carhartt WIP'], // not listed: the shop's own
        ['', undefined],
        [null, undefined],
        [undefined, undefined],
    ])('reads %p as %p', (spelling, expected) => {
        expect(brandName(spelling)).toBe(expected);
    });
});

describe('withOneSpellingPerBrand', () => {
    const brandsOf = (...brands: string[]) =>
        withOneSpellingPerBrand(brands.map((brand) => ({ brand }))).map((item) => item.brand);

    it('gives a brand the spelling most items use, ignoring case and punctuation', () => {
        expect(brandsOf('AMIRI', 'Amiri', 'AMIRI', 'Gallery Dept.', 'Gallery Dept', 'Gallery Dept')).toEqual([
            'AMIRI',
            'AMIRI',
            'AMIRI',
            'Gallery Dept',
            'Gallery Dept',
            'Gallery Dept',
        ]);
    });

    it('settles a tie the same way whatever the order', () => {
        expect(brandsOf('Skims', 'SKIMS')).toEqual(brandsOf('SKIMS', 'Skims'));
    });

    it('leaves different brands alone', () => {
        expect(brandsOf('Nike', 'Nike SB')).toEqual(['Nike', 'Nike SB']);
    });
});
