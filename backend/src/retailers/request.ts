const REQUEST_TIMEOUT_MS = 15_000;

/** A fetch that gives up after 15 seconds and throws `<what> returned status <n>` unless it succeeds. */
export async function request(what: string, url: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) {
        throw new Error(`${what} returned status ${response.status}`);
    }
    return response;
}
