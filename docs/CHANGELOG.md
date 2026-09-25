# Inflation Reality — Changelog

A record of significant changes. Entries grouped by date (descending,
most recent first). Each covers **What** + **Why**; bigger decisions
also include **Tradeoffs / Alternatives considered**.

Curated, not exhaustive — `git log` has every commit.

## 2026-09-24

### Your costs calculator is live on the first screen

**Why:** The old first screen buried the point. Now the page opens with the average U.S. household, and one tap gives you your own estimate in dollars, with guesses marked and the sources named.

## 2026-09-16

### Gaps in the household spending data no longer show up as 0%

**Why:** A final review found that a missing reading in the average household's spending mix would show as 0%, which looks like real data. It now shows as no data. Warnings about out-of-date data now say which price series could not be read.

**Details:** A final whole-branch review of the calculator pipeline found round6(null) returned 0, and a basket component with a valid weight but no year-ago reading reached it, publishing 0.000000% instead of no data. round6 now returns null. The stale-basket warning names the unreadable series, and loadDeployedPayload warns on each failure path instead of failing silently. One missing basket series still stales the whole basket; redistributing its weight into Everything else was rejected as a spec decision for Phase 2. Deploy run 35137212694 verified: published numbers unchanged, 0 stale nodes, 71/71 tests.

### Added the price data the new calculator needs, not yet on the site

**Why:** The new calculator needs a 12-month price change for each spending line, and an average household that matches the headline rate. The data now includes 16 spending lines and that average household. Visitors can't see it yet; the calculator redesign builds on it.

**Details:** The calculator-first redesign needs a 12-month rate for every spending line and an average household that matches the headline. cpi.json now carries lines (16 ids, 7 from the BLS API because FRED does not mirror them) and a basket whose Everything else rate is solved from the headline with December 2025 relative-importance weights rolled forward to the reference month (unrolled weights were 0.7 points off). Lines and basket are always pinned to the reference month; BLS "-" months parse as missing, not zero. The build falls back to production cpi.json before the bundled snapshot, annotates problems, and a post-deploy check turns the run red if any BLS line is stale. Invisible to the current UI; Phase 2 builds on it.

## 2026-09-10

### Yearly rates still work when a year-ago month is missing

**Why:** The BLS never published October 2025 figures, so the October 2026 report, due around November 12, can't give a 12-month change. The site now uses the newest month, up to two months back, that has a year-ago figure. The page tells readers why it shows that month.

**Details:** BLS never published October 2025, so the October 2026 release (due around Nov 12) cannot produce any year-over-year change. The exact 12-month lookup would return null for headline, core and every category, and the new macro guard would fail the Nov 13 and 16 builds; before the guard it would have silently shipped the March fallback. `yoyAnchorDate()` now steps back up to 2 months to the newest month with a year-ago figure. assemble.mjs pins CPI YoY, MoM, categories, average prices and the trend to that month only when a gap exists (otherwise each series keeps its own latest month, because FRED can post one release's series hours apart), records a `yoyGap`, and the page explains "Why September?". Alt measures and EIA fuel keep their own dates. If nothing within 2 months is computable it still fails loudly. 46 tests pass; the note was checked rendering with a simulated gap.

### Removed the made-up "your rate" line from the 12-month trend chart

**Why:** The dashed "your rate" line was random noise that changed each time the chart was drawn. We don't keep past rates for each category, so no real history exists yet. The chart now shows the real headline line and one dot for your latest month.

**Details:** The dashed "your rate" line on the 12-Month Trend was fabricated: each past point was the headline plus the current gap scaled by `Math.random()`, so it redrew differently on every render. The pipeline only stores each category's latest YoY, so no real personal history exists. The chart now shows the real headline line plus one filled "You (latest month)" dot, and the subtitle and tooltip say why. Found by a code survey during redesign prep, not by a visitor; the old tooltip called it "an estimate", which undersold that it was noise. A real personal history needs category history in the payload and belongs to the redesign spec.

### Old headline numbers can no longer show on the site as current

**Why:** A headline number once fell back to months-old data and showed as current with no warning. Now, if the headline or core rate can't be updated, the update stops and the site keeps its last good data. Other sections say in plain text which figures are the last known value.

**Details:** The Core CPI incident showed a headline number can fall back to a months-old seed and render as current with no warning. Two layers now. `fetch-fred.mjs` fails the build when headline or core falls back (`staleMacroKeys()` in assemble.mjs, tested), so CI goes red and the live site keeps its last good data instead of shipping a frozen number. Categories, average prices, alt measures and EIA fuel may still degrade, but each section now says in plain text which figures are a last-known value (`staleLabels()` in merge.js plus a `StaleNote` component). Verified locally with injected stale flags, and against production: the first deploy with the guard reported 42/42 series live, 0 stale.

## 2026-09-01

### Price Check adds weekly gas and diesel prices from a second source

**Why:** Every price on the page came from the BLS, whose monthly average lands weeks after the month ends. Gas and diesel now also show the weekly price from the Energy Information Administration, with its date. This checks the BLS figures and shows how far behind they run.

**Details:** Every price on the page came from the BLS, and the Price Check tab reads as 'today's prices' when it is really a monthly average landing weeks after the month ends. Added the EIA weekly retail fuel survey (`GASREGW`, `GASDESW`) for the two goods the BLS APU table also covers — mirrored on FRED, so no second API key and no change to the build. Each row shows the EIA price with its week-ending date beside the BLS monthly figure and the gap, which cross-checks BLS on identical goods and makes the lag visible instead of implying the monthly number is current. Live: 42/42 series, gasoline $4.071 (Aug 31) vs BLS $4.094 (July), diesel $5.599 vs $5.077. **`avgPrice()` could not be reused** — it finds the year-ago value by exact key (`shiftMonths(d,-12)` → `YYYY-MM-01`), which only ever matches a monthly series, whereas weekly observations land on Mondays; the new `weeklyPrice()` takes the observation nearest 365 days back and rejects anything outside a 10-day tolerance, so 52 weeks (364 days) matches and a short history correctly returns null rather than a wrong comparison. Verified red-green: breaking the lookback fails 3 tests, dropping the tolerance guard fails 1. Also tidied the hero tile's MoM block that prompted the work — the trailing InfoTip wrapped to its own line and the two rows' percentages did not align; both now render on one line (19px each) with a fixed-width label column.

### Added diesel to Price Check and centered the top summary cards

**Why:** Diesel is the fuel most people feel after gasoline, but Price Check left it out. At launch it showed $5.08 a gallon, up 35.5% from $3.75 a year ago. The three summary cards at the top now center their contents instead of hanging from the top.

**Details:** The three hero tiles are stretched to a common height by the grid, but their contents were top-aligned block flow, so the two shorter cards hung off the top of a box sized by the Headline tile and its MoM rows; the thrice-duplicated card style is now a single `heroCard` const that centres on the cross axis (verified live: top/bottom gaps 60/60, 21/21, 64/64). Diesel was missing from Price Check even though it is the fuel most people feel after gasoline — added `APU000074717` (Average Price: Automotive Diesel Fuel, per gallon, US city average), the same BLS APU family as the other 20 items, so it propagated to the price grid, .xlsx export, source badges and glossary with no other changes. Live: 40/40 series, diesel $5.08/gal vs $3.75 a year ago (+35.5%).

### Fixed core inflation, which showed an old March figure for weeks

**Why:** The site looked up core inflation under a wrong ID, so it fell back to a saved March 2026 value. From July 10 through August 16 it showed 2.6% as if it were current, when the real July figure was 2.5%. It now uses the right ID, and all 39 data series are live.

**Details:** The NSA core series id in the catalog, `CPILFESNS`, 404s on FRED, so `assemblePayload`'s `macro()` got no observations for core YoY, fell back to `src/data/fallback.json`, and set `stale: true`. Every build from the 2026-07-10 live-data ship through 2026-08-16 published `core.yoy = 2.6` — a March 2026 seed value — and the UI rendered it beside genuinely live numbers with no warning, because the `stale` flag is computed and stored but never displayed. Correct id is `CPILFENS` (same title, confirmed NSA); July 2026 core YoY is 2.5, not 2.6. Verified against production: CI now reports 39/39 series live and live `cpi.json` has zero stale nodes. This is the same 404-on-FRED failure as the July category audit, which fixed the category ids and confirmed '0 stale categories' but never checked the headline/core macro nodes — the audit's scope, not its method, was the gap.

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

