// The only brands we list, under the one name we show for each. Everything else is own-label or filler.
// biome-ignore format: a compact list reads better than one brand per line
export const BRANDS = [
    'Polo Ralph Lauren', 'BOSS', 'HUGO', 'Lacoste', 'EA7', 'Jordan', 'Nike', 'On Running', 'HOKA', 'Salomon',
    'The North Face', 'New Balance', 'adidas', 'ASICS', 'UGG', 'Tommy Hilfiger', 'Tommy Jeans', 'Calvin Klein',
    'Fred Perry', 'Birkenstock', 'Dr Martens', 'Timberland',
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
    'Nike swim': 'Nike',
    // END. files a brand's running line, and a few brands, under names of its own.
    'Air Jordan': 'Jordan',
    ON: 'On Running',
    'HOKA ONE ONE': 'HOKA',
    'Nike Running': 'Nike',
    'adidas Running': 'adidas',
    'New Balance Running': 'New Balance',
    'ASICS Running': 'ASICS',
    "Levi's Collections": "Levi's",
};

/** Every spelling we recognise, for shops that can filter by brand in their search. */
export const BRAND_SPELLINGS = [...BRANDS, ...Object.keys(ALIASES)];

// "LEVI'S", "Levis" and "Levi's" are one key. Letters of any alphabet are kept, so "Samsøe" is not "Samse".
const key = (spelling: string) => spelling.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

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

/**
 * A shop's brand for a shop we keep whole: our name if we list the brand, else the shop's own
 * spelling. Nothing if the shop gave no brand. The value comes from a shop's index, so it is checked.
 */
export function brandName(spelling: unknown): string | undefined {
    const given = typeof spelling === 'string' ? spelling.trim() : '';
    return given ? (canonicalBrand(given) ?? given) : undefined;
}

/**
 * Shops spell some brands we don't list two ways ("AMIRI", "Amiri"), and the brand filter matches
 * exactly. Every item takes the first of its brand's spellings in sort order, so a brand is one
 * entry. The choice ignores how many items use each spelling: that changes with stock every scrape,
 * and a brand's name must not, or a saved link to it would stop matching.
 */
export function withOneSpellingPerBrand<T extends { brand: string }>(items: T[]): T[] {
    const chosen = new Map<string, string>();
    for (const { brand } of items) {
        const other = chosen.get(key(brand));
        if (other === undefined || brand < other) {
            chosen.set(key(brand), brand);
        }
    }
    return items.map((item) => {
        // A name with no letters or digits has an empty key: left alone, or every such brand would merge.
        const brand = (key(item.brand) && chosen.get(key(item.brand))) || item.brand;
        return brand === item.brand ? item : { ...item, brand };
    });
}
