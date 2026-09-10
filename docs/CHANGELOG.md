# inflation-reality — Changelog

A record of significant changes. Entries grouped by date (descending,
most recent first). Each covers **What** + **Why**; bigger decisions
also include **Tradeoffs / Alternatives considered**.

Curated, not exhaustive — `git log` has every commit.

## 2026-09-10

### Build guard and last-known-value notes

**Why:** The Core CPI incident showed a headline number can fall back to a months-old seed and render as current with no warning. Two layers now. `fetch-fred.mjs` fails the build when headline or core falls back (`staleMacroKeys()` in assemble.mjs, tested), so CI goes red and the live site keeps its last good data instead of shipping a frozen number. Categories, average prices, alt measures and EIA fuel may still degrade, but each section now says in plain text which figures are a last-known value (`staleLabels()` in merge.js plus a `StaleNote` component). Verified locally with injected stale flags, and against production: the first deploy with the guard reported 42/42 series live, 0 stale.

## 2026-09-01

### EIA weekly fuel prices as a second source

**Why:** Every price on the page came from the BLS, and the Price Check tab reads as 'today's prices' when it is really a monthly average landing weeks after the month ends. Added the EIA weekly retail fuel survey (`GASREGW`, `GASDESW`) for the two goods the BLS APU table also covers — mirrored on FRED, so no second API key and no change to the build. Each row shows the EIA price with its week-ending date beside the BLS monthly figure and the gap, which cross-checks BLS on identical goods and makes the lag visible instead of implying the monthly number is current. Live: 42/42 series, gasoline $4.071 (Aug 31) vs BLS $4.094 (July), diesel $5.599 vs $5.077. **`avgPrice()` could not be reused** — it finds the year-ago value by exact key (`shiftMonths(d,-12)` → `YYYY-MM-01`), which only ever matches a monthly series, whereas weekly observations land on Mondays; the new `weeklyPrice()` takes the observation nearest 365 days back and rejects anything outside a 10-day tolerance, so 52 weeks (364 days) matches and a short history correctly returns null rather than a wrong comparison. Verified red-green: breaking the lookback fails 3 tests, dropping the tolerance guard fails 1. Also tidied the hero tile's MoM block that prompted the work — the trailing InfoTip wrapped to its own line and the two rows' percentages did not align; both now render on one line (19px each) with a fixed-width label column.

### Hero tile centring and automotive diesel

**Why:** The three hero tiles are stretched to a common height by the grid, but their contents were top-aligned block flow, so the two shorter cards hung off the top of a box sized by the Headline tile and its MoM rows; the thrice-duplicated card style is now a single `heroCard` const that centres on the cross axis (verified live: top/bottom gaps 60/60, 21/21, 64/64). Diesel was missing from Price Check even though it is the fuel most people feel after gasoline — added `APU000074717` (Average Price: Automotive Diesel Fuel, per gallon, US city average), the same BLS APU family as the other 20 items, so it propagated to the price grid, .xlsx export, source badges and glossary with no other changes. Live: 40/40 series, diesel $5.08/gal vs $3.75 a year ago (+35.5%).

### Core CPI year-over-year was never live

**Why:** The NSA core series id in the catalog, `CPILFESNS`, 404s on FRED, so `assemblePayload`'s `macro()` got no observations for core YoY, fell back to `src/data/fallback.json`, and set `stale: true`. Every build from the 2026-07-10 live-data ship through 2026-08-16 published `core.yoy = 2.6` — a March 2026 seed value — and the UI rendered it beside genuinely live numbers with no warning, because the `stale` flag is computed and stored but never displayed. Correct id is `CPILFENS` (same title, confirmed NSA); July 2026 core YoY is 2.5, not 2.6. Verified against production: CI now reports 39/39 series live and live `cpi.json` has zero stale nodes. This is the same 404-on-FRED failure as the July category audit, which fixed the category ids and confirmed '0 stale categories' but never checked the headline/core macro nodes — the audit's scope, not its method, was the gap.

## 2026-07-16

### Code-split xlsx export behind a dynamic import

**Why:** xlsx is ~258 kB gzipped but only used on the Download .xlsx click, so a static top-level import forced every visitor to download it on first paint; moving it to an on-demand import() puts it in its own chunk and cuts ~90 kB gzip off the main bundle's critical path.

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

