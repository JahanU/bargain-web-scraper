# Backend

The deals API and scraper. It runs on Bun with **zero runtime dependencies**: the HTTP server, gzip and hashing are built into Bun, and everything is held in memory.

```
 scrape loop (one per retailer)                       requests
 ───────────────────────────                          ────────
 JD (Algolia) ─► Listing ─► DealStore.accept() ─► DealsResponse ◄── GET /webscrape/getBestDeals
                            (rules R1, R2)        (JSON + gzip +      GET /v1/deals
      ▲                                            ETag, built once
      └── sleep 5 min (or 15s → 30s → … after a failure)   per scrape)
```

## Rules

These are the behaviours the code is built around, and the end-to-end tests (`test/app.test.ts`) check each one.

| | Rule |
|---|---|
| **R1** | The deals served are the latest accepted listing. A product that sells out is simply gone. |
| **R2** | A bad fetch never wipes deals. A failed fetch keeps the previous list. An incomplete listing adds, refreshes and drops what it says is out of stock, but removes nothing else. A sudden drop of over 50% is held back once, then accepted if the next scrape confirms it (even at zero). |
| **R3** | Before the first good scrape, deal requests get an immediate `503` with `Retry-After: 10`, and the frontend retries. |
| **R4** | One loop per retailer, so its scrapes never overlap and one failing retailer never makes the others scrape more often: scrape, then sleep 5 minutes, or 15s, 30s, 60s… (capped at 5 minutes) after a failure. |
| **R5** | Memory only. Render's free tier wipes the disk anyway, so the app scrapes on boot. "Found" is when this process first saw the item. |

## Files

| File | What it does |
|---|---|
| `src/index.ts` | Entry point: reads config and starts the app |
| `src/app.ts` | Wires the store, a scrape loop per retailer and the server together |
| `src/deals.ts` | `DealStore`: applies R1 and R2, and builds the deals list (≥ `MIN_DISCOUNT`, best first) |
| `src/http.ts` | `DealsResponse` (pre-built JSON, gzip, ETag/304, 503 until ready) and the routes |
| `src/scraper.ts` | `scrapeRetailer` (one timed, failure-safe scrape) and the loop (R4) |
| `src/retailers/jd.ts` | JD adapter: learns JD's Algolia settings from a listing page, reads every page, and flags incomplete results |
| `src/retailers/blocklist.ts` | Names to skip (team kits, caps…), matched as whole words and plurals |
| `src/retailers/types.ts` | `Product`, `Listing` and `Retailer`. A new retailer is one new file |
| `src/config.ts`, `src/log.ts` | Environment settings (validated at startup) and JSON-line logging |

## Endpoints

The full contract for the frontend (the `Deal` type, the loading state, caching, CORS) is in [`FRONTEND_API.md`](../FRONTEND_API.md).

| Method | Path | Notes |
|---|---|---|
| GET | `/health` (also `/`) | `{ ok, ready, deals, runs }`, where `runs` is the last result per retailer. Use it for the keep-awake ping |
| GET | `/v1/deals` | Deals, best first. ETag/304 and gzip |
| GET | `/webscrape/getBestDeals` | Same payload; the path the frontend calls |

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

Import from `src` with the `@/` alias (e.g. `import { log } from '@/log'`). Bun resolves it from `tsconfig.json`, with no build step.

| Tool | Role | Config |
|---|---|---|
| `tsc` | Strict type checking only (Bun runs the TypeScript directly) | `tsconfig.json` |
| Biome | Formatter and linter | `biome.json` |
| `bun test` | Tests, silenced logs, and a coverage floor (95% of lines, 85% of functions) | `bunfig.toml` |

## Deploying on Render

- **Root directory:** `backend`
- **Build command:** `bun install`
- **Start command:** `bun run start`
- Optionally set `MIN_DISCOUNT` and `SCRAPE_INTERVAL_MINUTES`.
- Point the keep-awake ping at `/health`.
