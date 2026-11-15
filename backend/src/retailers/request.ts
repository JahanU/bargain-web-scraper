const REQUEST_TIMEOUT_MS = 15_000;

// How long to wait after a 429 that names no Retry-After, and the longest we will wait for one.
const DEFAULT_RETRY_AFTER_SECONDS = 5;
const MAX_RETRY_AFTER_SECONDS = 30;

/**
 * A fetch that gives up after 15 seconds and throws `<what> returned status <n>` unless it succeeds.
 * Told to slow down (429), it waits as long as Retry-After says, then tries once more.
 */
export async function request(what: string, url: string, init?: RequestInit): Promise<Response> {
    const send = () => fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

    let response = await send();
    if (response.status === 429) {
        const asked = Number(response.headers.get('Retry-After') ?? Number.NaN);
        const seconds = Number.isNaN(asked) ? DEFAULT_RETRY_AFTER_SECONDS : asked;
        await Bun.sleep(Math.min(Math.max(seconds, 0), MAX_RETRY_AFTER_SECONDS) * 1000);
        response = await send();
    }
    if (!response.ok) {
        throw new Error(`${what} returned status ${response.status}`);
    }
    return response;
}
