# Code review fixes

Two rounds of code review. Every fix has a test that failed before the change.

- **Round 1:** 9 findings, 44 → 58 backend tests
- **Round 2:** 10 findings, 58 → 74 backend tests, plus 3 new frontend tests (76 in total)

# Round 1

| # | Problem | Severity | Fix | Files |
|---|---|---|---|---|
| 1 | Sold-out safety check could get stuck forever | 🔴 High | Compare against the previous run, not the current list | `store/catalogue.ts` |
| 2 | Listings over 1,000 products failed every scrape | 🔴 High | Read every page; mark truncated results incomplete | `retailers/jd.ts`, `retailers/types.ts` |
| 3 | One bad product in `deals.json` crashed boot | 🟠 Medium | Validate each saved product; skip bad ones | `store/file.ts` |
| 4 | `GET /` returned 404 | 🟠 Medium | `/` answers like `/health` | `app.ts` |
| 5 | `MIN_DISCOUNT=0` silently became 30 | 🟡 Low | Strict number parsing that fails fast | `config.ts` |
| 6 | Boot could serve `[]` instead of waiting | 🟡 Low | Only serve saved data if it has active deals | `app.ts` |
| 7 | Name filter stopped blocking plurals | 🟡 Low | Allow an optional trailing "s" | `scrape/filters.ts` |
| 8 | Per-retailer timing was wrong | 🟡 Low | Time each retailer on its own | `scrape/scrapeAll.ts` |
| 9 | A sync throw in an adapter sank the whole scrape | 🟡 Low | Wrap each fetch in an async function | `scrape/scrapeAll.ts` |

---

## 1. Sold-out safety check could get stuck forever

The check that stops a bad fetch from wiping the list compared this run against **the current active list**. If a sale genuinely shrank by more than half, the missing products were never removed. The active count therefore never dropped, so every later run was blocked too.

```
Before:  600 active → sale shrinks to 200
         run 1: 200 < 600 × 50% → blocked     (active still 600)
         run 2: 200 < 600 × 50% → blocked     (active still 600)
         run …: blocked forever → 400 delisted products shown indefinitely ❌

After:   compare against what the PREVIOUS RUN saw
         run 1: 200 < 600 × 50% → held back once  (previous run now = 200)
         run 2: 200 ≥ 200 × 50% → confirmed, 400 removed ✅
```

"What the previous run saw" comes from the catalogue itself: every product a run sees gets that run's timestamp, so it's the number of products sharing the newest `lastSeenAt`. No extra state is stored, and it survives restarts.

Trade-off: two bad fetches in a row would now be treated as real. That's unlikely, because a fetch error throws and a truncated result is marked incomplete (fix 2), so neither counts as a run.

> ⚠️ **Replaced in round 2 (fix R2-1).** Inferring "what the previous run saw" from shared timestamps had a hole: a run with zero products stamps nothing, so the count never updated. The count is now stored explicitly.

## 2. Listings over 1,000 products failed every scrape

Algolia returns at most 1,000 products per request. The scraper threw an error when a listing had more, so a big sale meant **no updates at all**.

```ts
// Before: one page, then give up
if (nbHits > hits.length) throw new Error(`only ${hits.length} were returned`);

// After: read every page (up to 10)...
for (let page = 0; page < MAX_PAGES; page++) { ... }
// ...and if Algolia still holds some back, keep what we got but say so
return { hits, complete: hits.length >= nbHits };
```

Retailers now return a `Listing` of `{ products, complete }`. When `complete` is false, reconcile **adds and refreshes but never removes**. New deals still appear, and nothing is wrongly marked sold out. This works for any future retailer, not just JD.

## 3. One bad product in `deals.json` crashed boot

The loader only checked the file's version. A product missing a field (for example `sizes`) loaded fine, then crashed the server while it built the first response. That happened outside the error handling, so Render would restart-loop.

**Fix:** every saved product is checked field by field. Bad entries are skipped with a warning, and the rest load normally.

## 4. `GET /` returned 404

The old backend answered `/`. If a keep-awake ping or Render's health check points there, a 404 can make deploys look unhealthy. `/` now returns the same response as `/health`.

## 5. `MIN_DISCOUNT=0` silently became 30

```ts
// Before: 0, "abc" and "3O" all quietly became 30
minDiscount: Number(env.MIN_DISCOUNT) || 30

// After: unset → default; valid → used as-is (0 stays 0); anything else → error on startup
minDiscount: numberSetting(env, 'MIN_DISCOUNT', 30, 0, 100)
```

The same strict check now covers `PORT` (1–65535) and `SCRAPE_INTERVAL_MINUTES` (at least 1).

## 6. Boot could serve `[]` instead of waiting

On startup, saved deals are served straight away, and otherwise requests wait a few seconds for the first scrape. The check used "does the file have any products?", which counts sold-out ones. It now checks "does the file have any **active deals**?", so visitors never see an empty page just because the saved products were all sold out.

## 7. Name filter stopped blocking plurals

The switch to whole-word matching (so "Capri" isn't blocked by "cap") also stopped blocking "Caps", "Teams" and "Basketballs". The pattern now allows an optional trailing "s":

```
\b(?:cap|team|…)\b    →    \b(?:cap|team|…)s?\b
"Nike Caps" ✅ blocked    "Nike Capri" ✅ allowed
```

## 8. Per-retailer timing was wrong

Every retailer's `ms` was measured after **all** retailers had finished, so a fast retailer reported the slowest one's time. Each fetch is now timed on its own, so `/health` and the logs show real durations.

## 9. A sync throw in an adapter sank the whole scrape

`retailers.map((r) => r.fetchListings())` ran inside `Promise.allSettled(...)`'s argument. A retailer that threw *synchronously* threw before `allSettled` could catch it. Each fetch now runs inside an `async` function, which turns any throw into a recorded failure for that one retailer while the others carry on.

---

# Round 2

Five of these came from round 1's fixes (marked 🔁), and five had been in the rewrite since the start.

| # | Problem | Severity | Fix | Files |
|---|---|---|---|---|
| R2-1 🔁 | A sale that ended completely was never cleared | 🔴 High | Store each retailer's last count explicitly, including zero | `store/catalogue.ts`, `store/file.ts` |
| R2-2 | Requests waiting for the boot scrape were dropped after 10s | 🔴 High | Raise the server idle timeout; cap the wait with a 503 | `http/dealsSnapshot.ts`, `index.ts` |
| R2-3 🔁 | Algolia's estimated count made listings look incomplete forever | 🟠 Medium | Trust a short last page when the count is flagged as an estimate | `retailers/jd.ts` |
| R2-4 | "Found 14:32" could mean a week ago | 🟠 Medium | Show the date when it isn't today | `frontend/…/formatFoundTime.ts` |
| R2-5 | One failed JD category threw away the others | 🟡 Low | Keep the categories that worked; mark the run incomplete | `retailers/jd.ts` |
| R2-6 🔁 | A huge scrape interval overflowed into non-stop scraping | 🟡 Low | Cap at one day | `config.ts` |
| R2-7 🔁 | `PORT=8000.5` or hex values were accepted | 🟡 Low | Whole numbers (plain digits) only | `config.ts` |
| R2-8 | gzip was sent to clients that refused it | 🟡 Low | Parse Accept-Encoding q-values | `http/dealsSnapshot.ts` |
| R2-9 | ETags missed weak `W/` and list forms; gzip and plain shared one ETag | 🟡 Low | Weak comparison; a separate ETag per encoding | `http/dealsSnapshot.ts` |
| R2-10 🔁 | Root cause of R2-1: a guessed value instead of a stored one | — | Covered by R2-1 | `store/catalogue.ts` |

The reproductions live in `test/round2.test.ts`. All 8 backend ones failed before the fixes (R2-4 is covered by the frontend spec, and R2-10 by R2-1's test).

## R2-1 · A sale that ended completely was never cleared (and R2-10, its root cause)

Round 1 worked out "what the previous run saw" by counting products that shared the newest timestamp. A run that finds **zero** in-stock products stamps nothing, so the count stayed at the old number forever:

```
Before:  run 1 sees 100 → sale ends → every run sees 0
         0 < 100 × 50% → blocked → baseline still 100 (nothing was stamped) → blocked forever ❌

After:   catalogue.lastInStock = { jd: 100 }       ← stored, not guessed
         run 2 sees 0 → held back once, baseline = 0
         run 3 sees 0 → 0 ≥ 0 → confirmed, all 100 removed ✅
```

- The count is saved in `deals.json` (file format v2). v1 files still load, using the active count as their starting baseline.
- Only a **complete** listing updates the count, so a truncated fetch can't lower it.
- This also removed a scan over the whole catalogue on every run.

## R2-2 · Requests waiting for the boot scrape were dropped after 10s

Right after a deploy, requests wait for the first scrape. But Bun closes a connection that sends nothing for **10 seconds** by default, so a slow JD meant a dropped connection instead of deals. I reproduced it: a 12-second wait gave `ECONNRESET`.

```
Before:  request ─── waits ─── 10s: Bun drops the connection ❌

After:   idleTimeout = 60s
         request ─── waits up to 30s ──► deals (200), or "still loading" (503 + Retry-After) ✅
```

After the fix, the same 12-second reproduction returns `200`. A test also ensures the wait (30s) always stays below the server timeout (60s).

## R2-3 · Algolia's estimated count made listings look incomplete forever

For large or complex searches, Algolia's `nbHits` can be an **estimate** (`exhaustiveNbHits: false`). If it estimated 1,012 but only 1,000 products really existed, every run looked "incomplete", so delisted products were never removed.

**Fix:** when Algolia flags its count as an estimate, a last page that comes back short is treated as the real end of the list. An *exact* count with missing products is still treated as incomplete, which is the round 1 truncation case.

## R2-4 · "Found 14:32" could mean a week ago

The old backend reset every item daily, so a bare time was fine. Items now persist until they sell out, so the frontend label shows the date when it isn't today:

```
Found today:     "Found 14:32"
Found earlier:   "Found 27 Oct, 09:05"
```

## R2-5 · One failed JD category threw away the others

With several JD category URLs, one timing out failed the whole retailer. Now the categories that worked are kept and the run is marked **incomplete**, so new deals still appear and nothing is wrongly removed. If every category fails, the run is still recorded as failed.

`createJDRetailer` now takes options (`{ fetch, listingUrls }`), which also makes it easier to test.

## R2-6 and R2-7 · Config edge cases

```
SCRAPE_INTERVAL_MINUTES=50000   Before: accepted → setInterval overflowed → scraped every 1ms ❌
                                After:  error (maximum 1440 = one day) ✅
PORT=8000.5 / 0x1F40 / 1e3      Before: accepted ❌
                                After:  error (plain whole numbers only) ✅
```

## R2-8 · gzip was sent to clients that refused it

`Accept-Encoding: gzip;q=0` means "never gzip", but the old check only looked for the word. The header is now parsed properly: `q=0` refuses, and an explicit gzip entry overrides a `*` wildcard.

## R2-9 · ETag matching

- `If-None-Match` now uses **weak comparison**, so `W/"abc"` and lists like `"x", "abc"` match. Proxies that recompress often weaken ETags.
- gzip and plain responses get **different** ETags (`"abc-gz"` and `"abc"`), so a cache can never hand gzip bytes to a client that asked for plain text.

---

## Verify

```bash
cd backend
bun test              # 74 pass
bun run typecheck
```

```bash
cd frontend
CI=true npm test      # 76 pass
```
