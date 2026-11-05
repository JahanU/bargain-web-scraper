# Frontend rewrite: implementation notes

Running log for the rewrite in `docs/frontend-rewrite-spec.md`. It records where the engineering
guide ([andrej-karpathy-skills CLAUDE.md](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/CLAUDE.md))
conflicted with the spec, where the spec and the backend code disagree, and calls made inside a phase.

Precedence: backend code > spec > guide.

**Owner's standing instruction (5 Nov):** anything flexible (budgets, small spec gaps) must not block the rewrite. Make the sensible call, record it here, and it gets reviewed afterwards.

## Guide vs spec (spec wins)

| Guide says | Spec says | What was done |
| --- | --- | --- |
| Surgical changes: touch only what you must, don't delete pre-existing dead code | Ground-up replacement of `frontend/` | Whole CRA app deleted (phase 0). |
| No abstractions for single-use code, no unrequested flexibility | Filter registry as an extension point, feature folders with `index.ts`, shared UI primitives, for a single page | Will follow the spec in phases 1, 3 and 5. |
| Nothing speculative | Phase 0 sets up tooling before anything uses it | Added as specced: an MSW server with no handlers, boundary lint rules for folders that don't exist yet, a Mobile Safari Playwright project CI doesn't run, a `/fonts/*` cache header before there is a font. |

## Spec vs backend (backend wins)

| Spec | Backend code | Effect |
| --- | --- | --- |
| State-flow diagram labels the request `GET /webscrape/getBestDeals` | Both paths answer; `FRONTEND_API.md` says use `/v1/deals` (the spec's Data layer agrees) | Use `/v1/deals`. The diagram is a leftover. |
| `imageUrl` is "a bare `/i/jpl/<id>` path" | `jd.ts` passes JD's `image` through unchanged; tests show a full URL, `https://i8.amplience.net/i/jpl/jd_752441_plc` | Phase 2: the image builder takes an absolute URL and appends `w`, `h`, `qlt`, `fmt=auto`. |
| `gender` is `"Male" \| "Female" \| "Unisex"` | `Deal.gender` is typed `string`, though only those three values are produced | Phase 2: the schema will accept the three values. Flag if you'd rather it accept any string. |

## Calls made inside phases

### Phase 0

- Versions: the spec names Vite+ 1.4; 1.5.0 was the latest stable at scaffold time, so it's pinned at 1.5.0 (Vite 8.3, Vitest 5.1).
- `oxc-transform-react` is pinned at 0.156.0 because `@vitejs/plugin-react` 6.2.1 only accepts `>=0.152 <0.157`.
- "The four spec files": the spec doesn't name them. Kept `sort.spec.ts`, `urlParams.spec.ts`, `useFilterParams.spec.tsx` (named in phase 3) and `webScrape.service.spec.ts` (the price-coercion tests the file map says to keep), plus `mock-data.json`, in `frontend/legacy/`. Lint, format, types and tests ignore that folder; it is deleted once phases 2 and 3 port them.
- MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame`.
- `vitest-axe` 0.1 types its matcher on a legacy global namespace, so `src/test/vitest-axe.d.ts` re-declares it for Vitest.
- `playwright.config.ts` honours an optional `PLAYWRIGHT_CHROMIUM_PATH`, for machines with a preinstalled Chromium that doesn't match Playwright's version. CI installs its own.
- CI `frontend` job keeps `actions/setup-node` (pinned through `.node-version`) next to `setup-bun`, because Vite+ runs on Node and the spec needs Node 22.18 or later.
- The 90 percent coverage gate on `model` and `api` folders is added in phase 2, when those folders exist.

### Phase 1

- **Font budget vs font spec (conflict inside the spec).** Archivo with the full axes (weight 100–900, width 62–125) is 90 KB as a latin woff2, and 46 KB even cut down to the glyphs this page uses. The budget is 40 KB. The axes are narrowed to what the type scale uses (weight 400–800, width 90–125), and the glyphs to ASCII plus `£ · × ≥ − – — … ‘ ’ “ ”`: 39,960 bytes. A heavier or narrower cut, or a new character, means re-cutting the file (fonttools `varLib.instancer` then `pyftsubset`) or raising the budget.
- The fallback face's metric overrides were measured against Liberation Sans, which shares Arial's metrics.
- The traced emblem is 2.4 KB gzipped (spec: about 1–2 KB). Its strokes use the text colour so they stay visible in dark mode; the diamond uses the accent.
- **Dialog: Base UI or native `<dialog>`?** The stack table lists Base UI Dialog; the binding accessibility list says the mobile sheet is a native `dialog` opened modally. `shared/ui/Dialog` wraps Base UI (for AboutDialog), and phase 5's FilterSheet will be a native `<dialog>`. Say if you'd rather have one mechanism.
- **Telegram link left out.** The desktop layout shows "GitHub↗ Telegram↗", but the bot is gone from the backend and no Telegram URL appears anywhere in the repo or spec. Header has GitHub only.
- The header's deal count and the footer's last-updated time need data, so they arrive in phase 2.
- The theme toggle is a two-state "Dark theme" button (`aria-pressed`). A stored choice overrides the system from then on; there is no "back to system" option because the spec doesn't ask for one.
- Tailwind's default colour palette and radii are switched off in `theme.css`, so only the spec's tokens and the 2/4/6/8 px radii exist. Motion durations are `duration-fast`, `duration-base` and `duration-slow` utilities.

### Phase 2

- **Initial JavaScript budget can't be met with the specced stack (needs your call).** Measured gzipped, each in isolation: React + React DOM 19.3 is 67.2 KB (the spec assumed about 45), TanStack Query 10.5, zod/mini 7.2, the persister 2.7, three Lucide icons 2.5. Phase 2 builds at 96.99 KB against 90 KB; nuqs (phase 3) and Base UI (phase 5, about 15) will push it to about 120 KB. **Decision (owner, 5 Nov):** don't let the budget block the rewrite; review later. The limit now tracks measured + 10 % (107 KB at phase 2) and is raised the same way when a phase adds a library, each time noted here.
- **Fixed a persistence gap.** `main.tsx` prefetches before render, so the first response could land before the persister subscribed and never be saved. (Phase 3 replaced the first fix, which still raced; see below.) An e2e test (returning visitor, API down) covers it.
- Retry-After: the old spec treated an unreasonable value (99999) as "use 10 s"; this spec says clamp to 1–60, so it waits 60 s.
- "Three attempts" for network and 5xx is read as TanStack's three retries (four requests in all).
- An unknown `gender` becomes "Unisex" instead of dropping the deal, since the backend types it as a plain string.
- `070` counts as footwear and sorts as 70, after 12. Its real meaning is unknown.
- The fixture is the old `mock-data.json` converted to the current contract: bare absolute Amplience URLs, no `inStock`, backend sort order. `legacy/mock-data.json` and `legacy/webScrape.service.spec.ts` are deleted now that they're ported; the 503 cases from that spec live on in `dealsApi.test.ts`.
- `dev:mock` serves the fixture through MSW; add `?mock=loading`, `?mock=bad-gateway` or `?mock=offline` to see the failure states. `public/mockServiceWorker.js` is copied into `dist` but never loaded there, and no MSW code ends up in the production JavaScript.
- Tests get `VITE_API_URL` from `vite.config.ts` (`test.env`); `dev:mock` reads `.env.mock`.
- **Header deal count left out.** The layout shows "JD Sports UK · 81 deals" in the header, but the spec makes `DealsPage` the only reader of deal state and marks the header presentational; the count is in the results summary. The footer's "Last updated" is a small deals-feature component that reads the query (server state only).

### Phase 3

- **`useDealFacets` placement (conflict inside the spec).** The tree puts `useDealFacets(deals, values)` in `deals/`, but it needs filter values and deals must never import filters. It's `useDealFacets(deals)` in `deals/`, counting sizes over whatever list it gets; `useFilteredDeals` (filters) returns both the visible deals and the deals filtered by everything except sizes, and the page passes the latter in.
- **filters → deals carries one function, not only types.** Writing sizes "in canonical order" needs the size order, which lives in `deals/model/sizes.ts`, so the registry imports `compareSizes` from `@/features/deals`. Deals still never imports filters.
- **Persistence, done properly.** `PersistQueryClientProvider` saves in `onSuccess` but subscribes only after the next render, so a response landing in between was lost (the e2e test failed about 2 runs in 3). `main.tsx` now restores, subscribes, then prefetches, then renders (`persistQueryClient` from TanStack); `AppProviders` is a plain `QueryClientProvider`. Side benefit: a saved snapshot is in the cache before the first render. 5 of 5 runs pass.
- Sizes in a URL keep their given order when read (as before) and are written in canonical order.
- Search is trimmed when read and when written, and capped at 64 characters when read.
- `clearAll` resets the filters but keeps the sort, since sort isn't a filter.
- Discount is a filter only when it isn't the default (30), as the spec says ("composes only the active predicates"). That equals the backend floor today; if `MIN_DISCOUNT` is ever lowered, the default view would show deals under 30 %.
- Old toggle-to-clear sort behaviour is gone, as specced; a test pins it.
- Legacy specs are fully ported and `frontend/legacy/` is deleted.
- JS is 103.17 KB, under the interim 107 KB limit.

### Phase 4

- **Card name: content, not `aria-label` (spec code vs WCAG).** The spec's card sets `aria-label={describeDeal(deal)}`. axe in a real browser flags all 81 cards for "label in name" (WCAG 2.5.3): the label replaces the visible text, so speech-input users can't say what they see. The link is now named by its own content, with visually hidden words where a visual cue needs them ("was", ", 67% off", "Sizes", ", new"). Badges stay `aria-hidden`, so the price and discount are read once; a test pins the whole name.
- **NEW marker and "found" time vs the backend clock.** Timestamps reset on every deploy, so a plain "found under 2 h ago" would mark the whole list NEW after each deploy. The earliest timestamp in the full list is taken as the server start: deals from that batch show no found time and are never NEW; only later arrivals are. (The contract suggests hiding the label near backend start; this does that without calling `/health`.)
- Card titles are `h2`, not the spec's `h3`: axe flags a jump from the page `h1` straight to `h3`.
- The empty state gives one button per way out ("Show 12 deals at 50% or more", "Show 30 deals in any size", "Show 5 deals without the search", "Clear all filters") under a title like "No deals at 70% or more in size M", instead of the spec's longer sentence. The reasoning lives in `filters/model/explainEmpty.ts`; `EmptyState` only renders it. An empty backend list gets its own "No deals right now".
- The skeleton / empty / error / cards switch stays in `DealsPage`; `DealGrid` renders cards only.
- Phase 4's "Playwright screenshots at 390 px and 1280 px" are attached to the report, but not compared against baselines: this sandbox's Chromium (1243) and CI's (1248) render differently, so pixel baselines would fail on one of them. The same tests assert the behaviour: 2 and 5 columns, no horizontal scroll, layout shift under 0.05. Product images are stubbed in e2e, so tests never reach the CDN.
- "+N" for sizes: the narrow-screen variant (3 shown) is hidden from screen readers so the count isn't read twice; they hear the wide-screen one.
