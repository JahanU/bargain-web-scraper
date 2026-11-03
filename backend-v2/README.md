# Backend v2

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
| No longer listed | → `sold_out`, *unless* this run saw under 50% of the active products (then logged as `partial` and nothing is removed) |
| Sold out, then restocked | → `active` again |
| Retailer request failed | Nothing changes; the last good deals keep being served |

Sold-out products are forgotten after 7 days.

### About the data file

On Render's free tier the disk is wiped on every deploy and restart. That's fine: everything in `deals.json` can be rebuilt, so the app re-scrapes on boot, and requests that arrive meanwhile wait a few seconds for it. On a host with a persistent disk, the file also lets the app serve instantly after a restart.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ ok, deals, lastRuns }`. Cheap; use it for the keep-awake ping |
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
bun test
bun run typecheck
```

## Deploying on Render

Create a web service with:

- **Root directory:** `backend-v2`
- **Build command:** `bun install`
- **Start command:** `bun run start`

Optionally set `MIN_DISCOUNT`, `SCRAPE_INTERVAL_MINUTES` and `CRON_SECRET`. Point your existing keep-awake cron at `/health`.
