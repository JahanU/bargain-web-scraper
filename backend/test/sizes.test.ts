import { describe, expect, it } from 'bun:test';
import type { Category, Gender } from '@/deals';
import { normaliseSizes, splitSizeKeys } from '@/sizes';
import corpus from './fixtures/size-labels.json';

const shoes = { category: 'Shoes', gender: 'Male' } as const;
const mens = { category: 'Clothes', gender: 'Male' } as const;
const womens = { category: 'Clothes', gender: 'Female' } as const;
const accessory = { category: 'Accessories', gender: 'Unisex' } as const;

type Product = { category: Category; gender: Gender };
type Case = [raw: string, product: Product, label: string, keys: string[]];

describe('normaliseSizes', () => {
    it.each<Case>([
        ['One Size', accessory, 'One Size', []],
        ['OneSize', mens, 'One Size', []],
        ['1 Size', accessory, 'One Size', []],
        ['OS', accessory, 'One Size', []],
        ['ON SIZE', accessory, 'One Size', []],

        ['4 (L)', mens, 'L', ['L']],
        ['2(S)', mens, 'S', ['S']],
        ['Small (1)', mens, 'S', ['S']],
        ['36" (XS)', mens, 'XS', ['XS']],
        ['L(14)', accessory, 'L', ['L']],
        ['6 (EU 39', shoes, '6', ['6']],
        ['6 (EU 39)', shoes, '6', ['6']],

        ['XS', mens, 'XS', ['XS']],
        ['xl', mens, 'XL', ['XL']],
        ['XXXXL', mens, 'XXXXL', ['XXXXL']],
        ['2XL', mens, 'XXL', ['XXL']],
        ['Medium', mens, 'M', ['M']],
        ['X-Large', mens, 'XL', ['XL']],
        ['XLarge', mens, 'XL', ['XL']],
        ['XX-Small', womens, 'XXS', ['XXS']],

        ['S/M', accessory, 'S/M', ['S', 'M']],
        ['S-M', accessory, 'S/M', ['S', 'M']],
        ['SM', accessory, 'S/M', ['S', 'M']],
        ['LXL', mens, 'L/XL', ['L', 'XL']],
        ['XSS', mens, 'XS/S', ['XS', 'S']],
        ['X-Small / Small', accessory, 'XS/S', ['XS', 'S']],
        ['Large/X-Large', mens, 'L/XL', ['L', 'XL']],
        ['S/L', mens, 'S/L', ['S', 'M', 'L']],

        ['1 - Small', mens, 'S', ['S']],
        ['L - 7 1/2', accessory, 'L', ['L']],

        ['30"', mens, 'W30', ['W30']],
        ['30""', mens, 'W30', ['W30']],
        ['32 inch Waist', mens, 'W32', ['W32']],
        ['30" 32"', mens, 'W30 L32', ['W30']],
        ['30 inch Waist x 32 inch Leg', mens, 'W30 L32', ['W30']],
        ['27 x 32', womens, 'W27 L32', ['W27']],
        ['34x30', mens, 'W34 L30', ['W34']],

        ['UK 6', shoes, '6', ['6']],
        ['UK9', shoes, '9', ['9']],
        ['UK  10', shoes, '10', ['10']],
        ['EU 42', shoes, '8', ['8']],
        ['EU40', shoes, '6.5', ['6.5']],
        ['US 9', shoes, '8', ['8']],
        ['US5.5', shoes, '4.5', ['4.5']],
        ['US 9', { category: 'Shoes', gender: 'Female' }, '7', ['7']],
        ['UK 7- UK 7.5', shoes, 'UK 7-7.5', ['7', '7.5']],
        ['EU 35-36', shoes, 'UK 2.5-3.5', ['2.5', '3', '3.5']],
        ['EU 41-43', accessory, 'UK 7-9', ['7', '7.5', '8', '8.5', '9']],

        ['UK 8', womens, 'UK 8', ['UK 8']],
        ['IT 50', mens, 'IT 50', ['IT 50']],
        ['It 52', mens, 'IT 52', ['IT 52']],
        ['IT48', mens, 'IT 48', ['IT 48']],
        ['EUR 36', womens, 'EU 36', ['EU 36']],
        ['FR 38', womens, 'FR 38', ['FR 38']],
        ['US 4', womens, 'US 4', ['US 4']],

        ['055', shoes, '5.5', ['5.5']],
        ['095', shoes, '9.5', ['9.5']],

        ['9', shoes, '9', ['9']],
        ['9.5', shoes, '9.5', ['9.5']],
        ['41', shoes, '7', ['7']],
        ['6.5-8', accessory, 'UK 6.5-8', ['6.5', '7', '7.5', '8']],
        ['6-9UK', accessory, 'UK 6-9', ['6', '6.5', '7', '7.5', '8', '8.5', '9']],
        ['EU 43.5', shoes, '9', ['9']],
        ['6XL', mens, 'XXXXXXL', ['XXXXXXL']],

        ['8', womens, 'UK 8', ['UK 8']],
        ['30', mens, 'W30', ['W30']],
        ['48', mens, 'IT 48', ['IT 48']],
    ])('reads %p on %o as %p', (raw, product, label, keys) => {
        expect(normaliseSizes([raw], product)).toEqual({ labels: [label], keys, unrecognised: [] });
    });

    it.each<[string, Product]>([
        ['7 1/4', accessory],
        ['N', accessory],
        ['18cm', accessory],
        ['22"', accessory],
        ['0.89L', accessory],
        ['Socks', mens],
        ['6-', shoes],
        ['Left M', accessory],
        ['5', accessory],
        ['3', mens],
        ['2', womens],
        ['41', mens],
        ['44', womens],
        ['30', { category: 'Clothes', gender: 'Unisex' }],
        ['EU 36.5', womens],
        ['EU 51', shoes],
        ['5-14', accessory],
        ['39-42', mens],
        ['EU 41-43', mens],
        ['UK 8-10', womens],
        ['6-9UK', mens],
        ['8-10', womens],
        ['36-40', accessory],
        ['10 12', womens],
        ['9XL', mens],
    ])('keeps %p on %o as written, with no key', (raw, product) => {
        expect(normaliseSizes([raw], product)).toEqual({ labels: [raw], keys: [], unrecognised: [raw] });
    });

    it('gives each size once, however many labels say it', () => {
        expect(normaliseSizes(['UK 8', '8', 'EU 42', ' 8 ', ''], shoes)).toEqual({
            labels: ['8'],
            keys: ['8'],
            unrecognised: [],
        });
        expect(normaliseSizes(['S/M', 'M', 'M/L'], mens).keys).toEqual(['S', 'M', 'L']);
        expect(normaliseSizes(['N', ' N'], accessory)).toEqual({ labels: ['N'], keys: [], unrecognised: ['N'] });
    });

    it("orders the labels by size, or leaves the retailer's order when it cannot place one", () => {
        expect(normaliseSizes(['XL', 'One Size', 'S', 'M/L'], mens).labels).toEqual(['S', 'M/L', 'XL', 'One Size']);
        expect(normaliseSizes(['40', '42', '44'], mens).labels).toEqual(['40', '42', 'IT 44']);
        expect(normaliseSizes(['Large', 'Small', 'N', 'Medium'], accessory).labels).toEqual(['S', 'M', 'N', 'L']);
        expect(normaliseSizes(['10', '8.5', '8', '055'], shoes).labels).toEqual(['5.5', '8', '8.5', '10']);
    });
});

describe('splitSizeKeys', () => {
    it('splits the two kinds, each in the order the filter shows them', () => {
        const keys = [
            '10',
            'US 4',
            'W30',
            'XL',
            '8.5',
            'IT 48',
            'UK 10',
            'XXS',
            'FR 38',
            'M',
            'UK 8',
            'EU 36',
            '8',
            'S',
        ];
        expect(splitSizeKeys(keys)).toEqual({
            clothing: ['XXS', 'S', 'M', 'XL', 'UK 8', 'UK 10', 'W30', 'IT 48', 'EU 36', 'FR 38', 'US 4'],
            footwear: ['8', '8.5', '10'],
        });
    });

    it('leaves out a string that is not one of our keys', () => {
        expect(splitSizeKeys(['banana', 'Medium', 'M', 'One Size', '7 1/4'])).toEqual({
            clothing: ['M'],
            footwear: [],
        });
    });
});

// Every label the three stores sent on 15 Nov 2026. When a store adds labels, replace the fixture
// (store → category → gender → label → products) and rerun: the first test shows what is new.
describe('over every label the stores send', () => {
    const labels: Record<string, Record<string, Record<string, Record<string, number>>>> = corpus.labels;
    const sent = Object.values(labels).flatMap((categories) =>
        Object.entries(categories).flatMap(([category, genders]) =>
            Object.entries(genders).flatMap(([gender, counts]) =>
                Object.keys(counts).map((label) => ({ label, product: { category, gender } as Product })),
            ),
        ),
    );
    const read = sent.map(({ label, product }) => ({ product, ...normaliseSizes([label], product) }));
    // As the facet counts them: one row per distinct key.
    const facet = splitSizeKeys(new Set(read.flatMap((sizes) => sizes.keys)));

    it('does not recognise exactly these', () => {
        const unrecognised = new Set(read.flatMap((sizes) => sizes.unrecognised));
        expect([...unrecognised].sort()).toEqual(
            [
                ...['0', '1', '2', '3', '4', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5'],
                ...['11', '11.5', '12', '20', '39', '41', '42', '44', '46', '48', '50', '54', '56', '58', '60'],
                ...['7 1/2', '7 1/4', '7 1/8', '7 3/8', '7 5/8', '12.5K - 1', '6-', '39-42'],
                ...['EU 38-40', 'EU 41-43', 'EU 44-46'],
                ...['18cm', '19cm', '60cm', '85cm', '90cm', '100cm', '22"', '34"', '36"', '40"', '0.59L', '0.89L'],
                ...['H', 'J', 'N', 'P', 'R', 'U', 'Bras', 'Socks'],
                ...['Left S', 'Left M', 'Left M/L', 'Left L', 'Left XL', 'Left 2XL'],
                ...['Right S', 'Right M', 'Right ML', 'Right L', 'Right XL'],
            ].sort(),
        );
    });

    it('gives a facet with no two rows for one size', () => {
        const numbered = (system: string, sizes: number[]) => sizes.map((size) => `${system}${size}`);
        const waists = [20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 44, 46];
        expect(facet.clothing).toEqual([
            ...['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'XXXXXL', 'XXXXXXL'],
            ...numbered('UK ', [4, 6, 8, 10, 12, 14, 16, 18]),
            ...numbered('W', waists),
            ...numbered('IT ', [36, 38, 40, 42, 44, 46, 48, 50, 52]),
            ...numbered('EU ', [32, 34, 36, 37, 38, 40, 42, 44]),
            ...numbered('FR ', [34, 36, 38, 40, 42]),
            ...numbered('US ', [0, 2, 4, 6, 8, 10]),
        ]);
        const halves = Array.from({ length: 31 }, (_, i) => String(2 + i / 2));
        expect(facet.footwear).toEqual(halves.filter((size) => size !== '15.5' && size !== '16.5'));

        // Two spellings of one size would be two rows that differ only in case or spacing.
        const rows = [...facet.clothing, ...facet.footwear];
        expect(new Set(rows.map((key) => key.toLowerCase().replace(/\s/g, ''))).size).toBe(rows.length);
    });

    it('reads its own labels back as the same sizes', () => {
        const drifted = read
            .map((sizes) => ({ first: sizes, again: normaliseSizes(sizes.labels, sizes.product) }))
            .filter(
                ({ first, again }) => first.labels[0] !== again.labels[0] || first.keys.join() !== again.keys.join(),
            );
        expect(drifted).toEqual([]);
    });

    it('never gives clothing a key that reads as a shoe size', () => {
        const bareNumber = /^\d+(?:\.\d+)?$/;
        expect(facet.clothing.filter((key) => bareNumber.test(key))).toEqual([]);

        // Off the shoe shelf, only a sock's shoe-size range may count as footwear.
        const offShelf = read.filter(
            ({ product, keys }) => product.category !== 'Shoes' && keys.some((key) => bareNumber.test(key)),
        );
        expect(
            offShelf.filter(({ labels }) => !/^UK [\d.]+-[\d.]+$/.test(labels[0]!)).map(({ labels }) => labels),
        ).toEqual([]);
    });
});
