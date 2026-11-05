# Frontend rewrite: implementation notes

Running log for the rewrite in `docs/frontend-rewrite-spec.md`. It records where the engineering
guide ([andrej-karpathy-skills CLAUDE.md](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/CLAUDE.md))
conflicted with the spec, where the spec and the backend code disagree, and calls made inside a phase.

Precedence: backend code > spec > guide.

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
