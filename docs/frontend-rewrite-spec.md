<!-- Exported from the Claude Doc "Bargain Scraper Frontend Rewrite Spec"
     https://claude.ai/artifact/5eVTiThGoE9Fvcb8HM6VGN (rev 29, 2026-11-05).
     The doc is the editable source; this file is the in-repo copy for implementation sessions.
     Diagrams are rendered here as ASCII equivalents. An interactive HTML mockup of the UI
     lives next to this file: docs/frontend-mockup.html -->

# Bargain Scraper Frontend Rewrite Spec

Nov 3, 2026 · @Jahan

## Summary

We replace the `frontend/` app in place with a ground-up rewrite: same features (search, minimum discount, sizes, sort), same backend endpoint, same shareable URL parameters, but a maintained toolchain, one source of truth for state, a hand-crafted design that works on phones and desktops, and a structure where new filters or retailers are additive.

The current app is a 2022 Create React App build (React 17, Redux, Tailwind 3, Headless UI v1). It ships a 106 KB logo, full-resolution product images, no dark mode, no caching, a dead analytics tag, and size filters that cannot see footwear. None of that is fatal, but every improvement fights the toolchain, so a clean rewrite is cheaper than a migration.

**Goals the rewrite must hit**

- Fast: Lighthouse mobile performance 95 or better, accessibility 100, initial JavaScript at or under 90 KB gzipped, layout shift near zero.
- Shareable: every filter lives in the URL; links already shared through the Telegram bot keep working unchanged.
- Honest about the backend: the Render free tier sleeps, so the app renders the last good snapshot instantly and says when it is waking the server.
- Designed, not generated: a single coherent visual direction with semantic tokens, light and dark themes, and no default Tailwind UI look.
- Built for scale: feature-sliced folders with enforced import rules, a filter registry that makes a new filter a one-file change, and behaviour-based tests with CI gates.

**Scope of v1**: feature parity plus the full design, performance and architecture overhaul. No new product features.

## Decisions

These were settled with the owner before this spec was written.

| Decision | Choice | Consequence |
| --- | --- | --- |
| Where the rewrite lands | Replace `frontend/` in place on the feature branch | Netlify's base directory stays `frontend`, so cutover is just the merge. Old code stays in git history. |
| Scope of v1 | Parity plus polish | Search, minimum discount, sizes and sort, rebuilt properly. No favourites, no brand facet, no gender facet yet. |
| Brand mark | Keep the Hunter x Hunter emblem, traced to an inline SVG | The 106 KB PNG goes. The emblem's red diamond becomes the recurring accent motif. |
| Toolchain | Bun as package manager and runner; Vite+ 1.x for build, test, lint and format | One `vite.config.ts`, one `vp` command. Next.js and Bun's own bundler were considered and declined (see Target stack). |
| URL parameters | Keep `search`, `sort`, `sizes` and the existing sort ids; add `discount` | Links already shared through Telegram keep working. |
| Analytics | Remove entirely | The Universal Analytics tag stopped collecting in July 2023. Netlify Analytics is the zero-JavaScript option later. |
| Discount stops | 10 to 100 in steps of 10, as today | Keeps the familiar range. The backend floors at 30, so 10 and 20 return the same deals as 30; the control renders those two stops faint. |
| Default sort | Best discount, omitted from the URL | Matches today's no-sort behaviour because the backend already returns discount descending. |

## Audit of the current frontend

The app works, but each problem below either costs users directly or blocks improvement.

| Area | What is there today | Why it matters |
| --- | --- | --- |
| Toolchain | Create React App 5, React 17, TypeScript 4.5 targeting ES5, Jest via `react-scripts` | CRA is unmaintained. It blocks a clean React 19 upgrade and pins old Jest and ESLint. |
| State | Redux holds one number (discount). URL params hold search, sort and sizes. A local `useState` mirrors the slider. | Three sources of truth. Discount is not in the URL, so links are not fully shareable. Redux initialises discount to 0 while the slider shows 30. |
| Data fetching | A hand-rolled hook marked `// todo rewrite` | No cache, retry, timeout or revalidation, although the backend refreshes every 5 minutes. A Render cold start shows a bare error. |
| Size filter | Hard-coded XS to XXL | Real data has shoe sizes 3 to 12, XXXL, OS and LXL. Footwear can never be filtered. |
| Sort control | A Headless UI menu used as a listbox; clicking the active option clears the sort | Wrong ARIA pattern and a surprising toggle. The closed button never shows the current value. |
| Images | Full 726 by 926 source in a four-column grid | Roughly 180 KB per card, about 14 MB on a cold cache for 80 items. |
| Logo | 1024 pixel PNG, 106 KB, shown at 80 pixels | Wasted bytes on every first visit. The image has an empty alt. |
| Visual design | Default Tailwind UI boilerplate: grey nav strip, indigo menus, raw range input, "Loading" as text, centred text on everything | Reads as a template. No dark mode, no skeletons, no empty-state guidance. |
| Dead code | A gender component with commented-out handlers and duplicate ids, CRA spinner CSS, an unused web-vitals hook, an unused `react-ga` dependency, a 2022 "upcoming features" modal | Maintenance noise and a few kilobytes of bundle. |
| Analytics | Universal Analytics tag in the HTML head | Collects nothing since July 2023 and still costs a request. |
| Mobile | Filter bar wraps a 24 rem search box and two dropdowns; 10 rem gaps between grid rows | No sticky filters, no sheet pattern, wasteful vertical rhythm. |
| Deployment | No Netlify config in the repo, no SPA redirect, no frontend CI | Deep links depend on Netlify UI settings nobody can review in a pull request. |

## Backend contract

The backend was rewritten on the `feature/v2-rewrite` branch: Bun with zero runtime dependencies, one in-memory deal store, and a contract documented in `FRONTEND_API.md` at the repo root. The new frontend talks to one endpoint and may read one more for status.

- `GET /v1/deals` returns a JSON array of deals, already sorted by discount descending then price ascending. No query parameters, no pagination. An empty array is a valid state. The old `/webscrape/getBestDeals` path still answers but is legacy.
- **Until the first scrape finishes the endpoint answers `503` with `Retry-After: 10`** and a JSON error body. The frontend keeps retrying at that interval for about two minutes before it calls it an error, because the backend itself retries a failing retailer at 15, 30, 60 seconds and so on.
- Responses carry `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Compression is added by Render (Brotli or gzip), and the backend no longer sends its own ETags as of commit `78f1a58`. A plain `fetch(url)` with no custom headers and no `cache` option lets the browser handle caching and decompression; the frontend writes no caching code and is indifferent to whether an ETag is present. Custom headers would trigger a CORS preflight the API does not answer.
- CORS allows any origin and exposes `Retry-After`.
- Other statuses: `404` with `{ "error": "Not Found" }`; `500` or `502` may be a non-JSON platform page, so the client checks `response.ok` before parsing.
- Data refreshes every 5 minutes (configurable). Sold-out items disappear on the next scrape. A failed fetch never wipes the list, and a sudden drop of more than half is held back once.
- `GET /health` returns `{ ok, ready, deals, runs }` where `ready` is false while deals would get a 503 and `runs.jd` holds the last scrape's status, time and counts. Optional for a status banner.
- The discount floor is the backend's `MIN_DISCOUNT`, 30 by default, so filter values below it change nothing.

**Deal shape** (mirrors `backend/src/deals.ts`)

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Brand is only inside the name; there is no brand field. |
| `wasPrice`, `nowPrice` | number (GBP) | Always numbers now. `wasPrice` can be 0 when JD did not provide it, so the strike-through hides at 0. |
| `discount` | integer percent | Always at or above the backend floor. |
| `url` | string | Unique per product; the React key. |
| `imageUrl` | string, absent when unknown | Amplience CDN, now a bare `/i/jpl/<id>` path with no size parameters; the client appends `w`, `h`, `qlt` and `fmt=auto`. |
| `sizes` | string array, absent when unknown | Never an empty array. The current listing is men's Nike footwear, so values are mostly shoe sizes; clothing sizes return when more listings are enabled. |
| `timestamp` | number (ms) | When this backend process first saw the product. **Resets on every deploy or restart**, and again when an item sells out and later returns, so right after a deploy every deal shares the same time. |
| `gender` | "Male", "Female" or "Unisex" | Derived from the listing URL; Unisex when a product sits in both. Treat as a hint. |

Removed from the old shape: `inStock` (everything listed is in stock).

The Telegram bot and Firebase endpoints are gone from the backend, so nothing else links to the site; the `bargain-scraper.netlify.app` domain stays for existing bookmarks. Base URLs are unchanged: `http://localhost:8000` locally and the Render URL in production.

## Target stack

One toolchain, one config file, and libraries chosen for what this single page actually needs. Versions are the latest stable on the registry as of the as-of date and get pinned at scaffold time.

| Concern | Old | New | Why |
| --- | --- | --- | --- |
| Toolchain | CRA 5 and webpack, with separate Jest and ESLint | Vite+ 1.4 as a project-local `vite-plus` devDependency: Vite 8 on Rolldown, Vitest 5, Oxlint, Oxfmt, task runner | One `vite.config.ts` holds plugins, `test`, `lint` and `fmt`. Lint, format and type check run in Rust and Go, so `vp check` takes seconds. Stable since 28 Sep 2026, MIT. |
| Language | TypeScript 4.5 targeting ES5 | TypeScript 7 (tsgo) through `vp check`, strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, target ES2022 | No typescript-eslint in the chain, so nothing pins us to 5.x. |
| React | 17 with the legacy render call | React 19 with the React Compiler through the plugin's Oxc path (`react({ compiler: true })` plus `oxc-transform-react`) | Automatic memoisation with no Babel. One explicit `useMemo` stays on the filter pass as documentation. |
| Styling | Tailwind 3 with a JavaScript config and long inline class strings | Tailwind 4 through its Vite plugin, CSS-first `@theme` semantic tokens, `clsx` plus small `cva` variants in shared primitives | Tokens make dark mode free. Primitives end the duplicated 200-character class strings. |
| Server state | A hand-rolled hook | TanStack Query 5 with the localStorage persister | Cache, retry, focus and interval refetch, and an instant render of the last snapshot while Render wakes. |
| Filter state | Redux plus react-router search params plus a custom debounce | nuqs with its plain React adapter, no router | Single page, zero routes. Typed parsers, defaults omitted from the URL, batched writes, Safari history throttling, and a test adapter. |
| Accessible primitives | Headless UI v1 | Base UI (Dialog, Popover, ToggleGroup) and a native `select` for sort | Radix is in maintenance; Base UI is its successor, tree-shakeable, styled through data attributes. |
| Icons | Heroicons v1 | lucide-react, about eight icons | Consistent stroke, roughly 300 bytes each. |
| Motion | Headless UI transitions | CSS only: `@starting-style`, discrete transitions, reduced-motion honoured | No animation library for a sheet slide and a chip fade. |
| Validation | Price coercion only | zod/mini schema at the API boundary | Bad items are dropped; the page never blanks. |
| Tests | Jest, RTL 12, class-name assertions | `vp test` (Vitest) with RTL 16, MSW and vitest-axe; Playwright with axe for end-to-end | Behaviour-based tests that survive restyles. |
| Lint and format | CRA preset | `vp check`: Oxlint (built-in react, jsx-a11y and import rule sets, type-aware through tsgolint) plus Oxfmt | Layer boundaries through `no-restricted-imports` patterns. |
| Package manager | npm | Bun, detected by Vite+ from `packageManager` and `bun.lock` | Matches the backend. Netlify's build image ships Bun. |
| Bundle guard | None | size-limit in CI | A pull request fails when over budget. |
| Virtualisation | None | None; `content-visibility: auto` on cards, with the grid as the single seam for TanStack Virtual later | A hundred cards is about a millisecond of layout. |

**Why Vite+ rather than plain Vite.** Same Vite 8 underneath, but it collapses the Vite, Vitest, ESLint and Prettier configs and a dozen devDependencies into one package and one file. Installed as a normal devDependency, so CI and Netlify need nothing beyond `bun install`. The cost: ESLint plugins run only through its JavaScript plugin bridge, its jsx-a11y rules are a subset of the ESLint plugin (axe in tests covers the rest), and its docs require an `overrides` pin for `vite` and `vitest` that must move when the package is bumped.

**Why not Bun's own bundler.** Correction, verified on Bun 1.4.4 on 4 Nov 2026: Bun does have a native React Compiler (merged 20 Jun 2026) through bun build --react-compiler and Bun.build({ reactCompiler: true }), and it produced real compiler output in a test build. Its dev server has HMR and applies Tailwind 4 through bun-plugin-tailwind, and bun test with happy-dom runs React Testing Library. The remaining gaps: the dev server does not apply the compiler (it is a build-only option), so dev runs uncompiled and production compiled; the CLI build ignores bunfig plugins, so production goes through a small build script; and there is no Vitest browser mode or type-aware Oxlint. A pure-Bun toolchain is therefore viable and shares Biome and bun test with the backend. The choice between it and Vite+ is recorded in Decisions. Bun stays the installer and runner either way. With Vite+, Vite is only the thing that turns `.tsx` into a bundle, and it is where the React Compiler, Tailwind's plugin, Vitest and MSW integrate with zero glue. Vite+'s advantage is that the compiler runs in development as well as production, plus the broader plugin ecosystem.

**Why not Next.js.** It pays off with many routes, SEO-critical server rendering, auth or server mutations. This is one public page, one endpoint and data that rotates every 5 minutes. Next would add a server runtime on Netlify and framework conventions for "fetch, filter, render". Its one real benefit here, server-side caching that hides Render cold starts, is available on this path as a follow-up through a small Netlify Function (see Risks).

## Architecture

Three layers with one import direction, app to features to shared, enforced by the linter rather than by convention. A feature exposes one `index.ts`; nothing outside it may deep-import. The only place server state and URL state meet is the page component.

```
┌──────────────────────────────────────────────────────────────┐
│ app/        providers · layout (AppShell/Header/Footer) ·    │  may import anything
│             pages/DealsPage  ← the ONLY place server state    │  via feature index.ts
│                                and URL state meet            │
├──────────────────────────────────────────────────────────────┤
│ features/   deals/   filters/   theme/   about/              │  import shared/** and
│             (api · model · hooks · components · index.ts)    │  other features ONLY via
│             allowed edge: filters → deals (types only)       │  @/features/<x> index
│             forbidden:    deals → filters                    │
├──────────────────────────────────────────────────────────────┤
│ shared/     ui (Button, Chip, Badge, Skeleton, Dialog,       │  imports shared/** only
│             Popover, ToggleGroup, VisuallyHidden)            │
│             lib (cn, format, invariant) · config (env)       │
└──────────────────────────────────────────────────────────────┘
styles/  theme.css (tokens) · base.css · fonts.css      ← global, imported once in main.tsx
```

The arrow from filters to deals carries types only; nothing in deals knows what a filter is.

**Import rules**

- `shared/**` imports only `shared/**`.
- `features/<x>/**` imports `shared/**`, its own feature, and other features only through `@/features/<y>`. The one allowed cross-feature edge is filters to deals, for the `Deal` type. Deals never imports filters.
- `app/**` may import anything through the feature index files.
- Deep imports matching `@/features/*/*` from outside the feature, and `../../` paths that climb out of a feature, are lint errors through `no-restricted-imports` in the `lint` block of `vite.config.ts`.

**Folder tree**

```
frontend/
  netlify.toml              build command, publish=dist, SPA redirect, cache and security headers
  index.html                shell: inline theme script, preconnects, font preload, real meta, manifest
  package.json              packageManager bun; scripts dev, dev:mock, build, preview, check, test, test:e2e, size, ci
  vite.config.ts            defineConfig from 'vite-plus': plugins, alias, test, lint (boundaries), fmt
  playwright.config.ts      chromium and Mobile Safari projects against vp preview
  bun.lock  .node-version  .env.development  .env.production  .env.example  .size-limit.json
  tsconfig.json (+ .app / .node)
  public/
    favicon.svg  apple-touch-icon.png  icon-192.png  icon-512.png  manifest.webmanifest  robots.txt
    fonts/archivo-vf.woff2  self-hosted variable font, latin subset
    mockServiceWorker.js    MSW worker for dev:mock
  e2e/
    smoke.spec.ts           load, search, reload restores, mobile sheet toggles a size
    a11y.spec.ts            axe on loaded, empty and error states, light and dark
  src/
    main.tsx                createRoot; prefetch deals before render
    app/
      App.tsx               AppProviders > AppShell > DealsPage
      providers/            AppProviders.tsx, queryClient.ts
      layout/               AppShell.tsx, Header.tsx, Footer.tsx, Brand.tsx (inline SVG emblem)
      pages/DealsPage.tsx   the single orchestrator
    features/
      deals/
        index.ts
        api/                dealsApi.ts, dealSchema.ts, normalise.ts, queryKeys.ts
        model/              Deal.ts, brand.ts, sizes.ts, image.ts
        hooks/              useDealsQuery.ts, useDealFacets.ts
        components/         DealGrid, DealCard, DealImage, PriceBlock, SizeChips, DealGridSkeleton,
                            EmptyState, ErrorState, StaleBanner, ResultsSummary
      filters/
        index.ts
        model/              types.ts, registry.ts (the extension point), sort.ts, applyFilters.ts
        hooks/              useFilters.ts, useFilteredDeals.ts
        components/         FilterBar, FilterSheet (lazy), SearchField, DiscountControl, SortSelect,
                            SizeFacet, ActiveFilterChips
      theme/                themeStore.ts, ThemeToggle.tsx
      about/                AboutDialog.tsx (lazy)
    shared/
      ui/                   Button, IconButton, Chip, Badge, Skeleton, Dialog, Popover, ToggleGroup, VisuallyHidden
      lib/                  cn.ts, format.ts (gbp, relativeTime via Intl en-GB), invariant.ts
      config/env.ts         validates VITE_API_URL at boot
    styles/                 index.css, theme.css (tokens), base.css, fonts.css
    mocks/                  handlers.ts, browser.ts, server.ts
    test/                   setup.ts, render.tsx, fixtures/deals.json, makeDeal.ts
```

## Component tree and state flow

```
App
└ AppProviders
  └ AppShell [P]
    ├ Header [P] ── Brand · ThemeToggle · AboutButton → lazy AboutDialog
    ├ DealsPage [S][U]  ← single orchestrator
    │   const deals   = useDealsQuery()                 // server
    │   const [values, actions] = useFilters()          // URL
    │   const visible = useFilteredDeals(deals, values) // one memoised O(n) pass
    │   const facets  = useDealFacets(deals, values)    // size groups + counts
    │ ├ FilterBar [P]
    │ │ ├ desktop:  SearchField · DiscountControl · SizeFacet(Popover) · SortSelect
    │ │ └ mobile:   SearchField · SortSelect · "Filters (n)" → lazy FilterSheet
    │ │                └ DiscountControl · SizeFacet(inline) · SortSelect · [Reset] [Show 42 deals]
    │ ├ ActiveFilterChips [P]   chips[] from registry · Clear all
    │ ├ StaleBanner [P]         only when refetch failed but cache exists
    │ ├ ResultsSummary [P]      "42 of 81 deals · updated 4 min ago"  (aria-live)
    │ └ DealGrid [P]            status switch: skeleton | empty | error | cards
    │     └ DealCard [P] × n ── DealImage · PriceBlock · SizeChips · meta
    └ Footer [P]
```

```
      URL (?search&discount&sizes&sort)            GET /webscrape/getBestDeals
              │  nuqs                                        │  TanStack Query (+localStorage persist)
              ▼                                              ▼
        FilterValues ─────────┐                   Deal[] (validated, normalised)
                              ▼                              │
                     applyFilters(deals, values)  ◄──────────┘
                     (predicates built once, single pass, single sort)
                              │
                              ▼
                   visible Deal[] → DealGrid → DealCard
```

Everything below the page is presentational and testable with plain props. FilterBar, ActiveFilterChips, ResultsSummary and DealGrid receive values and callbacks; DealCard receives one deal and a priority flag for the first ten images. The app shell around the page holds the header with the brand, theme toggle and about button, and the footer.

## State model and URL schema

Every filter lives in the URL and nowhere else. Server data lives in the query cache. Nothing is mirrored.

| State | Lives in | Notes |
| --- | --- | --- |
| search, discount, sizes, sort | URL through nuqs `useQueryStates` | Single source of truth. History replace, defaults omitted. Search writes are throttled at 250 ms. |
| Deals, status, error, last updated | TanStack Query cache, persisted to localStorage for 24 hours | Returning visitors see the last snapshot instantly while Render wakes. |
| Sheet, popover and dialog open | Ephemeral React state | The back button should not close a sheet on a single page. |
| Theme | localStorage plus `matchMedia`; an inline head script sets `data-theme` before first paint | No flash of the wrong theme. |
| Filtered deals, facets, chips | Derived and memoised | Never stored. |

**URL schema**, backward compatible with links already shared: `/?search=nike&discount=50&sizes=M,L&sort=price-low-to-high`

| Param | Parser | Default (omitted from URL) | Invalid input |
| --- | --- | --- | --- |
| `search` | trimmed string, max 64 characters | empty | not applicable |
| `discount` | integer multiple of 10 from 10 to 100 | 30 | falls back to default |
| `sizes` | comma array, deduplicated, canonical order on write | empty | empty segments dropped |
| `sort` | one of the existing sort ids | `discount-high-to-low` | falls back to default |

**Adding a filter is one registry entry plus one control.** The registry entry supplies the parser, the active check, the predicate, and the chip labels. From that one entry the app derives URL parsing and serialising, the inferred `FilterValues` type, inclusion in the filter pass, the active-filter chips, clear-all, and the count badge on the mobile Filters button. Controls stay bespoke because a segmented control, a search field and a facet read better than a generic renderer.

```ts
// features/filters/model/registry.ts
gender: defineFilter({
  parser: parseAsArrayOf(parseAsStringEnum(GENDERS)).withDefault([]),
  isActive: (v) => v.length > 0,
  predicate: (v) => { const s = new Set(v); return (d) => s.has(d.gender); },
  chips: (v) => v.map((g) => ({ label: GENDER_LABEL[g], next: v.filter((x) => x !== g) })),
}),
```

**Filtering cost.** Normalisation precomputes a lowercased search string and a size set once per fetch. The filter pass composes only the active predicates, runs one filter and one sort with a stable tie-break, and is wrapped in a single `useMemo`. `useDeferredValue` on the search term keeps typing responsive. Size counts are computed from the set filtered by everything except sizes, so each chip answers "how many will I see if I add this".

## Data layer

One fetch function that owns the backend's loading protocol, one schema, one query. Errors are typed values, not thrown strings.

- `fetchDeals(signal)` calls `${VITE_API_URL}/v1/deals` with a plain `fetch` (no custom headers, no `cache` option) so the browser's HTTP cache and Render's compression apply without any client code. The only extra is the abort signal, which also carries a 20 second per-attempt timeout.
- **The 503 loop lives inside `fetchDeals`, not in TanStack Query's retry.** On a 503 it waits `Retry-After` seconds (default 10, clamped to 1 to 60) and tries again until a two minute deadline, honouring the abort signal. The query's own retry covers network errors and 5xx only, three attempts with capped backoff.
- `ApiError` is a union: network, timeout, http (with status and message), still-loading (the deadline passed on 503s), invalid-body. The error state switches on the kind; still-loading and network on first load show the "waking the server" copy.
- The client checks `response.ok` before parsing, because 500 and 502 may be platform HTML rather than JSON.
- Each item is validated with `safeParse`. Invalid items are dropped and counted; a non-array body is an invalid-body error. An empty array is a valid empty result, no longer a loading signal.
- Normalisation turns the wire deal into a `Deal`: id from the URL, brand derived from the name, store from the host, a size set, lowercased search text, and image URLs built from the bare Amplience path.
- Query options: 5 minute stale time to match the scrape cadence (the contract asks for at least 60 seconds), 30 minute garbage collection, 5 minute refetch interval while the tab is visible, refetch on window focus, previous data kept as placeholder.
- `main.tsx` prefetches the query before rendering, and `index.html` preconnects to the API and the image CDN.
- Environment: `.env.development` points at `http://localhost:8000`, `.env.production` at the Render URL. Both are committed; neither is a secret. The env module validates the value at boot.
- Mock mode: `bun run dev:mock` serves the checked-in fixture through MSW with the real headers, plus handlers for the 503 loading state, a non-JSON 502, and a network failure.

## Design system

One idea, "price tag on newsprint": a dense editorial product grid where the price is the hero, a single crimson lifted from the emblem's diamond is used only for discount and brand, warm paper neutrals, hairline rules instead of shadows, and one grotesk family doing wordmark, badge and body through its width axis. It should read like a retail sale page, not a SaaS dashboard.

Deliberately avoided: gradient heroes, indigo and purple, large-radius cards with heavy shadows, emoji headings, welcome copy, three-feature grids, frosted-glass blur.

**Colour tokens** (Tailwind 4 `@theme`, OKLCH). Neutrals are warm (hue 80) so JD's white product plates read as crisp cut-outs; cool grey with red reads as an error state, warm paper with crimson reads as a sale tag. The accent is the sampled logo red, `oklch(53% 0.20 20)`, roughly `#C7203A`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| accent | 53% 0.20 20 | 70% 0.19 20 | discount badge, focus ring, primary button |
| accent-fg | white | 16% 0.006 80 | text on accent |
| surface | 98.5% 0.004 80 | 16% 0.006 80 | page |
| surface-raised | white | 20% 0.007 80 | header, sheet, popover |
| surface-sunken | 96% 0.006 80 | 13% 0.005 80 | chips, inputs, skeletons |
| image-plate | 97% 0.004 80 | 90% 0.006 80 | behind photos; stays light in dark mode because the photos are baked on white |
| border, border-strong | 90%, 80% | 28%, 38% | hairlines, hover edges |
| text, text-muted, text-faint | 18%, 50%, 65% | 95%, 70%, 55% | body, meta, decorative only |
| warning-bg, warning-fg | 93% 0.06 85, 35% 0.08 75 | 28% 0.05 80, 85% 0.12 85 | stale-data banner |

Every text pairing clears 4.5 to 1; text-faint is reserved for disabled and decorative elements.

**Typography.** Archivo variable (weight 100 to 900, width 62 to 125, tabular figures), self-hosted as a latin subset with `font-display: swap` and a metric-matched fallback so the swap causes no layout shift. One file, three visible cuts.

| Role | Weight / width | Size |
| --- | --- | --- |
| Wordmark | 800 / 125 | 20 px |
| Discount badge | 700 / 90 | 13 px, tabular, caps |
| Now price | 700 / 100 | 17 px, 20 px on wide screens, tabular |
| Was price | 400 / 100 | 13 px, muted, struck through |
| Product name | 500 / 100 | 14 px over 20 px, two-line clamp with reserved height |
| Meta | 400 / 100 | 12 px, muted |
| Toolbar labels | 600 / 100 | 11 px, uppercase, tracked |

Tabular lining figures are set globally; everything on this page is a number.

**Spacing, radius, elevation, motion, icons.** Four-pixel base; grid gaps of 12 px on phones and 24 px on desktop; container up to 1440 px. Radii 2, 4, 6 and 8 px only. Elevation by borders: cards have no border at rest and a one-pixel border on hover or focus; popovers and the sheet get a border and a barely-there shadow. Motion at 120, 180 and 260 ms with an ease-out curve, all disabled under reduced-motion. Icons from Lucide at 16 px in controls and 20 px in the header.

**Brand mark.** The Hunter x Hunter emblem, traced to an inline SVG of about 1 to 2 KB, sits beside a typeset "BARGAIN" wordmark. The red diamond from the emblem repeats as the NEW marker bullet and the empty-state illustration, and becomes the SVG favicon.

## Layouts

Three views carry the whole product: the desktop page, the phone page with its filter sheet, and the card both share.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [XX◆] BARGAIN   JD Sports UK · 81 deals                  ☾  GitHub↗ Telegram↗│ sticky 52px
├────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search deals, brands…]  DISCOUNT ≥ [30][40][50][60][70][80]  [Sizes·2 ▾]  [Best discount ▾] │ sticky 56px
├────────────────────────────────────────────────────────────────────────────┤
│ ≥50% ×   M ×   L ×   "nike" ×    Clear all                 Showing 23 of 81│ only when non-default
├────────────────────────────────────────────────────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                          │ 5 cols ≥1280, 4 cols 1024
│ │-67%   │ │-64%   │ │-62% ◆NEW│ │-62%  │ │-60%   │                          │ image plate 726:926
│ │ [img] │ │ [img] │ │ [img] │ │ [img] │ │ [img] │                          │
│ ├───────┤ ├───────┤ ├───────┤ ├───────┤ ├───────┤                          │
│ │Nike … │ │Nike … │ │Nike … │ │New B… │ │Colum… │                          │ name 14/20 ×2
│ │£10 £̶3̶0̶│ │£10 £̶2̶8̶│ │£15 £̶4̶0̶│ │£15 £̶4̶0̶│ │£10 £̶2̶5̶│                          │ now 17/700
│ │S M L +1│ │S M L  │ │XS S M+│ │S M    │ │S M L+ │                          │ chips + "+N"
│ │Men·2h │ │Men·2h │ │Men·9m │ │Men·2h │ │Men·2h │                          │ meta 12
│ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘                          │
├────────────────────────────────────────────────────────────────────────────┤
│ Last updated 14:05 · refreshes every 5 min · Prices from jdsports.co.uk     │
└────────────────────────────────────────────────────────────────────────────┘
```

The header is 52 px and the toolbar 56 px, both sticky, so the sticky stack stays at 108 px. The chip row is not sticky and renders only when a filter is non-default. The grid runs five columns from 1280 px and four from 1024 px inside a 1440 px container.

```
┌─────────────────────────┐      Bottom sheet (<dialog> showModal, slides up 260ms, ≤92dvh)
│ [XX◆] BARGAIN  81  ☾    │ 48px ┌─────────────────────────┐
├─────────────────────────┤      │         ▬▬▬▬            │
│ [🔍 Search deals…      ]│ 44px │ Filters              ✕  │
│ [⚙ Filters (3)] [Sort ▾]│ 44px ├─────────────────────────┤
├─────────────────────────┤      │ MINIMUM DISCOUNT        │
│ ≥50%× M× L× Clear  →    │ scroll│ [30][40][50]            │ 44px radios
├─────────────────────────┤      │ [60][70][80]            │
│ ┌─────────┐ ┌─────────┐ │      │ CLOTHING                │
│ │-67%     │ │-64% ◆NEW│ │      │ [XS 21][S 42][M 39][L 32]│ toggle chips w/ counts
│ │  [img]  │ │  [img]  │ │      │ [XL 24][XXL 22][XXXL 1] │
│ ├─────────┤ ├─────────┤ │      │ FOOTWEAR                │
│ │Nike NFL…│ │Nike NFL…│ │      │ [3 6][4 7]…[12 5]       │
│ │£10  £̶3̶0̶ │ │£10  £̶2̶8̶ │ │      │ SORT                    │
│ │S M L +1 │ │S M L    │ │      │ (•) Best discount …     │
│ └─────────┘ └─────────┘ │      ├─────────────────────────┤
│  … content-visibility   │      │ [Reset]  [Show 23 deals]│ sticky, safe-area
└─────────────────────────┘      └─────────────────────────┘
```

Below 640 px the search field takes the full width, sort stays inline as a native select, and everything else moves into a bottom sheet opened by one Filters button with an active count. Sort is repeated inside the sheet so the sheet is a complete form. Filters apply the moment you tap them and the result count on the button updates live, so there is no separate apply step and nothing to discard; the button only closes the sheet. The grid is two columns.

```
┌────────────────────────────┐
│ ┌──────┐          ┌─────┐  │  badge: accent bg, 13/700/wdth90, radius 2, top-left
│ │ -67% │          │◆ NEW│  │  NEW: timestamp < 2h, outline chip, top-right
│ └──────┘   [image]└─────┘  │  aspect-ratio 726/926, plate bg, fade-in on load, skeleton beneath
│                            │  hover: img scale(1.02), border → border-strong
├────────────────────────────┤
│ Nike NFL Las Vegas Raiders │  14/20 500, line-clamp-2, min-h 40px
│ Helmet T-Shirt             │
│ £10   £̶3̶0̶                  │  17/24 700 tnum · <s aria-label="was £30">
│ [S][M][L][XXL] +1          │  11px chips, first 5 (3 on <400px) + "+N"
│ Men · Found 2h ago         │  <time datetime title="14:05, 11 Mar">
└────────────────────────────┘
```

The card has no border at rest; the image plate against the page colour is the edge. A one-pixel border appears on hover and focus, and the focus ring uses the accent.

## Controls, states and accessibility

**Control decisions**

| Control | Choice | Why |
| --- | --- | --- |
| Minimum discount | Segmented radio group with ten stops (10 to 100), arrow-key navigation, roving tab index | Every stop is readable, targets are 44 px on phones, stops with zero results, and the 10 and 20 stops below the backend floor, render faint but stay clickable, and there is no cross-browser range-input CSS. |
| Sort | Native `select`, styled with a Lucide chevron | Four options need no custom listbox. Phones get their native pickers. Labels become "Best discount", "Smallest discount", "Lowest price", "Highest price". The old toggle-to-clear behaviour goes. |
| Sizes | Facet derived from the data with counts, grouped Clothing then Footwear | Numeric values are footwear, sorted ascending. Clothing follows XS to XXXL, then oddities like OS alphabetically. Sizes with zero items are not shown. Popover on desktop, inline in the sheet. OR within sizes, AND with other filters. |
| Search | `input type=search` with icon and clear button, search enter key hint | 250 ms throttle to the URL. |
| Active filters | One chip per non-default value with a remove button, plus Clear all | Horizontally scrolling row on phones. |

**UI states**

| State | What renders |
| --- | --- |
| First load, no snapshot | Header and toolbar render immediately with controls marked busy; ten skeleton cards at the real aspect ratio so nothing shifts. While the backend answers 503 the client keeps retrying quietly; after 3 seconds a line reads "Waking the server, this can take a minute." The error state appears only once the two minute retry deadline passes. |
| First load, snapshot cached | Snapshot renders instantly; a background refetch swaps it silently; the footer time updates. |
| Empty after filtering | A reasoned message computed by removing each filter in isolation, for example "No deals at 70 percent or more in size M. There are 12 in size M at 50 percent or more", with buttons that apply that change or clear the sizes. |
| Empty after search | "Nothing matches" with the term quoted, a suggestion to shorten it, and a clear button. |
| Error with no cache | A danger-coloured diamond, copy chosen by error kind, and a retry button with an in-flight state. |
| Error with cache | The cached grid plus a 40 px status banner: "Showing deals from 14:05, couldn't refresh", with retry. |
| Background refetch (served from the browser cache for 60 seconds, then fetched fresh in the background) | Nothing visible except the footer time; new items pick up the NEW marker through their timestamp. |

**Accessibility requirements (binding)**

- Language `en-GB`; header, main and footer landmarks; the toolbar is a search form; a skip link is the first focusable element.
- The result count sits in a polite live region, debounced so typing does not spam it.
- The mobile sheet is a native `dialog` opened modally: focus trap, Escape, inert background, focus returned to the Filters button on close.
- Size chips use `aria-pressed`; the discount group uses the radio pattern; the visual discount badge is hidden from assistive tech because the card's accessible name already includes it.
- Hit targets are at least 44 px on phones. Theme follows the system preference with a manual override. Reduced motion is honoured globally. Contrast follows the token table above.

## Performance

Budgets are enforced in CI by size-limit, measured gzipped: initial JavaScript at or under 90 KB (React DOM about 45, TanStack Query 13, nuqs 5, Base UI 15, zod/mini 3, icons 2, app code 10), CSS at or under 15 KB, font at or under 40 KB, lazy chunks of about 4 KB for the sheet and 2 KB for the about dialog. Field goals at the 75th percentile on mobile: LCP 2.0 s, INP 150 ms, CLS 0.05. Lighthouse mobile 95 or better for performance and 100 for accessibility.

| Tactic | Owner |
| --- | --- |
| Amplience URL builder sets width, height, quality 75 and `fmt=auto`, so the CDN negotiates AVIF or WebP. `srcset` at 240, 360, 480 and 720 wide with a `sizes` attribute matched to the grid. Explicit width and height. Per-card bytes drop from about 180 KB to about 20 KB. | `deals/model/image.ts`, `DealImage` |
| First ten cards load eagerly with high fetch priority; the rest lazy with async decoding. Cards from index 20 get `content-visibility: auto` with an intrinsic size. | `DealGrid`, `DealCard` |
| Preconnect to the image CDN and the API, preload the font, inline the theme script, inline the emblem as SVG, no analytics script. | `index.html`, `Brand` |
| Self-hosted subset font with swap and a size-adjusted fallback face. | `styles/fonts.css` |
| Persisted query cache plus a prefetch before render, so a returning visitor sees deals before the server wakes. | `providers/queryClient.ts`, `main.tsx` |
| Code-split only the filter sheet (prefetched on pointer down) and the about dialog. Everything on the desktop toolbar is needed immediately. | `FilterBar`, `Header` |
| Netlify headers: immutable one-year caching for hashed assets and fonts; nosniff and referrer policy on everything. | `netlify.toml` |
| React Compiler on, deferred search value, throttled URL writes, no layout reads anywhere. | global |

## Old to new file map

Everything under `frontend/src` is replaced. Pure logic and its tests are ported; the rest is rewritten or deleted.

| Old | Action | New |
| --- | --- | --- |
| `index.tsx` | Rewrite | `main.tsx`: createRoot, prefetch, no Redux, no router, no web-vitals |
| `App.tsx` | Rewrite | `app/App.tsx` and `app/pages/DealsPage.tsx` |
| `App.css`, `index.css`, `tailwind.config.js`, `postcss.config.js` | Delete | `styles/theme.css`, `base.css`, `fonts.css`; Tailwind through its Vite plugin |
| `component/header/HeaderBar.tsx` | Rewrite | `app/layout/Header.tsx`, `Brand.tsx`, `features/theme/ThemeToggle.tsx` |
| `component/modal/NewFeatures.tsx` | Delete | `features/about/AboutDialog.tsx`, lazy, factual |
| `component/modal/ErrorPage.tsx` | Rewrite | `ErrorState.tsx` and `StaleBanner.tsx` |
| `component/table/ItemTable.tsx` | Rewrite | `DealGrid`, `DealGridSkeleton`, `EmptyState`, `ResultsSummary` |
| `component/table/ItemCard.tsx` | Rewrite | `DealCard`, `DealImage`, `PriceBlock`, `SizeChips`, plus shared `Badge` and `Chip` |
| `component/filter/Filters.tsx` | Rewrite | `FilterBar` and `FilterSheet` |
| `component/filter/Genders.tsx` | Delete | Gender becomes card meta; a registry entry adds the facet later |
| `component/filter/DiscountSlider.tsx` | Rewrite | `DiscountControl`, segmented and URL-backed |
| `component/filter/SearchBar.tsx` | Keep logic, reskin | `SearchField` |
| `dropdowns/SortDropdown.tsx` | Rewrite | `SortSelect`, native select |
| `dropdowns/SizeDropdown.tsx` | Rewrite | `SizeFacet` and `deals/model/sizes.ts` |
| `store/index.ts`, `store/filterSlice.ts` | Delete | Discount moves to the URL |
| `hooks/useItems.ts` | Rewrite | `deals/hooks/useDealsQuery.ts` |
| `hooks/useFilterParams.ts` and its spec | Keep semantics, port | `filters/hooks/useFilters.ts` on nuqs |
| `util/sort.ts` and its spec | Keep, port | `filters/model/applyFilters.ts` and `sort.ts` |
| `util/urlParams.ts` and its spec | Keep, port | Parsers inside `filters/model/registry.ts` |
| `services/webScrape.service.ts` | Keep the price coercion idea | `deals/api/dealsApi.ts` and `dealSchema.ts` |
| `services/mock-data.json` | Keep | `test/fixtures/deals.json` for MSW and tests |
| `interfaces/Item.ts`, `interfaces/Sort.ts` | Keep ids, rename | `deals/model/Deal.ts`, `filters/model/sort.ts` |
| `reportWebVitals.ts`, `react-app-env.d.ts` | Delete | `vite-env.d.ts` |
| `public/index.html` | Rewrite | `index.html` with no analytics tag, preconnects, real meta, theme script |
| `public/manifest.json` | Rewrite | `public/manifest.webmanifest` with the real name and SVG plus maskable icons |
| `assets/hxh-logo.png` | Convert | Inline SVG in `Brand.tsx` and `public/favicon.svg`; fallback is a 160 px AVIF of about 3 KB |
| Spec files asserting class names | Port to behaviour | Vitest and RTL asserting roles, names, URL payloads and network effects |

## Code quality bar

Three before-and-after pairs set the standard for every component.

**Card: one link, price first, responsive image.**

```tsx
// before: ItemCard.tsx
<div className="w-full min-h-80 bg-gray-200 aspect-w-1 aspect-h-1 rounded-md hover:opacity-75 lg:h-80 lg:aspect-none shadow-lg">
  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-center object-cover lg:w-full lg:h-full" />
</div>
<p className="text-sm font-medium text-gray-900 whitespace-nowrap">
  {priceFormatter.format(item.nowPrice)} ({item.discount}% off)
</p>
```

```tsx
// after: DealCard.tsx
<a href={deal.url} target="_blank" rel="noopener" aria-label={describeDeal(deal)}
   data-below-fold={index >= 20 || undefined}
   className="group block rounded-sm focus-visible:ring-2 focus-visible:ring-focus ring-offset-2 ring-offset-surface">
  <div className="relative overflow-hidden rounded-sm bg-image-plate border border-transparent transition-colors duration-fast group-hover:border-border-strong">
    <DealImage image={deal.image} alt="" priority={index < 10} />
    <Badge tone="accent" className="absolute left-2 top-2" aria-hidden>-{deal.discount}%</Badge>
    {isNew(deal) && <Badge tone="outline" className="absolute right-2 top-2">New</Badge>}
  </div>
  <div className="mt-3 space-y-1.5">
    <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-text">{deal.name}</h3>
    <PriceBlock now={deal.nowPrice} was={deal.wasPrice} />
    <SizeChips sizes={deal.sizes} max={5} />
    <p className="text-xs text-text-muted">Men · <time dateTime={iso(deal.foundAt)}>{relative(deal.foundAt)}</time></p>
  </div>
</a>
```

**Discount: a radio group instead of a range input.**

```tsx
// before: DiscountSlider.tsx
<input type="range" min="10" max="100" step="10" className="w-11/12 bg-orange-400" onChange={handleSlider} value={discount} />
```

```tsx
// after: DiscountControl.tsx
<div role="radiogroup" aria-label="Minimum discount" onKeyDown={moveWithArrows}
     className="grid grid-cols-10 overflow-hidden rounded-sm border border-border">
  {STOPS.map((stop) => (
    <button key={stop} type="button" role="radio" aria-checked={value === stop}
            tabIndex={value === stop ? 0 : -1} aria-disabled={countAt(stop) === 0 || undefined}
            onClick={() => onChange(stop)} className={segment({ selected: value === stop, empty: countAt(stop) === 0 })}>
      {stop}
    </button>
  ))}
</div>
```

**Styling: semantic tokens and one primitive instead of duplicated class strings.**

```tsx
// before: duplicated in SortDropdown.tsx and SizeDropdown.tsx
const activeMenuItemClasses = "bg-indigo-400 text-white";
const inactiveMenuItemClasses = "bg-gray-100 text-gray-900 opacity-70 hover:bg-gray-200";
```

```tsx
// after: shared/ui/Chip.tsx; every colour is a token, so dark mode needs no extra classes
export const chip = cva(
  "inline-flex items-center gap-1 rounded-xs border text-xs font-medium transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-focus",
  { variants: {
      tone: { neutral: "border-border bg-surface-sunken text-text", selected: "border-accent bg-accent text-accent-fg", muted: "border-transparent bg-surface-sunken text-text-muted" },
      interactive: { true: "cursor-pointer hover:border-border-strong", false: "" },
      size: { xs: "h-5 px-1.5", sm: "h-8 px-2.5", md: "h-10 px-3 text-sm" } },
    defaultVariants: { tone: "neutral", interactive: false, size: "sm" } });
```

## Delivery phases

Each phase is one or more commits on the feature branch, which is rebased onto feature/v2-rewrite first so the new backend contract, the repo's CI workflow and its git hooks are in place; it rebases onto main once that backend branch merges. The branch opens a single pull request at the end, and Netlify's deploy preview validates production before merge. Because the base directory stays `frontend` and `netlify.toml` supplies the build command and publish folder, no Netlify UI change is needed; verify the base directory once before merge.

| # | Phase | Definition of done |
|---|---|---|
| 0 | **Clear + scaffold.** Remove CRA app (keep `mock-data.json` and the four spec files aside for porting). `vite-plus` + React 19 (compiler on) + Tailwind 4 + Bun; `vite.config.ts` with `test`/`lint`/`fmt` blocks and boundary rules; RTL/MSW/axe; Playwright; `size-limit`; `netlify.toml` (`command="bun install --frozen-lockfile && bun run build"`, `publish="dist"`, SPA redirect, headers, `NODE_VERSION="22"` ≥ 22.18); `.node-version`; `.env.*`; `index.html` shell. **Rewire the `frontend` job in the existing `.github/workflows/ci.yml`** (keep the path filter and the required `CI passed` job): `oven-sh/setup-bun@v2` (bun 1.4.4 like the backend) → `bun install --frozen-lockfile` → `bun run check` (= `vp check && vp test && vp build && size-limit`) + e2e chromium. Add `check:commit` (`vp check`) and `check:push` (`bun run check`) scripts plus the same `prepare` hooks-path script as `backend/package.json`, so `.githooks/` covers the frontend. | `bun run check` green locally and in Actions; hooks fire on a frontend-only commit; placeholder page builds. |
| 1 | **Design system.** `styles/*` tokens, dark mode, font, `shared/ui` primitives (Button, IconButton, Chip, Badge, Skeleton, Dialog, Popover, ToggleGroup, VisuallyHidden), `features/theme`, `AppShell/Header/Footer/Brand` (traced SVG emblem). | Primitive component tests + axe clean; theme persists, respects system, no flash on reload. |
| 2 | **Data layer.** `deals/api`, `model`, `useDealsQuery`, persister, MSW handlers + fixtures, `DealGridSkeleton`, `ErrorState`, `StaleBanner`, `ResultsSummary`; `DealsPage` renders a plain list. | Unit tests: schema/normalise/brand/sizes/image; page tests: success, http error, network error + retry, slow → "waking" copy; `bun run dev:mock` works. |
| 3 | **Filter model.** registry, sort, `applyFilters`, `useFilters`, `useFilteredDeals`, `useDealFacets`. Port `sort.spec`, `urlParams.spec`, `useFilterParams.spec` semantics. | Legacy URLs parse identically; round-trip URL tests; nuqs test adapter wired. |
| 4 | **Deal grid.** `DealGrid`, `DealCard`, `DealImage` (srcset), `PriceBlock`, `SizeChips`, `EmptyState` (reasoned copy), `content-visibility`. | srcset tests; card a11y (link name, price announced once); Playwright screenshots at 390 px and 1280 px. |
| 5 | **Filter UI.** `FilterBar`, `SearchField`, `DiscountControl`, `SortSelect`, `SizeFacet` (popover/inline), `ActiveFilterChips`, lazy `FilterSheet`. | URL updates asserted via nuqs adapter; e2e: search, mobile sheet size toggle, reload restores state; axe clean with sheet open. |
| 6 | **Polish + budgets.** Preload/preconnect, meta/OG, SVG favicon + icons + manifest, `AboutDialog`, headers, budgets tightened to measured + 10 %, README update. | Lighthouse mobile ≥ 95 / a11y 100 on the Netlify deploy preview; size-limit passing. |
| 7 | **Cutover.** Open the PR; verify deploy preview with a legacy URL (`?search=nike&sizes=M,L&sort=price-low-to-high`) renders the same deals; merge. Rollback = revert the merge commit (Netlify never replaces the last successful deploy with a failed build). | Production serves the new app at `bargain-scraper.netlify.app`. |

Nothing merges to main until phase 7, so the live site is untouched throughout. Phase 0 also rewires the frontend job in the repo's existing ci.yml from npm, tsc and Jest to setup-bun and \`bun run check\`, and adds \`check:commit\` and \`check:push\` scripts so the repo's git hooks cover the frontend the same way they cover the backend.

## Testing and verification

Tests assert behaviour, never class names, so a restyle cannot break them.

- Unit (Vitest, node): the filter pass with each filter alone and combined and stable ties; URL parsers round-tripping, legacy params and invalid values; the schema and normaliser with legacy price strings, missing sizes, a bad item dropped and a non-array body; brand derivation; size classification and ordering for values like 070, LXL and OS; srcset building; GBP and relative-time formatting.
- Component (Vitest, jsdom, RTL, MSW): the page in success, empty, error, retry and slow states; the filter bar asserting URL update payloads through the nuqs test adapter; theme persistence; card semantics. Every state runs through axe.
- End to end (Playwright on Chromium and Mobile Safari, API stubbed from the fixture): smoke flow and axe in light and dark. The real Render API is never hit on pull requests because cold starts flake.
- CI gates on every pull request touching `frontend/`: `vp check`, `vp test` with 90 percent coverage on the model and api folders, `vp build`, size-limit, and the Chromium end-to-end run. The existing Claude review workflow keeps running.

**End-to-end verification before merge**

1. `bun install` then `bun run ci` is green locally and in Actions.
2. `bun run dev:mock` at 390 px and 1280 px: search, discount, clothing and footwear sizes, sort, chips, clear all, sheet, theme toggle, and a keyboard-only pass.
3. `bun run dev` against the backend on port 8000: real data renders; the waking copy appears when the backend is stopped; the stale banner appears when it is stopped after a successful load.
4. `bun run test:e2e` passes on both projects.
5. On the Netlify deploy preview: Lighthouse mobile at 95 or better for performance and 100 for accessibility; a legacy shared URL renders the same deals; cache and redirect headers are present.

## Risks, assumptions and follow-ups

- **Render cold start** is now two stages: Render waking the process on the free tier (30 to 60 seconds with no answer at all), then the backend answering 503 until its first scrape lands (usually seconds). No frontend work removes the first stage; the persisted cache, the 503 retry loop and the waking copy mitigate both. Two follow-ups outside v1: a Netlify Function that proxies the deals endpoint with `s-maxage=300, stale-while-revalidate=86400`, so first-time visitors hit Netlify's edge cache instead of a sleeping Render (the frontend would only change its API URL); or an external uptime ping to the health endpoint.
- **Vite+ is young.** Its docs require `overrides` pinning `vite` to `@voidzero-dev/vite-plus-core` and `vitest` to the bundled version so the React and Tailwind plugins resolve the same Vite. If a blocker appears, the escape hatch is mechanical: swap `vite-plus` for `vite`, `vitest`, ESLint and Prettier; the plugins and test blocks stay as they are. Oxlint's jsx-a11y coverage is partial, so axe in tests remains the accessibility gate.
- **Bun on Netlify.** The build image ships Bun and detects the lockfile; the build command installs explicitly anyway. Fallback: `npm ci` with a generated lockfile, a one-line change.
- **Browser floor.** Tailwind 4 needs Safari 16.4, Chrome 111 or Firefox 128. `@starting-style` animations degrade to instant on older Safari. Acceptable for this audience.
- **Emblem tracing.** If the automated trace is not clean, ship a 160 px AVIF of about 3 KB and keep the diamond-only SVG for the favicon and motifs.
- **Brand facet** stays out of v1. When wanted, adding `brand` to the Algolia attribute list in the backend's JD service makes it exact; client-side derivation from the name is a heuristic.
