import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Checks `Authorization: Bearer <secret>` in constant time (hashing first equalises lengths). */
export function hasBearer(request: Request, secret: string): boolean {
    const header = request.headers.get('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    return token.length > 0 && timingSafeEqual(digest(token), digest(secret));
}
