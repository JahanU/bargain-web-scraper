# Backend v2

The deals API and scraper. It runs on Bun and Postgres (Supabase), with **zero runtime dependencies**: the HTTP server (`Bun.serve`), Postgres driver (`Bun.sql`), gzip and hashing are all built into Bun.

```
Supabase pg_cron ──every 5 min──► POST /jobs/scrape ──► runScrape()
                                   (Bearer CRON_SECRET)    │  advisory lock: one run at a time
                                                           ▼
                                        JD (Algolia) ─► reconcile ─► Postgres `products`
                                                                        │
Frontend ──► GET /webscrape/getBestDeals ◄── DealsSnapshot ◄────────────┘
             GET /v1/deals                  (in memory: JSON + gzip + ETag, refreshed after each scrape)
```

## How items stay fresh

Every scrape reconciles each retailer in one transaction:

| Product on this run | Result |
|---|---|
| Listed and in stock | Upserted → `active` (price, sizes and discount refreshed) |
| Listed, out of stock | → `sold_out` |
| No longer listed | → `sold_out`, *unless* this run saw under 50% of the active products (then logged as `partial` and nothing is removed) |
| Sold out, then restocked | → `active` again |

Sold-out rows are deleted after 7 days by a daily cron job. Every run is logged in `scrape_runs`.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ "ok": true }` |
| GET | `/v1/deals` | Active deals with discount ≥ `MIN_DISCOUNT`, best first. Supports ETag/304 and gzip |
| GET | `/webscrape/getBestDeals` | Same payload. The path the current frontend calls |
| POST | `/jobs/scrape` | Needs `Authorization: Bearer $CRON_SECRET`. Returns `202 { started }` and scrapes in the background |

## Local development

```bash
cp .env.example .env        # fill in DATABASE_URL and CRON_SECRET
bun install                 # dev tooling only (types, tsc)
bun run db:migrate
bun run dev
```

Trigger a scrape:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:8000/jobs/scrape
```

Tests (the database tests run only when `TEST_DATABASE_URL` is set, and they reset that database):

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/bargain_test bun test
bun run typecheck
```

## Deploying

1. **Supabase:** create a project. Copy the **Session pooler** connection string (port 5432; the scrape lock needs session mode), then run `bun run db:migrate` with it as `DATABASE_URL`.
2. **Render:** create a web service with root `backend-v2`, build command `bun install`, start command `bun run start`, and env vars `DATABASE_URL`, `CRON_SECRET` and `MIN_DISCOUNT`.
3. **Cron:** in the Supabase SQL editor, run `db/cron.sql`, after first storing the service URL and secret in Vault as the file describes.
4. Watch `select * from scrape_runs order by id desc limit 20;` for a while, then point the frontend at the new service.
