import { apiUrl } from "@/shared/config/env";
import { type DealsRequest, dealsQuery } from "../model/request";
import { ApiError } from "./ApiError";
import { parsePage, type WirePage } from "./dealSchema";

const LOADING_DEADLINE_MS = 120_000;
const DEFAULT_RETRY_AFTER_S = 10;

export type FetchOptions = {
  attemptTimeoutMs?: number;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
};

/** GET /v2/deals for the request: its first page, or the page after `cursor`. */
export async function fetchDealsPage(
  request: DealsRequest,
  cursor: string | null,
  signal?: AbortSignal,
  options?: FetchOptions,
): Promise<WirePage> {
  const params = new URLSearchParams(dealsQuery(request));
  if (cursor !== null) params.set("cursor", cursor);
  return parsePage(await getJson(`/v2/deals?${params}`, signal, options));
}

/**
 * While the backend answers 503 (first scrape not finished) it waits Retry-After and tries again,
 * for up to two minutes. Plain fetch: no headers (they'd trigger a CORS preflight) and no cache
 * option (the browser's HTTP cache does the caching).
 */
async function getJson(
  path: string,
  signal: AbortSignal | undefined,
  options: FetchOptions = {},
): Promise<unknown> {
  const { attemptTimeoutMs = 20_000, now = Date.now, sleep = abortableSleep } = options;
  const deadline = now() + LOADING_DEADLINE_MS;

  for (;;) {
    const response = await request(path, signal, attemptTimeoutMs);
    if (response.status === 503) {
      if (now() >= deadline) throw new ApiError("still-loading", 503);
      await sleep(retryAfterMs(response.headers.get("Retry-After")), signal);
      continue;
    }
    // 500 and 502 may be a platform HTML page, so check the status before parsing.
    if (!response.ok) throw new ApiError("http", response.status);

    try {
      return await response.json();
    } catch {
      throw new ApiError("invalid-body");
    }
  }
}

async function request(
  path: string,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    return await fetch(`${apiUrl}${path}`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) throw error; // cancelled by the caller, not a failure
    throw new ApiError(timeout.aborted ? "timeout" : "network");
  }
}

/** Retry-After in ms: default 10 s, clamped to 1–60 s. */
export function retryAfterMs(header: string | null): number {
  const seconds = header === null || header.trim() === "" ? Number.NaN : Number(header);
  const safe = Number.isFinite(seconds)
    ? Math.min(Math.max(seconds, 1), 60)
    : DEFAULT_RETRY_AFTER_S;
  return safe * 1000;
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
