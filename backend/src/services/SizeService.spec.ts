import { describe, expect, it } from 'bun:test';
import { __test__ as size } from './SizeService';

describe('SizeService helpers', () => {
    it('builds correct product URL from description and PLU', () => {
        expect(size.buildProductUrl('Nike Air Max 90', '12345678')).toBe(
            'https://www.size.co.uk/product/nike-air-max-90/12345678'
        );
    });

    it('handles special characters in product URL slugs', () => {
        expect(size.buildProductUrl("Havaianas Brasil Logo Flip Flops", '19696851')).toBe(
            'https://www.size.co.uk/product/havaianas-brasil-logo-flip-flops/19696851'
        );
    });

    it('builds correct image URL from shogunPluRef', () => {
        const shogunPluRef = '774338';
        const url = size.buildImageUrl(shogunPluRef);
        expect(url).toBe('https://i8.amplience.net/i/jpl/sz_774338_a');
    });

    it('parses numeric discount from saving string', () => {
        expect(size.parseDiscount('£15.00')).toBe(15);
        expect(size.parseDiscount('£10.00')).toBe(10);
        expect(size.parseDiscount('')).toBe(0);
        expect(size.parseDiscount(undefined)).toBe(0);
    });

    it('infers gender from URL', () => {
        expect(size.getGenderFromUrl('https://www.size.co.uk/mens/footwear/')).toBe('Male');
        expect(size.getGenderFromUrl('https://www.size.co.uk/product/nike-air-max-mens/12345')).toBe('Male');
        expect(size.getGenderFromUrl('https://www.size.co.uk/women/footwear/')).toBe('Female');
    });

    it('extracts items from embedded dataObject in HTML', () => {
        const html = `
            <html><body>
            <script>
            var dataObject = {"platform":"size","items":[{"plu":"12345","shogunPluRef":"67890","description":"Test Shoe","colour":"black","unitPrice":"50.00","category":"Mens > Footwear","categoryId":"test","sale":false,"brand":"Nike","ownbrand":false,"exclusive":false,"onlineexlusive":false}]};
            </script>
            </body></html>
        `;
        const items = size.extractDataObject(html);
        expect(items).toHaveLength(1);
        expect(items[0].plu).toBe('12345');
        expect(items[0].shogunPluRef).toBe('67890');
        expect(items[0].description).toBe('Test Shoe');
    });

    it('returns empty array when no dataObject is present', () => {
        const html = '<html><body></body></html>';
        const items = size.extractDataObject(html);
        expect(items).toHaveLength(0);
    });

    it('parses raw items into Item interface correctly', () => {
        const rawItems: any[] = [{
            plu: '12345',
            shogunPluRef: '67890',
            description: 'Test Shoe',
            unitPrice: '50.00',
            wasPrice: '70.00',
            saving: '£20.00',
            category: 'Mens > Footwear'
        }];
        const items = size.parseItems(rawItems, 'Male');
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('Test Shoe');
        expect(items[0].imageUrl).toContain('67890');
        expect(items[0].url).toContain('12345');
        expect(items[0].discount).toBe(20);
    });

    it('skips items with missing plu or description', () => {
        const rawItems: any[] = [
            { plu: '12345', shogunPluRef: '67890', description: 'Valid' },
            { plu: '12345', shogunPluRef: '67890' }, // Missing description
            { shogunPluRef: '67890', description: 'No PLU' } // Missing plu
        ];
        const items = size.parseItems(rawItems as any, 'Male');
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('Valid');
    });
});
