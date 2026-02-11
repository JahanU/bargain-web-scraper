import type { Context, Next } from 'hono';

export const loggingMiddleware = async (c: Context, next: Next) => {
    console.log(`Request was made at: ${new Date().toLocaleString()}`);
    await next();
};
