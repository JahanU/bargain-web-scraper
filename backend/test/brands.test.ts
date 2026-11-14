import { describe, expect, it } from 'bun:test';
import { BRAND_SPELLINGS, BRANDS, canonicalBrand } from '@/retailers/brands';

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
