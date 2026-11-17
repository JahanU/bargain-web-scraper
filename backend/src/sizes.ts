import type { Category, Gender } from '@/deals';

/** One product's sizes after normalising. All three lists are deduplicated. */
export interface Sizes {
    /**
     * What the card prints, one per retailer label: a canonical label (`M`, `8.5`, `UK 8`, `W30`,
     * `IT 48`), a range as one label (`S/M`, `6.5-8`, `W30 L32`), `One Size`, or an unrecognised
     * label as the retailer wrote it, trimmed. In key order (`One Size` last), or in the retailer's
     * order when any label is unrecognised.
     */
    labels: string[];
    /** What the filter matches and the facets count: ranges expanded. Canonical order. */
    keys: string[];
    /** The labels no rule recognised, as written. They are in `labels` and give no key. */
    unrecognised: string[];
}

type Context = { category: Category; gender: Gender };

/** One recognised label: what the card prints and the keys it matches (none for One Size). */
interface Parsed {
    label: string;
    keys: string[];
}

const LONG: Record<string, string> = { small: 'S', medium: 'M', large: 'L' };

/** M = 0, S = -1, XS = -2, L = 1, XL = 2 …; undefined if the text is not a letter size. */
function letterRank(text: string): number | undefined {
    const short = /^(?:([1-6])X|(X{0,6}))([SML])$/i.exec(text);
    const long = /^(X{0,3})[- ]?(small|medium|large)$/i.exec(text);
    let xs: number;
    let base: string | undefined;
    if (short) {
        xs = short[1] ? Number(short[1]) : (short[2] ?? '').length;
        base = short[3]?.toUpperCase();
    } else if (long) {
        xs = (long[1] ?? '').length;
        base = LONG[(long[2] ?? '').toLowerCase()];
    } else {
        return undefined;
    }
    if (base === 'M') {
        return xs === 0 ? 0 : undefined;
    }
    return base === 'S' ? -1 - xs : 1 + xs;
}

const letterKey = (rank: number) => (rank === 0 ? 'M' : 'X'.repeat(Math.abs(rank) - 1) + (rank < 0 ? 'S' : 'L'));

/** Both ends and every size between: (S, L) → S/M/L. */
function letters(lo: number, hi: number): Parsed {
    const keys: string[] = [];
    for (let rank = lo; rank <= hi; rank++) {
        keys.push(letterKey(rank));
    }
    return { label: lo === hi ? letterKey(lo) : `${letterKey(lo)}/${letterKey(hi)}`, keys };
}

function letterRange(text: string): Parsed | undefined {
    // Every place the label could split in two: at a "/" or "-", or (no separator) between two letters.
    const runTogether = /^[A-Z0-9]{2,8}$/i.test(text);
    for (let at = 1; at < text.length; at++) {
        const separator = /[/-]/.test(text.charAt(at));
        if (!separator && !runTogether) {
            continue;
        }
        const lo = letterRank(text.slice(0, at).trim());
        const hi = letterRank(text.slice(separator ? at + 1 : at).trim());
        if (lo !== undefined && hi !== undefined && lo < hi) {
            return letters(lo, hi);
        }
    }
    return undefined;
}

// One fixed table for all genders: close enough, shoppers check on the brand's own shop.
const EU_TO_UK: Record<string, number> = {
    35: 2.5,
    35.5: 3,
    36: 3.5,
    36.5: 4,
    37: 4,
    37.5: 4.5,
    38: 5,
    38.5: 5.5,
    39: 6,
    39.5: 6,
    40: 6.5,
    40.5: 7,
    41: 7,
    41.5: 7.5,
    42: 8,
    42.5: 8.5,
    43: 9,
    43.5: 9,
    44: 9.5,
    44.5: 10,
    45: 10.5,
    45.5: 10.5,
    46: 11,
    46.5: 11.5,
    47: 12,
    47.5: 12.5,
    48: 13,
    49: 14,
    50: 15,
};

type ShoeSystem = 'UK' | 'EU' | 'US';

function toUk(system: ShoeSystem, value: number, gender: Gender): number | undefined {
    const uk = system === 'UK' ? value : system === 'EU' ? EU_TO_UK[value] : value - (gender === 'Female' ? 2 : 1);
    return uk !== undefined && uk >= 1 && uk <= 17 ? uk : undefined;
}

/** Converts both ends to UK, then every half size between. Undefined if off the table or over 6 sizes wide. */
function footwear(system: ShoeSystem, from: number, to: number, gender: Gender): Parsed | undefined {
    const lo = toUk(system, from, gender);
    const hi = toUk(system, to, gender);
    if (lo === undefined || hi === undefined || hi < lo || hi - lo > 6) {
        return undefined;
    }
    const keys: string[] = [];
    for (let size = lo; size <= hi; size += 0.5) {
        keys.push(String(size));
    }
    // A range says UK so it reads as shoe sizes on a sock's card, and reads back the same in any category.
    return { label: lo === hi ? String(lo) : `UK ${lo}-${hi}`, keys };
}

// In the order the filter shows them, after the letters.
const CLOTHING_SYSTEMS = ['UK', 'W', 'IT', 'EU', 'FR', 'US'];
const NUMBER = String.raw`(\d{1,2}(?:\.5)?)`;
const PREFIXED = new RegExp(`^(UK|EUR|EU|US|IT|FR)\\s*${NUMBER}(?:\\s*-\\s*(?:\\1\\s*)?${NUMBER})?$`, 'i');
const BARE = new RegExp(`^${NUMBER}(?:\\s*-\\s*${NUMBER})?\\s*(UK)?$`, 'i');
const WAIST = /^(\d{2})\s*(?:"+|inch waist)$/i;
// An "x" or an inch mark has to say it is a waist: "10 12" alone could be two dress sizes.
const WAIST_LEG = /^(\d{2})\s*(?:(?:"+|inch waist)?\s*x|(?:"+|inch waist)\s)\s*(\d{2})\s*(?:"+|inch leg)?$/i;
// Our own waist labels, so a label we wrote reads back as the same size.
const WAIST_OURS = /^W(\d{2})(?: L(\d{2}))?$/;
const ONE_SIZE = /^(?:one ?size|1 size|on size|os|o\/s)$/i;

/** The first rule that recognises the label, or undefined. */
function parse(label: string, { category, gender }: Context): Parsed | undefined {
    let text = label;
    if (ONE_SIZE.test(text)) {
        return { label: 'One Size', keys: [] };
    }

    // "4 (L)", "Small (1)", "L(14)", JD's cut-off "6 (EU 39": a letter on either side wins, else the bracket goes.
    const bracket = /^(.*?)\s*\(([^)]*)\)?$/.exec(text);
    if (bracket) {
        const [, before = '', inside = ''] = bracket;
        const rank = letterRank(inside.trim()) ?? letterRank(before);
        if (rank !== undefined) {
            return letters(rank, rank);
        }
        text = before;
    }

    const single = letterRank(text);
    if (single !== undefined) {
        return letters(single, single);
    }
    const range = letterRange(text);
    if (range) {
        return range;
    }

    // "1 - Small", "L - 7 1/2": a letter next to a brand's own number.
    const dashed = /^(.+?) - (.+)$/.exec(text);
    const beside = dashed ? (letterRank(dashed[1] ?? '') ?? letterRank(dashed[2] ?? '')) : undefined;
    if (beside !== undefined) {
        return letters(beside, beside);
    }

    if (category === 'Clothes') {
        // The leg is on the card but is not a filter.
        const waist = WAIST_OURS.exec(text) ?? WAIST_LEG.exec(text) ?? WAIST.exec(text);
        if (waist) {
            return { label: waist[2] ? `W${waist[1]} L${waist[2]}` : `W${waist[1]}`, keys: [`W${waist[1]}`] };
        }
    }

    const prefixed = PREFIXED.exec(text);
    if (prefixed) {
        const system = (prefixed[1] ?? '').toUpperCase().replace('EUR', 'EU');
        const from = Number(prefixed[2]);
        const isRange = prefixed[3] !== undefined;
        // A range is a sock's shoe-size range wherever it is filed.
        if ((category === 'Shoes' || isRange) && (system === 'UK' || system === 'EU' || system === 'US')) {
            return footwear(system, from, Number(prefixed[3] ?? from), gender);
        }
        if (category === 'Clothes' && !isRange && Number.isInteger(from)) {
            return { label: `${system} ${from}`, keys: [`${system} ${from}`] };
        }
        return undefined;
    }

    // JD's "055" for 5.5.
    const padded = category === 'Shoes' ? /^0(\d)([05])$/.exec(text) : null;
    if (padded) {
        const size = Number(`${padded[1]}.${padded[2]}`);
        return footwear('UK', size, size, gender);
    }

    const bare = BARE.exec(text);
    if (!bare) {
        return undefined;
    }
    const from = Number(bare[1]);
    const isRange = bare[2] !== undefined;
    if (category === 'Shoes') {
        return footwear(from >= 35 ? 'EU' : 'UK', from, Number(bare[2] ?? from), gender);
    }
    if (isRange) {
        // A sock's shoe sizes only where it says UK or is an accessory: "8-10" on clothing is a dress, "36-40" a belt.
        return bare[3] || (category === 'Accessories' && from < 35)
            ? footwear('UK', from, Number(bare[2]), gender)
            : undefined;
    }
    if (category !== 'Clothes' || bare[3] || !Number.isInteger(from)) {
        return undefined;
    }
    // A bare number on clothing is a women's dress size, a men's waist or men's IT tailoring: the rest cannot be told apart.
    const key =
        gender === 'Female' && from % 2 === 0 && from >= 4 && from <= 24
            ? `UK ${from}`
            : gender === 'Male' && from >= 26 && from <= 38
              ? `W${from}`
              : gender === 'Male' && from % 2 === 0 && from >= 44 && from <= 58
                ? `IT ${from}`
                : undefined;
    return key ? { label: key, keys: [key] } : undefined;
}

const isFootwearKey = (key: string) => /^\d+(?:\.5)?$/.test(key);

/** Where a key sorts: its group (letters, then each clothing system, then footwear) and its place within it. */
function order(key: string): [number, number] | undefined {
    if (isFootwearKey(key)) {
        return [CLOTHING_SYSTEMS.length + 1, Number(key)];
    }
    const system = /^([A-Z]+?) ?(\d+)$/.exec(key);
    const at = system ? CLOTHING_SYSTEMS.indexOf(system[1] ?? '') : -1;
    if (at >= 0) {
        return [1 + at, Number(system?.[2])];
    }
    const rank = letterRank(key);
    return rank !== undefined && letterKey(rank) === key ? [0, rank] : undefined;
}

function compareKeys(a: string, b: string): number {
    const [groupA = 0, placeA = 0] = order(a) ?? [];
    const [groupB = 0, placeB = 0] = order(b) ?? [];
    return groupA - groupB || placeA - placeB;
}

/**
 * Turns one product's retailer labels into ours. The only inputs besides the label are the
 * product's category and gender: there is no per-store rule, so a new store needs none.
 *
 * Invariants:
 * - A footwear key is a UK size written as a bare number with an optional `.5` (`8`, `8.5`).
 *   No clothing key has that form, so one string names one size across both kinds.
 * - `keys` has no duplicates (a duplicate would double-count the deal in the facet).
 * - Pure and total: never throws, same input gives same output.
 */
export function normaliseSizes(labels: readonly string[], product: Context): Sizes {
    const keys = new Set<string>();
    const firstKeys = new Map<string, string | undefined>();
    const unrecognised = new Set<string>();
    for (const raw of labels) {
        const text = raw.trim().replace(/\s+/g, ' ');
        if (!text) {
            continue;
        }
        const parsed = parse(text, product);
        if (!parsed) {
            unrecognised.add(text);
        }
        const label = parsed?.label ?? text;
        if (!firstKeys.has(label)) {
            firstKeys.set(label, parsed?.keys[0]);
        }
        for (const key of parsed?.keys ?? []) {
            keys.add(key);
        }
    }
    // With a label we cannot place, the retailer's own order is the only one that keeps its sizes together.
    const inOrder =
        unrecognised.size > 0
            ? [...firstKeys]
            : [...firstKeys].sort(([, a], [, b]) => (a && b ? compareKeys(a, b) : Number(!a) - Number(!b)));
    return {
        labels: inOrder.map(([label]) => label),
        keys: [...keys].sort(compareKeys),
        unrecognised: [...unrecognised],
    };
}

/**
 * The keys of each kind, each in the order the filter shows them:
 * clothing = letters XXS→XXXXXXL, then UK, W (waist), IT, EU, FR, US, each ascending;
 * footwear = ascending.
 * A string that is not a key we mint (a hand-typed `size=banana`) is left out.
 */
export function splitSizeKeys(keys: Iterable<string>): { clothing: string[]; footwear: string[] } {
    const ours = [...keys].filter((key) => order(key) !== undefined).sort(compareKeys);
    return {
        clothing: ours.filter((key) => !isFootwearKey(key)),
        footwear: ours.filter(isFootwearKey),
    };
}
