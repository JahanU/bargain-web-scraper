# Frontend ↔ Backend API contract

Everything the frontend needs to work with the backend: the query endpoint, the `Deal` type, paging, facet counts, the loading state, caching and CORS.

> **Source of truth:** the `Deal` type lives in `backend/src/deals.ts`, the query (filters, sorts, facets, paging) in `backend/src/query.ts`, and the HTTP behaviour (parameter validation, headers, 503) in `backend/src/http.ts`. If any of them changes, update this document in the same PR.

## TL;DR checklist

- [ ] Call **`GET /v2/deals`** for everything: it filters, searches, sorts, counts and pages on the server. The browser never holds the whole catalogue.
- [ ] Send every choice the user makes as a query parameter. Read the list from `items`, the result count from `total`, and the filter options with their counts from `facets`.
- [ ] Load more by sending the previous response's `nextCursor` back as `cursor`, with the other parameters unchanged. Stop when it is `null`.
- [ ] `facets` is only on the first page (a request without `cursor`). Keep the copy you have while paging.
- [ ] Handle **`503` = "still loading"**: wait `Retry-After` seconds and retry. Keep retrying for about **2 minutes**, not 3 tries.
- [ ] Use a **plain `fetch(url)`**: no custom headers and no `cache: 'no-store'`. The browser then handles caching and decompression for you.
- [ ] Use **`deal.url` as the React key**. It is unique per product.
- [ ] `sizes` and `imageUrl` can be **missing**. Prices are **numbers in GBP**.
- [ ] `/v1/deals`, `/v1/brands` and `/webscrape/getBestDeals` are **deprecated**. Do not use them in new code.

---

## Base URLs

| Environment | Base URL |
|---|---|
| Local | `http://localhost:8000` |
| Production | `https://bargain-web-scraper-8bbn.onrender.com` |

## Endpoints

| Method | Path | Use it for |
|---|---|---|
| `GET` | **`/v2/deals`** | **One page of deals** matching the query, with the total and the facet counts. |
| `GET` | `/health` (also `/`) | Backend status (optional: a status banner, debugging) |
| `GET` | `/v1/deals`, `/v1/brands`, `/webscrape/getBestDeals` | **Deprecated.** See [Deprecated v1 routes](#deprecated-v1-routes). |

Anything else returns `404` with `{ "error": "Not Found" }`.

---

## `GET /v2/deals`

### Parameters

All are optional. Different parameters combine with AND. A parameter marked repeatable can be sent several times, and a deal matches if it matches any of the values (OR).

| Parameter | Values | Behaviour |
|---|---|---|
| `gender` | `Male`, `Female` or `Unisex` | Only deals with exactly that `gender` (unisex items appear only under `Unisex`). |
| `category` | `Shoes`, `Clothes` or `Accessories` | Only deals with exactly that `category`. |
| `store` (repeatable) | A store id from `facets.stores`, e.g. `jd` | Only deals from that store. An id the backend does not scrape is a `400`. |
| `brand` (repeatable) | A brand exactly as `deal.brand` and `facets.brands` give it (case-sensitive) | Only deals of that brand. A brand no current deal has is not an error, it matches nothing. |
| `size` (repeatable) | A size exactly as `deal.sizes` and `facets.sizes` give it | Only deals that have that size in stock. A size no deal has matches nothing. |
| `q` | Free text, 1 to 64 characters after trimming | Split on whitespace into words. A deal matches when **every** word appears, in any case and as part of a longer word, in its name, its brand or its store's name. `q=nike air` finds "Nike Air Max 90", and `q=jd fleece` finds fleeces sold by JD Sports. |
| `minDiscount` | Whole number `0` to `100` | Only deals with `discount` at or above it. The backend's own floor (`MIN_DISCOUNT`, 30 by default) always applies as well, so a value below the floor changes nothing. |
| `sort` | `discount-high-to-low` (default), `discount-low-to-high`, `price-low-to-high`, `price-high-to-low` | The order of `items`. See [Sorting](#sorting). |
| `limit` | Whole number `1` to `100`, default `60` | The most deals in one page. |
| `cursor` | The `nextCursor` of a previous response | Continue after that page. See [Paging](#paging). |

Brands and sizes come and go with stock every five minutes, so an unknown one matches nothing and a saved or shared link keeps working. The set of stores only changes with a deploy, so an unknown store is treated as a mistake.

Build the query with `URLSearchParams` so names with spaces or `&` are encoded:

```ts
const params = new URLSearchParams();
if (gender) params.set('gender', gender);
if (category) params.set('category', category);
for (const store of stores) params.append('store', store);
for (const brand of brands) params.append('brand', brand);
for (const size of sizes) params.append('size', size);
if (search.trim()) params.set('q', search.trim());
if (minDiscount) params.set('minDiscount', String(minDiscount));
params.set('sort', sort);
if (cursor) params.set('cursor', cursor);
const response = await fetch(`${BASE_URL}/v2/deals?${params}`);
```

Leave a parameter out rather than sending it empty: an empty `q`, `brand`, `size`, `limit` and so on is a `400`.

### Response: `200 OK`

```ts
export interface DealPage {
    /** One page of matching deals, in the order `sort` asks for. */
    items: Deal[];
    /** How many deals match the filters across all pages. */
    total: number;
    /** Send it back as `cursor` for the next page. null on the last page. */
    nextCursor: string | null;
    /** The earliest `timestamp` among every deal the backend serves, not only the matches. */
    trackingSince: number;
    /** Only when the request had no `cursor`. */
    facets?: Facets;
}

export interface Facets {
    /** Every store the backend scrapes, in a fixed order, including those with a count of 0. */
    stores: { store: string; name: string; count: number }[];
    /** Brands with at least one deal: most deals first, then by name. */
    brands: { brand: string; count: number }[];
    /** Sizes with at least one deal: most deals first, then by label. */
    sizes: { size: string; count: number }[];
    /** One row per multiple of 10, from the first one at or above the backend's floor up to 100. */
    discounts: { minDiscount: number; count: number }[];
}

/** One deal. Mirrors `Deal` in backend/src/deals.ts. */
export interface Deal {
    name: string;
    /** Original price in GBP, e.g. 135. Can be 0 if the store didn't provide it. */
    wasPrice: number;
    /** Sale price in GBP, e.g. 54.99. */
    nowPrice: number;
    /** Whole-number percent off, e.g. 60. Always at or above the backend's MIN_DISCOUNT (30 by default). */
    discount: number;
    /** The product page. Unique per product, so use it as the React key. */
    url: string;
    /** Product image. The key is absent if the store had none. */
    imageUrl?: string;
    /** Sizes in stock, e.g. ["7", "8", "9"]. The key is absent if unknown. */
    sizes?: string[];
    /** When the backend first saw this product in the sale, in ms since epoch (see caveats). */
    timestamp: number;
    /** From the sale listing it came from; "Unisex" if it's in both men's and women's sales. */
    gender: 'Male' | 'Female' | 'Unisex';
    /** The brand as the store spells it, e.g. "Nike", "adidas", "The North Face". Always present. */
    brand: string;
    /** Always present. */
    category: 'Shoes' | 'Clothes' | 'Accessories';
    /** The id of the store selling it, e.g. "jd". Its display name is in `facets.stores`. */
    store: string;
}
```

Example, `GET /v2/deals?gender=Male&category=Shoes&limit=1`:

```json
{
  "items": [
    {
      "name": "Nike Air Max 90",
      "wasPrice": 135,
      "nowPrice": 54.99,
      "discount": 60,
      "url": "https://www.jdsports.co.uk/product/black-nike-air-max-90/19686180/",
      "imageUrl": "https://i8.amplience.net/i/jpl/jd_752441_plc",
      "sizes": ["7", "8", "9"],
      "timestamp": 1793703053984,
      "gender": "Male",
      "brand": "Nike",
      "category": "Shoes",
      "store": "jd"
    }
  ],
  "total": 272,
  "nextCursor": "WzYwLDU0Ljk5LCJodHRwczovLy4uLiJd",
  "trackingSince": 1793703053984,
  "facets": {
    "stores": [{ "store": "jd", "name": "JD Sports", "count": 272 }],
    "brands": [{ "brand": "adidas", "count": 109 }, { "brand": "Fila", "count": 33 }],
    "sizes": [{ "size": "8", "count": 207 }, { "size": "10", "count": 198 }],
    "discounts": [{ "minDiscount": 30, "count": 272 }, { "minDiscount": 40, "count": 101 }]
  }
}
```

When nothing matches, `items` is `[]`, `total` is `0` and `nextCursor` is `null`. That is a valid state, not an error.

Notes on the data:

| Field | What to know |
|---|---|
| Prices | Numbers in pounds (never strings like `"£54.99"`). Format with `new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`. |
| `sizes` / `imageUrl` | Optional: the key is missing rather than `null` or `[]`. Show "N/A" or a placeholder. A deal without `sizes` never matches a `size` filter. |
| `trackingSince` | Deals whose `timestamp` is later than this were first seen after the backend's first scrape, so they are new. It is `0` while the backend serves no deals at all. |
| Sold-out items | Removed by the backend within about 5 minutes. Everything served was in stock at the last scrape. |

### Sorting

| `sort` | Order | Ties |
|---|---|---|
| `discount-high-to-low` (default) | Biggest discount first | Cheapest first |
| `discount-low-to-high` | Smallest discount first | Cheapest first |
| `price-low-to-high` | Cheapest first | Biggest discount first |
| `price-high-to-low` | Dearest first | Biggest discount first |

Deals still tied after that are ordered by `url` ascending (plain string comparison), so every sort is a total order and paging is deterministic.

### Facets

`facets` holds the options for each filter and how many deals each option would give. Each facet is counted with every **other** filter applied but **not its own** (standard disjunctive faceting). Selecting Nike therefore does not shrink the brand list to Nike, but it does change the store, size and discount counts.

The rule, exactly: a row's `count` equals the `total` of the same request with that facet's parameter set to only that row's value.

| Facet row | Equals `total` of the same request with |
|---|---|
| `brands`: `{ "brand": "Nike", "count": 41 }` | `brand=Nike` as the only `brand` |
| `stores`: `{ "store": "jd", "count": 123 }` | `store=jd` as the only `store` |
| `sizes`: `{ "size": "9", "count": 18 }` | `size=9` as the only `size` |
| `discounts`: `{ "minDiscount": 40, "count": 101 }` | `minDiscount=40` |

`gender`, `category` and `q` have no facet. They always narrow every facet.

`stores` always lists every store the backend scrapes, even at a count of 0, so the store filter never loses an option. `brands` and `sizes` list only values with a count above 0, so a selected brand or size can be absent from its facet when the other filters exclude it. Keep showing the user's selection in that case.

`facets` is left out of responses to a request with `cursor`. The counts do not depend on the page, so reuse the ones from the first page.

### Paging

Paging is by cursor (keyset), not by offset.

1. Request the first page without `cursor`.
2. If `nextCursor` is not `null`, request the next page with `cursor=<nextCursor>` and **the same other parameters**.
3. Repeat until `nextCursor` is `null`.

The cursor is an opaque string: do not parse or build it. It records the position of the last deal of the page in the sort order, and the next page is every match strictly after that position. Because it is a position rather than a page number, a scrape landing between two page requests cannot make a deal appear twice or make a deal that is still on sale be skipped. Deals that sold out since are simply not returned, and a new deal that sorts before your position shows up when the list is next loaded from the start. `total` is recomputed on every request, so it can change by a few between pages.

A cursor is only meaningful with the `sort` it was issued for. When the user changes any filter or the sort, drop the cursor and start again from the first page. A cursor never expires.

### Response: `503 Service Unavailable` (still loading)

Right after the backend starts (deploys, restarts), it has no data until its first scrape finishes, usually within seconds. Until then:

```
HTTP/1.1 503 Service Unavailable
Retry-After: 10
Content-Type: application/json

{ "error": "Deals are loading, try again shortly" }
```

The frontend should show a loading state, wait `Retry-After` seconds, and try again. If a store itself is down at that moment, the backend retries after 15s, 30s, 60s and so on, so **keep retrying for about 2 minutes** before showing an error.

### Errors

A bad parameter is a `400` with `{ "error": "<message>" }`. The query is validated before anything else, so a bad one is a `400` even while the backend is still loading: retrying will not fix it.

| Status | `error` | When |
|---|---|---|
| `400` | `gender must be one of Male, Female, Unisex` | Unknown or empty `gender` |
| `400` | `category must be one of Shoes, Clothes, Accessories` | Unknown or empty `category` |
| `400` | `store must be one of jd` (lists every store id) | A `store` the backend does not scrape, or an empty one |
| `400` | `brand must not be empty` | An empty or whitespace-only `brand` |
| `400` | `size must not be empty` | An empty or whitespace-only `size` |
| `400` | `q must be 1 to 64 characters` | `q` is empty, only whitespace, or longer than 64 characters after trimming |
| `400` | `minDiscount must be a whole number from 0 to 100` | Anything but plain digits in that range |
| `400` | `sort must be one of discount-high-to-low, discount-low-to-high, price-low-to-high, price-high-to-low` | Unknown or empty `sort` |
| `400` | `limit must be a whole number from 1 to 100` | Anything but plain digits in that range |
| `400` | `cursor is not valid` | A `cursor` that is not a `nextCursor` value |
| `404` | `Not Found` | Wrong path |
| `500` / `502` | Possibly **not JSON** (Bun's or Render's error page) | Backend crashed or is restarting. Treat it as a network error and retry later. |

When a single-valued parameter (`gender`, `category`, `q`, `minDiscount`, `sort`, `limit`, `cursor`) is sent more than once, the first value is used.

Always check `response.ok` / `response.status` before calling `.json()`.

---

## Recommended fetch logic

```ts
// Vite shown; with Create React App use process.env.NODE_ENV === 'development' instead.
const BASE_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://bargain-web-scraper-8bbn.onrender.com';

/** Fetches one page of deals, waiting out the backend's "still loading" state for up to ~2 minutes. */
export async function getDeals(params: URLSearchParams, signal?: AbortSignal): Promise<DealPage> {
    const deadline = Date.now() + 120_000;

    while (true) {
        // Plain GET: no custom headers (they would trigger a CORS preflight the API doesn't answer)
        // and no `cache` option (the browser's HTTP cache does the caching for us).
        const response = await fetch(`${BASE_URL}/v2/deals?${params}`, { signal });

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
- **Abort:** pass an `AbortSignal` (e.g. from a `useEffect` cleanup), so retries stop when the user leaves the page and a stale answer cannot overwrite a newer one.
- **Search box:** debounce typing (about 250ms) so each keystroke is not a request.
- **Data libraries:** if you use React Query or SWR, set `staleTime` to at least `60_000`, and don't use their own retry for 503s on top of this loop.

---

## Caching and compression

| Header | Value | What it means for the frontend |
|---|---|---|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | For 60s, repeat requests are answered **from the browser cache** with no network request. For up to 5 minutes after that, the cached copy may be shown while the browser fetches a fresh one in the background. |
| `Content-Encoding` | `br` (Brotli) or `gzip`, added by Render | Decompressed automatically by the browser. |

**You don't need any caching or compression code.** It all happens inside the browser, provided the request is a plain `fetch` (see above). Things that break it:

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
| Readable response headers | The browser defaults, plus `Retry-After` |
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

## Deprecated v1 routes

`/v1/deals`, `/v1/brands` and `/webscrape/getBestDeals` still answer exactly as before, only because the deployed frontend calls them. They will be removed once the frontend built on `/v2/deals` is live. Do not use them in new code.

| Path | What it returns |
|---|---|
| `GET /v1/deals` and `GET /webscrape/getBestDeals` | A JSON array of **every** matching `Deal`, sorted by discount (highest first), then price (cheapest first). Optional `gender`, `category` and repeatable `brand`, validated as in v2. No search, sizes, sorting, counts or paging. |
| `GET /v1/brands` | `[{ "brand": "Nike", "count": 41 }]` for the deals matching `gender` and `category`, most deals first, then by name. Any `brand` parameter is ignored. |

They share the `503`, `Cache-Control` and CORS behaviour described above. The only change to them is that each deal now also carries `store`.

Moving from v1 to v2:

| v1 | v2 |
|---|---|
| The response is the array of deals | The deals are in `items` |
| `array.length` | `total` |
| `/v1/brands` | `facets.brands` in the same response |
| Search, sizes, the discount slider and sorting done in the browser | `q`, `size`, `minDiscount` and `sort` parameters |
| The whole list in one response | Pages of `limit`, continued with `cursor` |

## Caveats

- **`timestamp` resets on every backend deploy or restart**, and when an item sells out and later comes back. The backend keeps everything in memory, so right after a deploy every deal shows the same "found" time. Prefer a relative label ("found 2h ago"), and use `trackingSince` to tell which deals are new.
- **`gender` comes from the sale listing URL**, not the product itself, so treat it as a hint.
- **`brand` and `category` come from the store's own product data.** A product with no brand or no recognisable category is left out (the backend logs how many per scrape).
- **Two requests can straddle a scrape** (or one can come from the browser cache), so a facet count and the `total` of a later request can differ briefly around a refresh.
- **One store (JD Sports UK) today.** A new store appears as a new row in `facets.stores` and a new `store` value on deals. Nothing else in this contract changes.
