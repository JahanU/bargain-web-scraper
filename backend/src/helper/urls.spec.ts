import { describe, expect, it } from 'bun:test';
import { URLS } from './urls';

describe('URLS', () => {
    it('contains JD men and shoes URLs', () => {
        expect(URLS.JD_ALL_MEN).toContain('https://www.jdsports.co.uk/');
        expect(URLS.SHOES).toContain('https://www.jdsports.co.uk/');
    });

    it('keeps sale query params in both URLs', () => {
        expect(URLS.JD_ALL_MEN).toContain('/sale/');
        expect(URLS.SHOES).toContain('/sale/');
    });
});
