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

/**
 * A shop's brand for a shop we keep whole: our name if we list the brand, else the shop's own
 * spelling. Nothing if the shop gave no brand.
 */
export function brandName(spelling: string | null | undefined): string | undefined {
    const given = spelling?.trim();
    return given ? (canonicalBrand(given) ?? given) : undefined;
}

/**
 * Shops spell some brands we don't list two ways ("AMIRI", "Amiri"), and the brand filter matches
 * exactly. Every item takes the spelling most items use, so a brand is one entry.
 */
export function withOneSpellingPerBrand<T extends { brand: string }>(items: T[]): T[] {
    const spellings = new Map<string, Map<string, number>>();
    for (const { brand } of items) {
        const counts = spellings.get(key(brand)) ?? new Map<string, number>();
        spellings.set(key(brand), counts.set(brand, (counts.get(brand) ?? 0) + 1));
    }
    // Most used first, then by name, so the choice doesn't flip between two equally common spellings.
    const preferred = new Map(
        [...spellings].map(([brand, counts]) => [
            brand,
            [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0],
        ]),
    );
    return items.map((item) => ({ ...item, brand: preferred.get(key(item.brand)) ?? item.brand }));
}
