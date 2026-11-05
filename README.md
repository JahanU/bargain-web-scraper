# Bargain Web Scraper

#### Try it out:
👕 https://bargain-scraper.netlify.app/

## Overview 🤔
- Finds heavily discounted clothing on JD Sports UK every few minutes and shows it in a fast, accessible React web app that works on phones and desktops
- Tracks stock: sold-out items disappear from the site on the next scrape and come back if restocked
- ```Bun, TypeScript, React 19, Vite+, Tailwind CSS 4, TanStack Query, nuqs```

## Architecture

```mermaid
flowchart LR
    jd["🛒 JD Sports<br/><small>Algolia search</small>"]
    loop["⏱️ Scrape loop<br/><small>every 5 min</small>"]
    store["🧠 Deal store<br/><small>in memory</small>"]
    response["📦 Deals list<br/><small>JSON · compressed by Render</small>"]
    app["🖥️ React app<br/><small>Netlify</small>"]

    loop -- fetch sale listing --> jd
    loop -- accepted listing --> store
    store -- "deals ≥ 30% off" --> response
    app -- "GET /v1/deals" --> response
```

## Features 🚀
### Frontend
- [React Web App](https://bargain-scraper.netlify.app/): search, minimum discount, clothing and footwear sizes, and sort, all kept in the URL so links can be shared
- Bun + Vite+ (Vite, Vitest, Oxlint, Oxfmt in one `vite.config.ts`), React 19 with the React Compiler, Tailwind CSS 4 with light and dark themes
- TanStack Query with the last list saved in the browser, so returning visitors see deals at once while the server wakes
- Tests assert behaviour (roles, names, URL writes, network effects): Vitest with Testing Library, MSW and axe; Playwright end to end with axe in both themes
- See [docs/frontend-rewrite-spec.md](docs/frontend-rewrite-spec.md) for the design and [docs/frontend-rewrite-notes.md](docs/frontend-rewrite-notes.md) for decisions made while building it

### Backend
- Bun with zero runtime dependencies (built-in HTTP server)
- Reads JD's product search (Algolia) directly: one request per category instead of scraping HTML
- Sold-out detection, with a safety check so a failed fetch never wipes the list
- The deals list is rebuilt after each scrape and served from memory with browser caching; Render compresses responses (Brotli)
- No database or files: everything lives in memory and is rebuilt by scraping on boot
- See [backend/README.md](backend/README.md) for details, and [FRONTEND_API.md](FRONTEND_API.md) for the API contract the frontend relies on
- [docs/backend-v2-rewrite.md](docs/backend-v2-rewrite.md): the story of the backend rewrite, its design decisions, the final result and open items

### Tech 💻
- Frontend hosted on Netlify
- Backend hosted on Render
- Git hooks (`.githooks/`, installed by `bun install` in `backend/` or `frontend/`): typecheck + lint before each commit and the full checks before each push, for whichever app changed. An app opts in by defining `check:commit` / `check:push` scripts in its `package.json`
- GitHub Actions CI on every PR and push to main (`.github/workflows/ci.yml`); require the **CI passed** check before merging
- Automatic deployments from main

## Installation
```bash
cd frontend
bun install
bun run dev        # against the backend on localhost:8000
bun run dev:mock   # no backend needed: serves a saved list (add ?mock=loading, ?mock=bad-gateway or ?mock=offline)
bun run check      # what CI runs: format, lint, types, tests, build, size budgets
```

```bash
cd backend
bun install
bun run dev
```

No API keys or database needed.
