import { apiUrl } from "@/shared/config/env";
import type { CategoryScope, DealsRequest, Gender } from "../model/Deal";
import { ApiError } from "./ApiError";
import { type BrandCount, parseBrands } from "./brandSchema";
import { parseDeals, type WireDeal } from "./dealSchema";

const LOADING_DEADLINE_MS = 120_000;
const DEFAULT_RETRY_AFTER_S = 10;

export type FetchOptions = {
  attemptTimeoutMs?: number;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
};

/** GET /v1/deals?gender=&category=&brand=…, brands in sorted order so equal selections share a URL. */
export async function fetchDeals(
  { gender, category, brands }: DealsRequest,
  signal?: AbortSignal,
  options?: FetchOptions,
): Promise<WireDeal[]> {
  const params = scopeParams(gender, category);
  for (const brand of [...brands].sort()) params.append("brand", brand);
  return parseDeals(await getJson(`/v1/deals?${params}`, signal, options));
}

/** GET /v1/brands?gender=&category=: how many deals each brand has, whatever brands are selected. */
export async function fetchBrands(
  gender: Gender,
  category: CategoryScope,
  signal?: AbortSignal,
  options?: FetchOptions,
): Promise<BrandCount[]> {
  return parseBrands(await getJson(`/v1/brands?${scopeParams(gender, category)}`, signal, options));
}

function scopeParams(gender: Gender, category: CategoryScope): URLSearchParams {
  const params = new URLSearchParams({ gender });
  if (category !== "All") params.set("category", category);
  return params;
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
