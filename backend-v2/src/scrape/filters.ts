// Team kits, accessories and other items not worth alerting on.
const BLOCKED_WORDS = [
    'fc', 'nba', 'home', 'hip', 'gloves', 'cap', 'training', 'away', 'team', 'gb',
    'england', 'scotland', 'wales', 'ireland', 'basketball', 'football',
    'milan', 'inter', 'juventus', 'roma', 'liverpool', 'chelsea', 'arsenal', 'manchester',
    'barcelona', 'bayern', 'real',
    'houston', 'atlanta', 'boston', 'chicago', 'charlotte', 'cleveland', 'dallas', 'denver', 'jacksonville',
];

// Whole words only, so "cap" blocks "Nike Cap" but not "Capri", and "real" not "Realtree".
const BLOCKED_PATTERN = new RegExp(`\\b(?:${BLOCKED_WORDS.join('|')})\\b`, 'i');

/** True when a product name contains a blocked word. */
export function isBlockedName(name: string): boolean {
    return BLOCKED_PATTERN.test(name);
}
