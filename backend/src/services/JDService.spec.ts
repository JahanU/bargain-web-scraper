import { describe, expect, it } from 'bun:test';
import * as cheerio from 'cheerio';
import { __test__ as jd } from './JDService';

describe('JDService helpers', () => {
    it('extracts discount percentage', () => {
        expect(jd.extractDiscount('Save 63%')).toBe(63);
        expect(jd.extractDiscount('No discount text')).toBe(0);
    });

    it('extracts numeric prices from mixed strings', () => {
        expect(jd.extractPrice('Now £1,299.99')).toBe('1299.99');
        expect(jd.extractPrice('N/A')).toBe('');
    });

    it('normalizes availability values', () => {
        expect(jd.normalizeAvailability('http://schema.org/InStock')).toBe('IN STOCK');
        expect(jd.normalizeAvailability('OUT OF STOCK')).toBe('OUT OF STOCK');
        expect(jd.normalizeAvailability('Limited')).toBe('UNKNOWN');
    });

    it('builds absolute URLs and handles invalid URL input', () => {
        expect(jd.toAbsoluteUrl('/product/abc')).toBe('https://www.jdsports.co.uk/product/abc');
        expect(jd.toAbsoluteUrl('http://[::1')).toBe('');
    });

    it('infers gender from URL path', () => {
        expect(jd.getGenderFromUrl('https://www.jdsports.co.uk/men/sale')).toBe('Male');
        expect(jd.getGenderFromUrl('https://www.jdsports.co.uk/women/sale')).toBe('Female');
    });

    it('validates common size formats', () => {
        expect(jd.isValidSize('M')).toBe(true);
        expect(jd.isValidSize('UK 9')).toBe(true);
        expect(jd.isValidSize('Select Size')).toBe(false);
    });

    it('extracts sizes from select options first', () => {
        const $ = cheerio.load(`
            <select>
                <option>Select size</option>
                <option>M</option>
                <option>UK 9</option>
            </select>
        `);

        expect(jd.extractSizes($)).toEqual(['M', 'UK 9']);
    });

    it('extracts sizes from script content as fallback', () => {
        const $ = cheerio.load(`
            <script>
                window.__DATA__ = [{"displaySize":"XL"},{"size":"S"}];
            </script>
        `);

        expect(jd.extractSizes($)).toEqual(['XL', 'S']);
    });

    it('extracts highest resolution image URL from srcset', () => {
        const $ = cheerio.load(`
            <div class="tile">
                <source data-srcset="/img/small.jpg 1x, /img/large.jpg 2x" />
            </div>
        `);

        expect(jd.extractImageUrl($('.tile'))).toBe('https://www.jdsports.co.uk/img/large.jpg');
    });

    it('reads stock metadata and falls back to UNKNOWN when absent', () => {
        const inStockDoc = cheerio.load('<meta property="product:availability" content="InStock" />');
        const unknownDoc = cheerio.load('<div>No metadata</div>');

        expect(jd.extractStockStatus(inStockDoc)).toBe('IN STOCK');
        expect(jd.extractStockStatus(unknownDoc)).toBe('UNKNOWN');
    });

    it('excludes only strongly out-of-stock items', () => {
        const withOutOfStockSelector = cheerio.load('<div class="outOfStock"></div>');
        const plainDoc = cheerio.load('<div></div>');

        expect(jd.shouldExcludeAsOutOfStock(plainDoc, 'OUT OF STOCK', ['M'])).toBe(true);
        expect(jd.shouldExcludeAsOutOfStock(withOutOfStockSelector, 'UNKNOWN', [])).toBe(true);
        expect(jd.shouldExcludeAsOutOfStock(plainDoc, 'UNKNOWN', ['M'])).toBe(false);
    });

    it('maps concurrently while preserving output order', async () => {
        const input = [1, 2, 3, 4];
        const output = await jd.mapConcurrent(input, 2, async (value: number) => {
            await Bun.sleep((5 - value) * 5);
            return value * 10;
        });

        expect(output).toEqual([10, 20, 30, 40]);
    });
});
