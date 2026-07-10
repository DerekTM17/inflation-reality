# FRED Live Data — Design

**Date:** 2026-07-10
**Project:** inflation-reality
**Status:** Approved (design), pending implementation plan

## Problem

Every number on the dashboard is currently a hardcoded constant in `src/App.jsx`
(`CPI_DATA`, `TREND_DATA`, `AVG_PRICES`), manually transcribed from the BLS CPI-U
March 2026 release. It never refreshes on its own. We want the dashboard to pull
live data from FRED so it updates as BLS publishes, and to add a month-over-month
(MoM) reading alongside the existing year-over-year (YoY) framing.

## Constraint that shapes everything

The site is a **static GitHub Pages** deployment with no backend. The FRED API
cannot be called directly from the browser because:

1. **API key exposure** — FRED requires an `api_key` on every request; anything in
   the client bundle is public.
2. **CORS** — `api.stlouisfed.org` sends no CORS headers, so browser `fetch()` is
   blocked regardless of key.

Therefore the fetch must happen **server-side at build time**, not in the client.

## Architecture — Option A: build-time fetch

```
GitHub Actions (scheduled + on push + manual)
  └─ node scripts/fetch-fred.mjs   (reads FRED_API_KEY from Actions secret)
       ├─ fetch raw index levels from FRED  (server-side → no CORS, key never shipped)
       ├─ compute YoY, MoM, trailing-12 trend, avg prices
       └─ write public/cpi.json  (with per-value seriesId + generatedAt stamp)
  └─ vite build   (copies public/cpi.json → dist/)
  └─ deploy dist/ → gh-pages

Browser (runtime)
  └─ App loads cpi.json  →  falls back to bundled src/data/fallback.json on failure
```

The site stays 100% static and free. No new hosting infrastructure.

## Data: series and computation

The build fetches **raw index levels** (index history), then computes everything.
YoY and MoM deliberately use different FRED series, matching how BLS itself reports:

| Metric | FRED series | Adjustment | Notes |
|---|---|---|---|
| Headline YoY | `CPIAUCNS` | NSA | BLS reports the 12-month change from not-seasonally-adjusted |
| Headline MoM | `CPIAUCSL` | SA | 1-month change must be seasonally adjusted or it is noise |
| Core YoY | `CPILFESNS` | NSA | All items less food & energy |
| Core MoM | `CPILFESL` | SA | |
| Categories (11) | existing `CUUR…` | NSA | **YoY only** — SA variants don't all exist; keeps scope tight |
| Average prices (20) | existing `APU…` | NSA levels | current level + year-ago level (dollars), read directly |

**Computations (pure functions):**
- `computeYoY(series, month)` = `(idx[m] / idx[m-12] − 1) × 100`
- `computeMoM(seriesSA, month)` = `(idx[m] / idx[m-1] − 1) × 100`
- Annualized MoM = `((idx[m] / idx[m-1]) ** 12 − 1) × 100`
- `buildTrend(seriesNSA)` = trailing 12 months of headline YoY. Auto-advances each
  build. **Gaps are data-driven**: a month with no FRED observation (e.g. the Oct/Nov
  2025 funding lapse) renders as a gap automatically — not hardcoded.

**Weights / presets** (`PRESETS`, `presetWeights`) stay hardcoded — relative-importance
weights are not a FRED series and BLS updates them only annually.

## New MoM feature (UI)

Add a MoM figure for **headline and core** near the existing YoY headline numbers —
e.g. "+0.3% since last month" (and its annualized form). Categories remain YoY-only.
This is the "is inflation accelerating right now" signal that YoY smooths away.

## App changes

- Move `CPI_DATA`, `TREND_DATA`, `AVG_PRICES` out of `App.jsx`.
- Load them from `cpi.json` into React state on mount.
- Seed the current hardcoded values into `src/data/fallback.json` (last-known-good).
- `PRESETS` / `presetWeights` stay inline.
- `cpi.json` carries `seriesId` per value + a `generatedAt` timestamp, preserving the
  dashboard's "every number traces to a BLS series ID + FRED URL" ethos and adding a
  live "data as of …" stamp. The existing "Verify this data" section keeps working.

## cpi.json shape (sketch)

```json
{
  "generatedAt": "2026-07-13T06:00:00Z",
  "referenceMonth": "2026-06",
  "headline": { "yoy": 3.3, "mom": 0.3, "momAnnualized": 3.7, "seriesIdYoY": "CPIAUCNS", "seriesIdMoM": "CPIAUCSL" },
  "core":     { "yoy": 2.6, "mom": 0.2, "momAnnualized": 2.4, "seriesIdYoY": "CPILFESNS", "seriesIdMoM": "CPILFESL" },
  "categories": [ { "id": "groceries", "yoy": 3.1, "seriesId": "CUUR0000SAF11", "stale": false }, ... ],
  "avgPrices":  [ { "item": "Eggs, Grade A Large", "current": 6.23, "yearAgo": 3.56, "seriesId": "APU0000708111" }, ... ],
  "trend": [ { "month": "Jul 25", "headline": 2.6 }, { "month": "Aug 25", "headline": 2.5 }, ... ]
}
```

## Error handling & resilience

- **Per-series failure:** fall back to that series' seed value from `fallback.json`,
  set `"stale": true`, and continue — the dashboard never blanks out.
- **Whole-fetch failure** (e.g. missing/invalid key): the build **fails loudly** so it
  is noticed; the previously-deployed `cpi.json` keeps serving on the live site.
- Client: if `cpi.json` is missing or malformed at runtime, render `fallback.json`.

## Refresh cadence (GitHub Actions)

- `schedule:` cron on the **13th and 16th** of each month (BLS releases mid-month; the
  second run catches the release plus any immediate revision).
- Keep `on: push: [main]` (deploy on code changes) and add `workflow_dispatch`
  (on-demand refresh).
- Add step: run `scripts/fetch-fred.mjs` before `npm run build`.

## Testing

- Compute functions (`computeYoY`, `computeMoM`, `buildTrend`, price extraction) live
  in a pure module (`scripts/compute.mjs`) with **no network**.
- Tested with fixture FRED responses via Node 20's built-in `node --test` — **no new
  dependencies**. Add `"test": "node --test"` to `package.json`.

## Setup the user must do once

Create a free FRED API key at <https://fred.stlouisfed.org/docs/api/api_key.html> and
add it as a GitHub repo secret named `FRED_API_KEY`. (Flagged again during
implementation.)

## Out of scope (YAGNI)

- Runtime serverless proxy (Option B) — unnecessary for monthly-cadence data.
- Category MoM — SA category series incomplete; not worth the complexity.
- Fetching relative-importance weights — annual, not a series.
- Historical trend beyond trailing 12 months.
```
