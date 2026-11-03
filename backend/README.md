# Backend

The deals API and scraper. It runs on Bun with **zero runtime dependencies** and **no database**: the server (`Bun.serve`), file I/O, gzip and hashing are all built into Bun.

```
 on boot + every 5 min ──► scrapeAll() ──► JD (Algolia)
                               │
                               ▼
                 reconcile ──► Catalogue (Map in memory) ──► data/deals.json
                               │                             (saved after each scrape:
                               ▼                              temp file + atomic rename)
 Frontend ──► GET /webscrape/getBestDeals ◄── DealsSnapshot
              GET /v1/deals                  (JSON + gzip + ETag, rebuilt once per scrape)
```

## How items stay fresh

Each scrape reconciles every retailer into the catalogue:

| Product on this run | Result |
|---|---|
| Listed and in stock | Added or refreshed → `active` (price, sizes and discount updated) |
| Listed, out of stock | → `sold_out`, gone from the API |
| No longer listed | → `sold_out`, *unless* the listing was incomplete, or this run saw under 50% of the last complete run's count (stored per retailer). Then the run is logged as `partial` and nothing is removed; if the next run confirms the drop, even to zero, the products are removed then |
| Sold out, then restocked | → `active` again |
| Retailer request failed | Nothing changes; the last good deals keep being served, and the scrape is retried after 30s, 60s and 120s |
| Product in both men's and women's sales | Stored as `Unisex` |

Sold-out products are forgotten after 7 days.

### About the data file

On Render's free tier the disk is wiped on every deploy and restart. That's fine: everything in `deals.json` can be rebuilt, so the app re-scrapes on boot. Requests that arrive meanwhile wait for it, up to 30 seconds, then get a `503` with `Retry-After`. On a host with a persistent disk, the file also lets the app serve instantly after a restart.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` (also `/`) | `{ ok, deals, lastRuns }`. Cheap; use it for the keep-awake ping |
| GET | `/v1/deals` | Active deals with discount ≥ `MIN_DISCOUNT`, best first. Supports ETag/304 and gzip |
| GET | `/webscrape/getBestDeals` | Same payload. The path the current frontend calls |
| POST | `/jobs/scrape` | Manual run. Only works when `CRON_SECRET` is set; send `Authorization: Bearer $CRON_SECRET` |

## Local development

```bash
cp .env.example .env    # all settings are optional
bun install             # dev tooling only (types, tsc)
bun run dev
```

```bash
bun run check        # everything CI should run: typecheck + lint + tests with a coverage floor
bun test             # tests only
bun run lint:fix     # format and auto-fix lint issues
```

### Tooling

| Tool | What it does | Config |
|---|---|---|
| `tsc` | Strict type checking only (Bun runs the TypeScript directly) | `tsconfig.json` |
| Biome | Formatter and linter in one binary (4 spaces, single quotes, 120 columns, sorted imports, no `any`, no `!`) | `biome.json` |
| `bun test` | Tests and coverage; fails below 95% of lines or 85% of functions | `bunfig.toml` |

Import from `src` with the `@/` alias, e.g. `import { log } from '@/log'`. Bun resolves it from `tsconfig.json` at runtime and in tests, with no build step. All of these tools are dev-only; the app still has **zero runtime dependencies**.

## Deploying on Render

Create a web service with:

- **Root directory:** `backend`
- **Build command:** `bun install`
- **Start command:** `bun run start`

Optionally set `MIN_DISCOUNT`, `SCRAPE_INTERVAL_MINUTES` and `CRON_SECRET`. Point your existing keep-awake cron at `/health`.
