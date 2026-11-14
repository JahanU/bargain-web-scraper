// The only brands we list, under the one name we show for each. Everything else is own-label or filler.
// biome-ignore format: a compact list reads better than one brand per line
export const BRANDS = [
    'Polo Ralph Lauren', 'BOSS', 'HUGO', 'Lacoste', 'EA7', 'Jordan', 'Nike', 'On Running', 'HOKA', 'Salomon',
    'The North Face', 'New Balance', 'adidas', 'ASICS', 'UGG', 'Tommy Hilfiger', 'Tommy Jeans', 'Calvin Klein',
    'Fred Perry', 'Birkenstock', 'Dr Martens', 'Timberland', 'True Religion',
    'Napapijri', 'Berghaus', 'Columbia', "Levi's", 'Converse', 'Vans', 'Under Armour', 'PUMA', 'Saucony',
    'Reebok', 'Castore', 'Montirex', 'Trailberg', 'Crocs', 'Stanley 1913', 'New Era', 'Champion', 'Dickies',
    'Juicy Couture', 'Mizuno',
];

// Shop spellings that differ from ours by more than case and punctuation.
const ALIASES: Record<string, string> = {
    'EA7 Emporio Armani': 'EA7',
    'Emporio Armani EA7': 'EA7',
    'Calvin Klein Underwear': 'Calvin Klein',
    'Calvin Klein Swim': 'Calvin Klein',
};

/** Every spelling we recognise, for shops that can filter by brand in their search. */
export const BRAND_SPELLINGS = [...BRANDS, ...Object.keys(ALIASES)];

// "LEVI'S", "Levis" and "Levi's" are one key.
const key = (spelling: string) => spelling.toLowerCase().replace(/[^a-z0-9]/g, '');

const BY_KEY = new Map<string, string>();
for (const brand of BRANDS) {
    BY_KEY.set(key(brand), brand);
}
for (const [alias, brand] of Object.entries(ALIASES)) {
    BY_KEY.set(key(alias), brand);
}

/** Our name for a shop's brand, or nothing if we don't list that brand. */
export function canonicalBrand(spelling: string): string | undefined {
    return BY_KEY.get(key(spelling));
}
