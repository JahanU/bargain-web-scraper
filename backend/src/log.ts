type Fields = Record<string, unknown>;

function write(level: 'info' | 'warn' | 'error', msg: string, fields: Fields = {}) {
    const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields }, (_key, value) =>
        value instanceof Error ? { message: value.message, stack: value.stack } : value,
    );
    (level === 'error' ? console.error : console.log)(line);
}

/** One JSON object per line: easy to search in Render's log viewer. */
export const log = {
    info: (msg: string, fields?: Fields) => write('info', msg, fields),
    warn: (msg: string, fields?: Fields) => write('warn', msg, fields),
    error: (msg: string, fields?: Fields) => write('error', msg, fields),
};
