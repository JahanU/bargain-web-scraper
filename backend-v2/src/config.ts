export interface Config {
    port: number;
    databaseUrl: string;
    cronSecret: string;
    minDiscount: number;
}

/** Reads and validates the environment once at startup, so a bad deploy fails immediately. */
export function loadConfig(env: Record<string, string | undefined> = Bun.env): Config {
    const required = (name: string) => {
        const value = env[name]?.trim();
        if (!value) {
            throw new Error(`Missing required environment variable ${name}`);
        }
        return value;
    };

    const cronSecret = required('CRON_SECRET');
    if (cronSecret.length < 32) {
        throw new Error('CRON_SECRET must be at least 32 characters (try: openssl rand -hex 32)');
    }

    return {
        port: Number(env.PORT) || 8000,
        databaseUrl: required('DATABASE_URL'),
        cronSecret,
        minDiscount: Number(env.MIN_DISCOUNT) || 30,
    };
}
