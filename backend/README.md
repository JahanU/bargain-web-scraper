# Backend

The deals API and scraper. It runs on Bun. Today the HTTP server is the one built into Bun, the deals are held in memory, and there are no runtime dependencies. Render compresses responses on the way out.

That is how it works now, not a rule. Add a library, a database or a search service whenever it is the better tool for the job.

```mermaid
flowchart TB
    subgraph loop["🔁 Scrape loop · one per retailer"]
        direction LR
        fetch["Fetch the sale listing<br/><small>one Algolia query, every page</small>"]
        parse["Parse products<br/><small>pence · sizes · gender · brand · category · blocklist</small>"]
        accept["DealStore.accept()<br/><small>rules R1 + R2</small>"]
        wait["Sleep 5 min<br/><small>after a failure: 15s → 30s → …</small>"]
        fetch --> parse --> accept --> wait
        wait -. next scrape .-> fetch
    end

    built["📦 Snapshot<br/><small>rebuilt after each scrape<br/>deals + search text + sort orders</small>"]
    client["🖥️ Frontend"]

    accept -- "deals ≥ MIN_DISCOUNT, best first" --> built
    client -- "GET /v2/deals?filters&sort&cursor" --> built
    built -- "200 one page + total + facets · 503 + Retry-After" --> client
```

## Rules

These are the behaviours the code is built around, and the end-to-end tests (`test/app.test.ts`) check each one.

| | Rule |
|---|---|
| **R1** | The deals served are the latest accepted listing. A product that sells out is simply gone. |
| **R2** | A bad fetch never wipes deals. A failed fetch keeps the previous list. An incomplete listing adds, refreshes and drops what it says is out of stock, but removes nothing else. A sudden drop of over 50% is held back once, then accepted if the next scrape confirms it (even at zero). This may be removed later: see [#59](https://github.com/JahanU/bargain-web-scraper/issues/59). |
| **R3** | Before the first good scrape, deal requests get an immediate `503` with `Retry-After: 10`, and the frontend retries. |
| **R4** | One loop per retailer, so its scrapes never overlap and one failing retailer never makes the others scrape more often: scrape, then sleep 5 minutes, or 15s, 30s, 60s… (capped at 5 minutes) after a failure. |
| **R5** | Deals are held in memory today, so the app scrapes on boot and "Found" is when this process first saw the item. Render's free tier wipes the disk, which is why nothing is saved yet. A current choice, not a constraint. |
| **R6** | The backend is the single source of truth for the list. `/v2/deals` filters, searches, sorts, counts and pages, so the browser never downloads the catalogue and a new retailer costs it nothing. Every request is a pure function of the latest snapshot and its validated query. |

How `DealStore.accept()` applies R1 and R2 to each scrape:

```mermaid
flowchart TD
    start(["Scrape finished"]) --> fetched{"Fetch<br/>succeeded?"}
    fetched -- no --> keep["Keep the current deals<br/><small>retry in 15s → 30s → 60s …</small>"]
    fetched -- yes --> complete{"Whole listing<br/>returned?"}
    complete -- "no (incomplete)" --> merge["Merge<br/><small>add new · update prices · drop items marked out of stock<br/>keep everything else</small>"]
    complete -- yes --> drop{"Fewer than half<br/>of current items?"}
    drop -- no --> replace["Replace<br/><small>the listing is the truth:<br/>missing or out-of-stock items are gone</small>"]
    drop -- "yes, first time" --> hold["Hold back once<br/><small>merge for now</small>"]
    drop -- "yes, again" --> replace

    classDef good fill:#e8f5e9,stroke:#43a047,color:#1b5e20
    classDef careful fill:#fff8e1,stroke:#f9a825,color:#5d4037
    classDef bad fill:#ffebee,stroke:#e53935,color:#b71c1c
    class replace good
    class merge,hold careful
    class keep bad
```

## Files

| File | What it does |
|---|---|
| `src/index.ts` | Entry point: reads config and starts the app |
| `src/app.ts` | Wires the store, a scrape loop per retailer and the server together |
| `src/deals.ts` | `DealStore`: applies R1 and R2, and builds the deals list (≥ `MIN_DISCOUNT`, best first) |
| `src/query.ts` | The snapshot built once per accepted scrape, and the pure query over it: filters, facet counts, sorts (a table) and keyset paging |
| `src/http.ts` | The boundary: parses and validates each query string (or answers 400), the deals response (JSON with caching headers, or 503 until ready), the routes, and request logging |
| `src/scraper.ts` | `scrapeRetailer` (one timed, failure-safe scrape) and the loop (R4) |
| `src/retailers/jd.ts` | JD adapter: learns JD's Algolia credentials once, queries the men's and women's sale directly, reads every page in parallel, and flags incomplete results |
| `src/retailers/blocklist.ts` | Names to skip (team kits, caps…), matched as whole words and plurals |
| `src/retailers/types.ts` | `Product`, `Listing` and `Retailer`. A new retailer is one new file plus one entry in `src/index.ts`: its id becomes a `store` value and its name a facet row, with no frontend change |
| `src/config.ts`, `src/log.ts` | Environment settings (validated at startup) and readable, levelled logging |

## Configuration

All settings are optional environment variables (see `.env.example`), validated at startup; an invalid value stops the app with a clear error.

| Variable | Default | Range | What it does |
|---|---|---|---|
| `PORT` | `8000` | 1–65535 | Port to listen on (Render sets this) |
| `MIN_DISCOUNT` | `30` | 0–100 | Lowest discount (%) served. Applied only when the deals list is built: the store keeps every in-stock sale item, so an item whose discount rises past the floor appears on the next scrape |
| `SCRAPE_INTERVAL_MINUTES` | `5` | 1–1440 | Time between scrapes per retailer. After a failure it retries sooner (15s, doubling, up to this) |
| `LOG_LEVEL` | `info` | `debug` `info` `warn` `error` `silent` | How much to log (see Logs) |

Settings are read once at startup, so a change needs a restart or redeploy.

## Endpoints

The full contract for the frontend (the `Deal` type, the loading state, caching, CORS) is in [`FRONTEND_API.md`](../FRONTEND_API.md).

| Method | Path | Notes |
|---|---|---|
| GET | `/health` (also `/`) | `{ ok, ready, deals, runs }`, where `runs` is the last result per retailer. Use it for the keep-awake ping |
| GET | `/v2/deals` | One page of deals as `{ items, total, nextCursor, trackingSince, facets }` (cached by browsers for 60s). Filters: `gender`, `category`, and repeatable `store`, `brand` and `size` (AND across parameters, OR within one), `q` (every word in the name, brand or store name) and `minDiscount`. `sort` picks one of four total orders, `limit` (1 to 100, default 60) the page size, and `cursor` continues from a previous `nextCursor`. `facets` (first page only) counts stores, brands, sizes and discount steps, each with every other filter applied but not its own. A bad parameter is a 400, even before the first scrape |
| GET | `/v1/deals`, `/v1/brands`, `/webscrape/getBestDeals` | Deprecated: the unpaged list and brand counts the deployed frontend still calls. Unchanged, and removed once the `/v2/deals` frontend is live |

### How a query runs

`buildSnapshot` runs once per accepted scrape. For each deal it precomputes the lowercased search text and the facet rows it counts towards, and it stores the deals in each of the four sort orders. A request then makes one pass over the already sorted rows: it tests each filter, counts facets, counts the total, and collects the page that starts strictly after the cursor's position. Nothing is sorted or rebuilt per request, and nothing is mutated.

A deal that passes every filter counts towards every facet. A deal that fails exactly one filter counts only towards that filter's own facet. That one rule gives "every other filter applied, but not its own" for all four facets.

The scan is linear in the number of deals served. On 20,000 synthetic deals a first page with a search word, two brands and a size took about 5.5ms (median of 200 runs, one core of a shared 2.1GHz Xeon VM), and an unfiltered first page about 10ms. That is fine to tens of thousands of deals on one instance. Past roughly 100,000 deals, or with more than one instance, move the snapshot behind an index or a database.

## Logs

One aligned, readable line per step, coloured in a terminal and plain text on Render:

```
09:41:02.121 INFO  app      ✓ listening on http://localhost:8000/  retailers=jd
09:41:02.122 INFO  scraper  ▶ scraping jd
09:41:03.010 INFO  scraper  ✓ jd scraped  status=ok products=312 added=4 removed=2 took=888ms
09:41:03.012 INFO  app      ✓ serving 280 deals
09:41:03.012 INFO  scraper  ⏱ jd: next scrape in 5m
09:41:07.441 INFO  http     GET /v2/deals → 200  took=0.4ms
09:46:03.990 ERROR scraper  ✗ jd scrape failed  error="Algolia search failed with status 503" took=410ms
09:46:03.991 WARN  scraper  ↻ jd: retrying in 15s  failures=1
```

| Symbol | Meaning |
|---|---|
| ▶ / ✓ / ✗ | step started / succeeded / failed (with an indented stack trace) |
| ⚠ | something the safety rules handled, e.g. a drop held back or an incomplete listing |
| ⏱ / ↻ | next scheduled scrape / retry after a failure |

Set `LOG_LEVEL=debug` to also see each Algolia page JD's scrape reads and the `/health` pings, which are hidden by default. Use `warn` or `error` for quieter logs, or `silent` (as the tests do). Colours: `FORCE_COLOR=1` or `NO_COLOR=1`.

If the scrape loop ever crashes (only possible through a bug), the process exits and Render restarts it, rather than serving stale deals.

## Development

```bash
cp .env.example .env   # all settings are optional
bun install            # dev tooling only
bun run dev
```

```bash
bun run check          # typecheck + lint + tests with a coverage floor (what CI runs)
bun test               # tests only
bun run lint:fix       # format and auto-fix lint issues
```

### Git hooks

`bun install` also installs the repo's git hooks (`.githooks/`, via `git config core.hooksPath`):

| Hook | Runs | Blocks |
|---|---|---|
| `pre-commit` | `bun run check:commit`: typecheck + lint/format (~1s) | the commit, if they fail |
| `pre-push` | `bun run check:push`: everything CI runs, including tests and coverage | the push, if they fail |

They only run for apps with changes (a docs-only commit runs nothing). Formatting fails? Run `bun run lint:fix`. In an emergency, `--no-verify` skips them; CI still checks everything.

Import from `src` with the `@/` alias (e.g. `import { createLogger } from '@/log'`). Bun resolves it from `tsconfig.json`, with no build step.

| Tool | Role | Config |
|---|---|---|
| `tsc` | Strict type checking only (Bun runs the TypeScript directly) | `tsconfig.json` |
| Biome | Formatter and linter | `biome.json` |
| `bun test` | Tests, silenced logs, and a coverage floor (95% of lines, 85% of functions) | `bunfig.toml` |

## Deploying on Render

- **Root directory:** `backend`
- **Build command:** `bun install`
- **Start command:** `bun run start`
- Optionally set `MIN_DISCOUNT`, `SCRAPE_INTERVAL_MINUTES` and `LOG_LEVEL` (see Configuration).
- Point the keep-awake ping at `/health`.
