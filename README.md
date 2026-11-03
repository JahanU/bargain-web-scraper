# Bargain Web Scraper

#### Try it out:
👕 https://bargain-scraper.netlify.app/

## Overview 🤔
- Finds heavily discounted clothing on JD Sports UK every few minutes and shows it in a clean, minimal React web app
- Tracks stock: sold-out items disappear from the site on the next scrape and come back if restocked
- ```Bun, TypeScript, React, Redux, Tailwind CSS```

## Architecture

```
 on boot + every 5 min ──► scrape JD (Algolia) ──► reconcile ──► catalogue in memory ──► data/deals.json
                                                       │
                                                       ▼
 React app (Netlify) ──► GET /webscrape/getBestDeals ◄── pre-built response (JSON + gzip + ETag)
```

## Features 🚀
### Frontend
- [React Web App](https://bargain-scraper.netlify.app/)
- Redux
- Tailwind CSS
- React Router (search params for filters)

### Backend
- Bun with zero runtime dependencies (built-in HTTP server, file I/O, gzip and hashing)
- Reads JD's product search (Algolia) directly: one request per category instead of scraping HTML
- Sold-out detection, with a safety check so a failed fetch never wipes the list
- Responses built once per scrape and served from memory, with ETag/304 and gzip
- See [backend/README.md](backend/README.md) for details

### Tech 💻
- Frontend hosted on Netlify
- Backend hosted on Render
- GitHub Actions CI on every PR and push to main (`.github/workflows/ci.yml`); require the **CI passed** check before merging
- Automatic deployments from main
- Google Analytics

## Installation
```bash
cd frontend
npm install
npm start
```

```bash
cd backend
bun install
bun run dev
```

No API keys or database needed.
