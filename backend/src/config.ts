export interface Config {
    port: number;
    /** Lowest discount (%) the deals endpoint returns. */
    minDiscount: number;
    scrapeIntervalMs: number;
}

type Env = Record<string, string | undefined>;

// One day. Also keeps the timer far below setTimeout's limit (about 24.8 days).
const MAX_SCRAPE_INTERVAL_MINUTES = 24 * 60;

/** Reads and validates the environment once at startup, so a bad deploy fails immediately. */
export function loadConfig(env: Env = Bun.env): Config {
    return {
        port: integer(env, 'PORT', 8000, 1, 65_535),
        minDiscount: integer(env, 'MIN_DISCOUNT', 30, 0, 100),
        scrapeIntervalMs: integer(env, 'SCRAPE_INTERVAL_MINUTES', 5, 1, MAX_SCRAPE_INTERVAL_MINUTES) * 60_000,
    };
}

/** Unset or blank → the default. Otherwise plain digits within range, or startup fails (so 0 stays 0). */
function integer(env: Env, name: string, fallback: number, min: number, max: number): number {
    const raw = env[name]?.trim();
    if (!raw) {
        return fallback;
    }

    const value = Number(raw);
    if (!/^\d+$/.test(raw) || value < min || value > max) {
        throw new Error(`${name} must be a whole number from ${min} to ${max}, got "${raw}"`);
    }
    return value;
}
