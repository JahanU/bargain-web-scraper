# Frontend ↔ Backend API contract

Everything the frontend needs to know to work with the rewritten backend: the endpoints, the `Deal` type, the loading state, caching and ETags, CORS, and what changed from the old backend.

> **Source of truth:** the `Deal` type lives in `backend/src/deals.ts`, and the HTTP behaviour (headers, 503, ETags) in `backend/src/http.ts`. If either changes, update this document in the same PR.

## TL;DR checklist

- [ ] Call **`GET /v1/deals`**. It returns a plain JSON array of `Deal`.
- [ ] Handle **`503` = "still loading"**: wait `Retry-After` seconds and retry. Keep retrying for about **2 minutes**, not 3 tries.
- [ ] Use a **plain `fetch(url)`**: no custom headers and no `cache: 'no-store'`. The browser then handles gzip and ETags for you.
- [ ] Use **`deal.url` as the React key**; it's unique per product.
- [ ] `sizes` and `imageUrl` can be **missing**. Prices are **numbers in GBP**.
- [ ] Do filtering, sorting and search **in the browser**. The API always returns the full list.
- [ ] Don't poll more often than **every 60s**; the data only changes every 5 minutes.

---

## Base URLs

| Environment | Base URL |
|---|---|
| Local | `http://localhost:8000` |
| Production | `https://bargain-web-scraper-8bbn.onrender.com` |

## Endpoints

| Method | Path | Use it for |
|---|---|---|
| `GET` | **`/v1/deals`** | **The deals list.** Use this in the new frontend. |
| `GET` | `/webscrape/getBestDeals` | Same response. Kept for the current frontend; switch to `/v1/deals`. |
| `GET` | `/health` (also `/`) | Backend status (optional: a status banner, debugging) |

Anything else returns `404` with `{ "error": "Not Found" }`. The old `/firebase/*`, `/telegram/*`, `/client/*` and `/jobs/scrape` endpoints are gone.

---

## `GET /v1/deals`

### Response: `200 OK`

A JSON **array** of deals, already **sorted by discount (highest first), then by price (cheapest first)**. It can be an empty array `[]` when the sale has nothing at or above the discount floor; that is a valid state, not an error.

```ts
/** One deal. Mirrors `Deal` in backend/src/deals.ts. */
export interface Deal {
    name: string;
    /** Original price in GBP, e.g. 135. Can be 0 if JD didn't provide it. */
    wasPrice: number;
    /** Sale price in GBP, e.g. 54.99. */
    nowPrice: number;
    /** Whole-number percent off, e.g. 60. Always ≥ the backend's MIN_DISCOUNT (30 by default). */
    discount: number;
    /** The JD product page. Unique per product, so use it as the React key. */
    url: string;
    /** Product image. The key is absent if JD had none. */
    imageUrl?: string;
    /** Sizes in stock, e.g. ["7", "8", "9"]. The key is absent if unknown. */
    sizes?: string[];
    /** When the backend first saw this product, in ms since epoch (see caveats). */
    timestamp: number;
    /** From the sale listing it came from; "Unisex" if it's in both men's and women's sales. */
    gender: 'Male' | 'Female' | 'Unisex';
}
```

Example:

```json
[
  {
    "name": "Nike Air Max 90",
    "wasPrice": 135,
    "nowPrice": 54.99,
    "discount": 60,
    "url": "https://www.jdsports.co.uk/product/black-nike-air-max-90/19686180/",
    "imageUrl": "https://i8.amplience.net/i/jpl/jd_752441_plc",
    "sizes": ["7", "8", "9"],
    "timestamp": 1793703053984,
    "gender": "Male"
  }
]
```

Notes on the data:

| Field | What to know |
|---|---|
| Prices | Numbers in pounds (never strings like `"£54.99"`). Format with `new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`. |
| `discount` | The list only contains deals at or above the backend's floor (30%), so a frontend discount slider below 30 changes nothing. |
| `sizes` / `imageUrl` | Optional: the key is missing rather than `null` or `[]`. Show "N/A" or a placeholder. |
| Size of the list | A few hundred deals, about 100 KB of JSON (about 20 KB gzipped). There's no pagination; filter and sort client-side. |
| Sold-out items | Removed by the backend within about 5 minutes. Everything in the list was in stock at the last scrape. |

### Response: `503 Service Unavailable` (still loading)

Right after the backend starts (deploys, restarts), it has no data until its first scrape finishes, usually within seconds. Until then:

```
HTTP/1.1 503 Service Unavailable
Retry-After: 10
Content-Type: application/json

{ "error": "Deals are loading, try again shortly" }
```

The frontend should show a loading state, wait `Retry-After` seconds, and try again. If JD itself is down at that moment, the backend retries after 15s, 30s, 60s and so on, so **keep retrying for about 2 minutes** before showing an error.

### Other responses

| Status | Body | Meaning |
|---|---|---|
| `404` | `{ "error": "Not Found" }` (JSON) | Wrong path |
| `500` / `502` | Possibly **not JSON** (Bun's or Render's error page) | Backend crashed or is restarting. Treat it as a network error and retry later. |

Always check `response.ok` / `response.status` before calling `.json()`.

---

## Recommended fetch logic

```ts
// Vite shown; with Create React App use process.env.NODE_ENV === 'development' instead.
const BASE_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://bargain-web-scraper-8bbn.onrender.com';

/** Fetches the deals, waiting out the backend's "still loading" state for up to ~2 minutes. */
export async function getDeals(signal?: AbortSignal): Promise<Deal[]> {
    const deadline = Date.now() + 120_000;

    while (true) {
        // Plain GET: no custom headers (they would trigger a CORS preflight the API doesn't answer)
        // and no `cache` option (the browser's HTTP cache handles ETags and gzip for us).
        const response = await fetch(`${BASE_URL}/v1/deals`, { signal });

        if (response.ok) {
            return response.json();
        }
        if (response.status === 503 && Date.now() < deadline) {
            const seconds = Number(response.headers.get('Retry-After')) || 10;
            await new Promise((resolve) => setTimeout(resolve, Math.max(seconds, 1) * 1000));
            continue;
        }
        throw new Error(`Deals request failed: ${response.status}`);
    }
}
```

- **Loading UI:** while this is retrying, keep showing "Loading deals…". Only show the error state once it throws.
- **Abort:** pass an `AbortSignal` (e.g. from a `useEffect` cleanup), so retries stop when the user leaves the page.
- **Data libraries:** if you use React Query or SWR, set `staleTime` to at least `60_000`, and don't use their own retry for 503s on top of this loop.

---

## Caching and ETags

The backend builds the response once per scrape and sends these headers:

| Header | Value | What it means for the frontend |
|---|---|---|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | For 60s, repeat requests are answered **from the browser cache** with no network request. For up to 5 minutes after that, the cached copy may be shown while the browser re-checks in the background. |
| `ETag` | e.g. `"k3j9x"`, or `"k3j9x-gz"` for gzip | When re-checking, the browser automatically sends `If-None-Match`. If the deals haven't changed, the server replies `304` with no body, and your `fetch` still sees a normal `200` with the cached JSON. |
| `Content-Encoding` | `gzip` (when the browser accepts it) | Decompressed automatically by the browser. |
| `Vary` | `Accept-Encoding` | Keeps the gzip and plain versions apart in caches. |

**You don't need to write any ETag code.** All of this happens inside the browser, provided the request is a plain `fetch` (see above). Things that break it:

- `fetch(url, { cache: 'no-store' })` or `'reload'`, which skip the cache and always download the full list;
- adding query strings like `?t=${Date.now()}` to "bust the cache";
- polling more often than every 60s, which only hits the browser cache anyway.

The data itself refreshes every 5 minutes, so polling every 1–5 minutes (or refetching when the tab regains focus) is plenty.

---

## CORS

The frontend (Netlify) and backend (Render) are on different domains, so the browser applies CORS rules:

| | |
|---|---|
| Allowed origins | `*` (any) |
| Readable response headers | The browser defaults, plus `Retry-After` and `ETag` |
| Allowed requests | Simple `GET`s only |

**Don't add custom request headers** (for example `Content-Type` or `Authorization` on a GET). That turns the request into a "preflighted" one, the browser first sends an `OPTIONS` request, the API doesn't handle `OPTIONS`, and the real request is blocked. A plain `fetch(url)` needs nothing extra.

---

## `GET /health` (optional)

Useful for a status banner ("Deals updating…" or "Source unavailable") or for debugging. You don't need it to show deals.

```ts
interface Health {
    ok: true;
    /** False until the first successful scrape; while false, /v1/deals answers 503. */
    ready: boolean;
    /** How many deals /v1/deals currently returns. */
    deals: number;
    /** The latest scrape result per retailer, e.g. runs.jd. */
    runs: Record<string, {
        status: 'ok' | 'incomplete' | 'held' | 'failed';
        at: string;        // ISO time the scrape started
        ms: number;        // how long it took
        products?: number; // products held for this retailer after the scrape
        added?: number;
        removed?: number;
        error?: string;    // when status is 'failed'
    }>;
}
```

`ok` is always `true` while the process is up. Use `ready` and `runs` to judge data freshness.

---

## What changed from the old backend

| Area | Old backend | New backend | Frontend action |
|---|---|---|---|
| Endpoint | `/webscrape/getBestDeals` | **`/v1/deals`** (old path still works) | Switch to `/v1/deals` |
| Prices | Once formatted strings (`"£54.99"`) | Always numbers in GBP | Remove any string-to-number conversion |
| `inStock` field | `"IN STOCK"` | **Removed**; every listed deal is in stock | Remove it from the type |
| `gender` | `"Male"` / `"Female"` | Adds **`"Unisex"`** | Handle it in any gender filter |
| `sizes` | Array or missing | Missing when unknown (never `[]`) | Keep treating it as optional |
| `timestamp` | Reset daily | First seen by the current backend process | See caveats |
| Loading state | Empty list `[]` after a restart | **`503` + `Retry-After`** until the first scrape | Retry instead of showing "No items" or the error page |
| Sold-out items | Shown for up to 24h | Gone within about 5 minutes | — |
| Caching | None | `Cache-Control` + ETag/304 + gzip | Use a plain `fetch` |
| Removed endpoints | `/firebase/*`, `/telegram/*`, `/client/*` | — | Remove any calls to them |

## Caveats

- **`timestamp` resets on every backend deploy or restart.** The backend keeps everything in memory, so right after a deploy every deal shows the same "found" time. Prefer a relative label ("found 2h ago"), and consider hiding it when it's within a few minutes of the backend starting.
- **`gender` comes from the sale listing URL**, not the product itself, so treat it as a hint.
- **One retailer (JD Sports UK) today.** More retailers would appear in the same list with the same shape; nothing in this contract would change.
