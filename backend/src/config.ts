export interface Config {
    port: number;
    dataFile: string;
    minDiscount: number;
    scrapeIntervalMs: number;
    /** Enables POST /jobs/scrape for manual runs. Unset means that endpoint is off. */
    cronSecret?: string;
}

/** Reads and validates the environment once at startup, so a bad deploy fails immediately. */
export function loadConfig(env: Record<string, string | undefined> = Bun.env): Config {
    const cronSecret = env.CRON_SECRET?.trim() || undefined;
    if (cronSecret && cronSecret.length < 32) {
        throw new Error('CRON_SECRET must be at least 32 characters (try: openssl rand -hex 32)');
    }

    const intervalMinutes = Number(env.SCRAPE_INTERVAL_MINUTES) || 5;
    if (intervalMinutes < 1) {
        throw new Error('SCRAPE_INTERVAL_MINUTES must be at least 1');
    }

    return {
        port: Number(env.PORT) || 8000,
        dataFile: env.DATA_FILE?.trim() || './data/deals.json',
        minDiscount: Number(env.MIN_DISCOUNT) || 30,
        scrapeIntervalMs: intervalMinutes * 60_000,
        cronSecret,
    };
}
