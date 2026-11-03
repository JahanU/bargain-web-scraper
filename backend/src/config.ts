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
 * A numeric setting: the default when unset or blank, otherwise a number within range.
 * Anything else (a typo, out of range) throws, rather than quietly becoming the default,
 * so 0 stays 0.
 */
function numberSetting(env: Env, name: string, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER): number {
    const raw = env[name]?.trim();
    if (!raw) {
        return fallback;
    }

    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) {
        throw new Error(`${name} must be a number from ${min} to ${max}, got "${raw}"`);
    }
    return value;
}

/** Reads and validates the environment once at startup, so a bad deploy fails immediately. */
export function loadConfig(env: Env = Bun.env): Config {
    const cronSecret = env.CRON_SECRET?.trim() || undefined;
    if (cronSecret && cronSecret.length < 32) {
        throw new Error('CRON_SECRET must be at least 32 characters (try: openssl rand -hex 32)');
    }

    return {
        port: numberSetting(env, 'PORT', 8000, 1, 65_535),
        dataFile: env.DATA_FILE?.trim() || './data/deals.json',
        minDiscount: numberSetting(env, 'MIN_DISCOUNT', 30, 0, 100),
        scrapeIntervalMs: numberSetting(env, 'SCRAPE_INTERVAL_MINUTES', 5, 1) * 60_000,
        cronSecret,
    };
}
