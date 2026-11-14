// Team kits, accessories and other items not worth listing.
// biome-ignore format: a compact word list reads better than one word per line
// todo maybe delete later
const BLOCKED_WORDS = [
    'fc', 'nba', 'home', 'hip', 'gloves', 'cap', 'training', 'away', 'team', 'gb',
    'england', 'scotland', 'wales', 'ireland', 'basketball', 'football',
    'milan', 'inter', 'juventus', 'roma', 'liverpool', 'chelsea', 'arsenal', 'manchester',
    'barcelona', 'bayern', 'real',
    'houston', 'atlanta', 'boston', 'chicago', 'charlotte', 'cleveland', 'dallas', 'denver', 'jacksonville',
];

// Whole words, optionally plural: "cap" blocks "Nike Cap" and "Caps" but not "Capri",
// and "real" does not block "Realtree".
const BLOCKED_PATTERN = new RegExp(`\\b(?:${BLOCKED_WORDS.join('|')})s?\\b`, 'i');

/** True when a product name contains a blocked word. */
export function isBlockedName(name: string): boolean {
    return BLOCKED_PATTERN.test(name);
}
