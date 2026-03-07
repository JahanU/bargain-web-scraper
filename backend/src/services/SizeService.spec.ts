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

    it('builds correct image URL from PLU', () => {
        expect(size.buildImageUrl('19696851')).toBe(
            'https://i8.amplience.net/i/jpl/sz_19696851_a'
        );
    });

    it('parses numeric discount from saving string', () => {
        expect(size.parseDiscount('20')).toBe(20);
        expect(size.parseDiscount('50%')).toBe(50);
        expect(size.parseDiscount(undefined)).toBe(0);
        expect(size.parseDiscount('')).toBe(0);
    });

    it('infers gender from URL', () => {
        expect(size.getGenderFromUrl('https://www.size.co.uk/mens/footwear/')).toBe('Male');
        expect(size.getGenderFromUrl('https://www.size.co.uk/womens/footwear/')).toBe('Female');
    });

    it('extracts items from embedded dataObject in HTML', () => {
        const html = `
            <html><head></head><body>
            <script>
            var dataObject = {"platform":"size","items":[{"plu":"12345","description":"Test Shoe","colour":"black","unitPrice":"50.00","category":"Mens > Footwear","categoryId":"test","sale":false,"brand":"Nike","ownbrand":false,"exclusive":false,"onlineexlusive":false}]};
            </script>
            </body></html>
        `;
        const items = size.extractDataObject(html);
        expect(items).toHaveLength(1);
        expect(items[0].plu).toBe('12345');
        expect(items[0].description).toBe('Test Shoe');
        expect(items[0].unitPrice).toBe('50.00');
    });

    it('returns empty array when no dataObject is present', () => {
        const html = '<html><head></head><body><p>No data here</p></body></html>';
        const items = size.extractDataObject(html);
        expect(items).toEqual([]);
    });

    it('parses raw items into Item interface correctly', () => {
        const rawItems = [
            {
                plu: '99999',
                description: 'adidas Originals Superstar',
                colour: 'white',
                unitPrice: '80.00',
                wasPrice: '100.00',
                saving: '20',
                category: 'Mens > Footwear',
                categoryId: 'test',
                sale: true,
                brand: 'adidas',
                ownbrand: false,
                exclusive: false,
                onlineexlusive: false,
            },
        ];

        const items = size.parseItems(rawItems, 'Male');
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('adidas Originals Superstar');
        expect(items[0].nowPrice).toBe('80.00');
        expect(items[0].wasPrice).toBe('100.00');
        expect(items[0].discount).toBe(20);
        expect(items[0].gender).toBe('Male');
        expect(items[0].url).toBe('https://www.size.co.uk/product/adidas-originals-superstar/99999');
        expect(items[0].imageUrl).toBe('https://i8.amplience.net/i/jpl/sz_99999_a');
    });

    it('skips items with missing plu or description', () => {
        const rawItems = [
            {
                plu: '',
                description: 'No PLU Item',
                colour: 'red',
                unitPrice: '30.00',
                category: 'Mens > Footwear',
                categoryId: 'test',
                sale: false,
                brand: 'Test',
                ownbrand: false,
                exclusive: false,
                onlineexlusive: false,
            },
            {
                plu: '11111',
                description: '',
                colour: 'blue',
                unitPrice: '40.00',
                category: 'Mens > Footwear',
                categoryId: 'test',
                sale: false,
                brand: 'Test',
                ownbrand: false,
                exclusive: false,
                onlineexlusive: false,
            },
        ];

        const items = size.parseItems(rawItems, 'Male');
        expect(items).toHaveLength(0);
    });
});
