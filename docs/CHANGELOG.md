# inflation-reality — Changelog

A record of significant changes. Entries grouped by date (descending,
most recent first). Each covers **What** + **Why**; bigger decisions
also include **Tradeoffs / Alternatives considered**.

Curated, not exhaustive — `git log` has every commit.

## 2026-07-13

### Add "How Others Measure It" panel with alternative official inflation gauges

**Why:** Dashboard now displays a horizontal bar comparison of the latest 12-month inflation across Headline CPI, Core CPI, and four alternative official measures: Core PCE (`PCEPILFE`), Median CPI (`MEDCPIM159SFRBCLE`), 16% Trimmed-Mean CPI (`TRMMEANCPIM159SFRBCLE`), and Sticky-Price Core CPI (`CORESTICKM159SFRBATL`). All measures are sourced from FRED using the existing build-time pipeline, with no new API keys required. Core PCE requires index-to-YoY conversion; the other three measures are native 12-month percentage rates (distinguished by the FRED suffix convention: `M158`=1-month-annualized vs `M159`=12-month). Each measure carries an InfoTip explaining its methodology and a FRED series badge for full provenance. Panel is also added to the Excel export and the glossary reference. Per-series stale fallback is handled by the existing resilience layer.

**Fix (production wiring):** the first deploy shipped an empty `altMeasures` because `fetch-fred.mjs` hand-built the catalog object it passes to `assemblePayload` and was never updated to include `ALT_MEASURES` — unit tests missed it (assemble.test uses its own catalog stub; fetch-fred has no unit test), caught only by verifying the live `cpi.json`. `fetch-fred.mjs` now imports the whole catalog namespace and passes it through, so a future catalog export can't be silently dropped. **Lesson: verify build-time-generated output against production, not just unit tests.**

**Follow-up:** added a fifth alternative measure, Dallas Fed **Trimmed-Mean PCE** (`PCETRIM12M159SFRBDAL`, native 12-month rate). Comparison chart is now 7 bars; propagated automatically to the Excel export and series list, with a glossary entry added. Verified mobile-friendly at 360/375/414 px across all three tabs.

## 2026-07-10

### Live-data polish: drop Car Insurance, fix broken series IDs, add onboarding tooltips

**Why:** Once the dashboard actually queried FRED (see entry below), the first live deploy revealed that 4 of 11 category series IDs — inherited verbatim from the old hardcoded dashboard, which never hit FRED — return 404 and were silently falling back to seed values. Fixed by pointing Healthcare/Clothing/Recreation at FRED's friendly NSA aliases (`CPIMEDNS`/`CPIAPPNS`/`CPIRECNS`; BLS item codes unchanged) and **dropping Car Insurance** entirely, because FRED does not mirror the CPI motor-vehicle-insurance NSA series (`CUUR0000SETE` → 404) and showing a permanently-stale category undercuts the "every number is live and traceable" promise. Categories 11 → 10; live site now reports **0 stale categories**.

Also a new-user clarity pass: a reusable accessible `InfoTip` (opens on hover, focus, **and** tap for touch devices) explaining the three headline numbers, the MoM/annualized line, the estimated trend line, and weight auto-normalization; a "New here?" how-to hint; a "Live FRED data · updated {date}" freshness chip driven by `generatedAt`; two new glossary entries (Month-over-Month, Annualized); and a corrected Series ID example (`CPIAUCNS`).

**Tradeoffs:** Car Insurance could have been kept with an explicit "not live" label, but for a dashboard whose pitch is verifiable live FRED data, dropping one category is cleaner than a permanent asterisk. Verified end-to-end with Playwright (tooltips render, 0 stale, category removed) before ship.

### FRED live-data integration: build-time fetch, MoM figures, fallback resilience

**Why:** Replaced hardcoded CPI values with live FRED API data fetched at build time. `scripts/fetch-fred.mjs` runs in GitHub Actions using the `FRED_API_KEY` secret, fetches raw index levels server-side (no CORS, key never shipped to client), and writes `public/cpi.json`. The app loads it at runtime and falls back to bundled `src/data/fallback.json` if unavailable — resilient to API outages. Added month-over-month (MoM) figures for headline and core inflation (plus annualized) alongside YoY: YoY uses NSA series (e.g. `CPIAUCNS`), MoM uses seasonally-adjusted series (e.g. `CPIAUCSL`). Static metadata lives in `src/data/catalog.js`; a tested `buildViewData()` in `src/data/merge.js` merges catalog + dynamic values. Pure compute functions in `scripts/compute.mjs` (+ `scripts/assemble.mjs`) compute YoY/MoM/trend, tested via built-in `node --test` (no new deps). Trend chart auto-advances each build; gaps are data-driven (missing FRED months render as gaps). Refresh cadence: GitHub Actions schedule on the 13th and 16th of each month, plus workflow_dispatch and push-to-main. User sets `FRED_API_KEY` repo secret once to enable fetching.

## 2026-05-21

### Scaffold: Vite + React dashboard deployed to GitHub Pages

**Why:** Wired the existing personal-inflation-tracker.jsx (BLS CPI-U dashboard, Recharts + xlsx) into a fresh Vite + React 18 app and shipped it public. App.jsx is the component verbatim (default export drops straight in as App); main.jsx mounts it with a minimal CSS reset. vite.config base is /inflation-reality/ to match the GitHub Pages project URL — verified in the built dist/index.html asset paths. A GitHub Actions workflow (.github/workflows/deploy.yml) builds on push to main and publishes dist/ to gh-pages via peaceiris/actions-gh-pages; Pages is configured to serve from that branch. First deploy ran green in ~17s.

