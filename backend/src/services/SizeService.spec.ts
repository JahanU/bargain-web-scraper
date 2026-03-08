import { describe, expect, it } from 'bun:test';
import { __test__ as size } from './SizeService';

describe('SizeService helpers', () => {
    it('builds correct product URL from description and PLU', () => {
        expect(size.buildProductUrl('Nike Air Max 90', '12345678')).toBe(
            'https://www.size.co.uk/product/nike-air-max-90/12345678'
        );
    });

    it('builds correct image URL from shogunPluRef', () => {
        const shogunPluRef = '774338';
        const url = size.buildImageUrl(shogunPluRef);
        expect(url).toBe('https://i8.amplience.net/i/jpl/sz_774338_a');
    });

    it('parses numeric discount from saving string', () => {
        expect(size.parseDiscount('33%')).toBe(33);
        expect(size.parseDiscount('20')).toBe(20);
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

    it('extracts discounts from HTML tiles using regex', () => {
        const html = `
            <li class="productListItem">
                <span class="itemContainer" data-productsku="12345">
                    <span class="sav">Save&nbsp;33%</span>
                </span>
            </li>
            <li class="productListItem">
                <span class="itemContainer" data-productsku="67890">
                    <span class="sav"> Save 20% </span>
                </span>
            </li>
        `;
        const map = size.extractDiscountsFromHtml(html);
        expect(map.get('12345')).toBe(33);
        expect(map.get('67890')).toBe(20);
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
            unitPrice: '20.00',
            category: 'Mens > Footwear'
        }];
        const discountMap = new Map();
        discountMap.set('12345', 33);

        const items = size.parseItems(rawItems, 'Male', discountMap);
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('Test Shoe');
        expect(items[0].discount).toBe(33);
        expect(items[0].wasPrice).toBe('');
    });
});
