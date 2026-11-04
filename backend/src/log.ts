/**
 * Readable, aligned log lines:
 *
 *   09:41:03.010 INFO  scraper  ✓ jd scraped  status=ok products=312 took=888ms
 *
 * LOG_LEVEL picks how much to show: debug | info (default) | warn | error | silent.
 * Colours are used in a terminal only (FORCE_COLOR=1 / NO_COLOR=1 override), so hosted logs
 * like Render's stay plain text.
 */

type Fields = Record<string, unknown>;
export type Level = 'debug' | 'info' | 'warn' | 'error';

const RANK = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 } as const;

const LEVEL_COLOUR: Record<Level, string> = { debug: '90', info: '36', warn: '33', error: '31' };

export interface Logger {
    debug(msg: string, fields?: Fields): void;
    info(msg: string, fields?: Fields): void;
    warn(msg: string, fields?: Fields): void;
    error(msg: string, fields?: Fields): void;
}

/** A logger whose lines are labelled with `scope` (e.g. 'scraper', 'jd', 'http'). */
export function createLogger(scope: string): Logger {
    const write =
        (level: Level) =>
        (msg: string, fields: Fields = {}) => {
            if (RANK[level] < threshold()) {
                return;
            }
            const line = format(level, scope, msg, fields);
            (level === 'warn' || level === 'error' ? console.error : console.log)(line);
        };
    return { debug: write('debug'), info: write('info'), warn: write('warn'), error: write('error') };
}

/** Builds one log line (plus an indented stack trace for errors). Exported for tests. */
export function format(level: Level, scope: string, msg: string, fields: Fields = {}, now = new Date()): string {
    const colour = useColour();
    const paint = (code: string, text: string) => (colour ? `\x1b[${code}m${text}\x1b[0m` : text);

    const time = paint('2', `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`);
    const label = paint(`1;${LEVEL_COLOUR[level]}`, level.toUpperCase().padEnd(5));
    const where = paint('35', scope.padEnd(8));
    const pairs = Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${paint('2', `${key}=`)}${formatValue(value)}`)
        .join(' ');

    let line = `${time} ${label} ${where} ${msg}${pairs ? `  ${pairs}` : ''}`;

    // Errors get their stack trace (minus the message line, already shown above), indented.
    for (const value of Object.values(fields)) {
        if (level === 'error' && value instanceof Error && value.stack) {
            const frames = value.stack.split('\n').slice(1).join('\n');
            line += `\n${paint('2', frames)}`;
        }
    }
    return line;
}

/** 888 → "888ms", 15000 → "15s", 300000 → "5m". */
export function duration(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms * 10) / 10}ms`;
    }
    if (ms < 60_000) {
        return `${Math.round(ms / 100) / 10}s`;
    }
    return `${Math.round(ms / 6000) / 10}m`;
}

/** 98426 → "96.1KB". */
export function bytes(count: number): string {
    return count < 1024 ? `${count}B` : `${(count / 1024).toFixed(1)}KB`;
}

function formatValue(value: unknown): string {
    if (value instanceof Error) {
        return JSON.stringify(value.message);
    }
    if (typeof value === 'string') {
        return value === '' || /[\s"=]/.test(value) ? JSON.stringify(value) : value;
    }
    if (value === null || typeof value !== 'object') {
        return String(value);
    }
    return JSON.stringify(value);
}

function threshold(): number {
    const level = (Bun.env.LOG_LEVEL ?? '').trim().toLowerCase();
    return level in RANK ? RANK[level as keyof typeof RANK] : RANK.info;
}

function useColour(): boolean {
    if (Bun.env.FORCE_COLOR) {
        return Bun.env.FORCE_COLOR !== '0';
    }
    return !Bun.env.NO_COLOR && process.stdout.isTTY === true;
}
