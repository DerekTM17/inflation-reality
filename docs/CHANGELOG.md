# inflation-reality — Changelog

A record of significant changes. Entries grouped by date (descending,
most recent first). Each covers **What** + **Why**; bigger decisions
also include **Tradeoffs / Alternatives considered**.

Curated, not exhaustive — `git log` has every commit.

## 2026-07-10

### FRED live-data integration: build-time fetch, MoM figures, fallback resilience

**Why:** Replaced hardcoded CPI values with live FRED API data fetched at build time. `scripts/fetch-fred.mjs` runs in GitHub Actions using the `FRED_API_KEY` secret, fetches raw index levels server-side (no CORS, key never shipped to client), and writes `public/cpi.json`. The app loads it at runtime and falls back to bundled `src/data/fallback.json` if unavailable — resilient to API outages. Added month-over-month (MoM) figures for headline and core inflation (plus annualized) alongside YoY: YoY uses NSA series (e.g. `CPIAUCNS`), MoM uses seasonally-adjusted series (e.g. `CPIAUCSL`). Static metadata lives in `src/data/catalog.js`; a tested `buildViewData()` in `src/data/merge.js` merges catalog + dynamic values. Pure compute functions in `scripts/compute.mjs` (+ `scripts/assemble.mjs`) compute YoY/MoM/trend, tested via built-in `node --test` (no new deps). Trend chart auto-advances each build; gaps are data-driven (missing FRED months render as gaps). Refresh cadence: GitHub Actions schedule on the 13th and 16th of each month, plus workflow_dispatch and push-to-main. User sets `FRED_API_KEY` repo secret once to enable fetching.

## 2026-05-21

### Scaffold: Vite + React dashboard deployed to GitHub Pages

**Why:** Wired the existing personal-inflation-tracker.jsx (BLS CPI-U dashboard, Recharts + xlsx) into a fresh Vite + React 18 app and shipped it public. App.jsx is the component verbatim (default export drops straight in as App); main.jsx mounts it with a minimal CSS reset. vite.config base is /inflation-reality/ to match the GitHub Pages project URL — verified in the built dist/index.html asset paths. A GitHub Actions workflow (.github/workflows/deploy.yml) builds on push to main and publishes dist/ to gh-pages via peaceiris/actions-gh-pages; Pages is configured to serve from that branch. First deploy ran green in ~17s.

