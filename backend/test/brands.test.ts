import { describe, expect, it } from 'bun:test';
import { BRAND_SPELLINGS, BRANDS, brandName, canonicalBrand, withOneSpellingPerBrand } from '@/retailers/brands';

describe('canonicalBrand', () => {
    it.each([
        // Ours, whatever the case and punctuation.
        ['Nike', 'Nike'],
        ['PUMA', 'PUMA'],
        ['puma', 'PUMA'],
        ["LEVI'S", "Levi's"],
        ['Levis', "Levi's"],
        // Shop spellings that are a different name.
        ['EA7 Emporio Armani', 'EA7'],
        ['Emporio Armani EA7', 'EA7'],
        ['Calvin Klein Underwear', 'Calvin Klein'],
        ['Calvin Klein Swim', 'Calvin Klein'],
        ['Nike swim', 'Nike'],
        ['Air Jordan', 'Jordan'],
        ['ON', 'On Running'],
        ['HOKA ONE ONE', 'HOKA'],
        ['Nike Running', 'Nike'],
        ['adidas Running', 'adidas'],
        ['Adidas Running', 'adidas'],
        ['New Balance Running', 'New Balance'],
        ['Asics Running', 'ASICS'],
        // END. writes this one with a curly apostrophe.
        ['Levi’s Collections', "Levi's"],
    ])('%s is %s', (spelling, brand) => {
        expect(canonicalBrand(spelling)).toBe(brand);
    });

    it.each(['', 'Carhartt WIP', 'Arte', 'N!CE', 'Running'])('does not know "%s"', (spelling) => {
        expect(canonicalBrand(spelling)).toBeUndefined();
    });

    it('maps every spelling to a brand on the list', () => {
        for (const spelling of BRAND_SPELLINGS) {
            expect(BRANDS).toContain(canonicalBrand(spelling) as string);
        }
    });
});

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
