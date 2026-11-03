export interface Config {
    port: number;
    dataFile: string;
    minDiscount: number;
    scrapeIntervalMs: number;
    /** Enables POST /jobs/scrape for manual runs. Unset means that endpoint is off. */
    cronSecret?: string;
}

type Env = Record<string, string | undefined>;

/**
 * A whole-number setting: the default when unset or blank, otherwise plain digits within range.
 * Anything else (a typo, decimals, hex, out of range) throws rather than quietly becoming the
 * default, so 0 stays 0.
 */
function integerSetting(env: Env, name: string, fallback: number, min: number, max: number): number {
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

// One day. Also keeps the timer far below setInterval's limit (2^31 - 1 ms, about 24.8 days),
// above which it fires every millisecond instead.
const MAX_SCRAPE_INTERVAL_MINUTES = 24 * 60;

/** Reads and validates the environment once at startup, so a bad deploy fails immediately. */
export function loadConfig(env: Env = Bun.env): Config {
    const cronSecret = env.CRON_SECRET?.trim() || undefined;
    if (cronSecret && cronSecret.length < 32) {
        throw new Error('CRON_SECRET must be at least 32 characters (try: openssl rand -hex 32)');
    }

    return {
        port: integerSetting(env, 'PORT', 8000, 1, 65_535),
        dataFile: env.DATA_FILE?.trim() || './data/deals.json',
        minDiscount: integerSetting(env, 'MIN_DISCOUNT', 30, 0, 100),
        scrapeIntervalMs: integerSetting(env, 'SCRAPE_INTERVAL_MINUTES', 5, 1, MAX_SCRAPE_INTERVAL_MINUTES) * 60_000,
        cronSecret,
    };
}
