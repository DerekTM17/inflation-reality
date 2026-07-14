# Alternative Measures Panel — Design

**Date:** 2026-07-13
**Project:** inflation-reality
**Status:** Approved (design), pending implementation plan

## Problem

The dashboard shows Headline and Core CPI-U. Users reasonably ask "is that the *only*
way to measure inflation?" It isn't — several credible official gauges exist (Core PCE,
median/trimmed-mean CPI, sticky-price CPI) and often tell a meaningfully different story.
Add a panel comparing the major alternative measures, using the existing build-time FRED
pipeline. No new API keys, no licensing, all high-credibility.

Scope for v1 is deliberately **A** (alternative official measures only). Real-time rent
(Zillow ZORI), energy (EIA), home prices (Case-Shiller), and a self-built scraped price
panel are explicitly **BACKLOG**.

## Verified data (checked directly against FRED, keyless CSV, 2026-07-13)

All six series exist (HTTP 200) and are current through at least 2026-05:

| Measure | FRED series | Native form → handling |
|---|---|---|
| Headline CPI (have) | `CPIAUCNS` | index → compute YoY |
| Core CPI (have) | `CPILFESNS` | index → compute YoY |
| **Core PCE** | `PCEPILFE` | index (~130) → compute YoY (BEA, monthly SA) |
| **Median CPI** | `MEDCPIM159SFRBCLE` | already 12-month % (~2.85) → use value directly |
| **16% Trimmed-Mean CPI** | `TRMMEANCPIM159SFRBCLE` | already 12-month % (~2.9) → use directly |
| **Sticky-Price Core CPI** | `CORESTICKM159SFRBATL` | already 12-month % (~3.1) → use directly |

**Key finding:** the FRED suffix `M158` = 1-month annualized, `M159` = 12-month % change.
The commonly-linked `…M158…` median/trimmed series are 1-month annualized rates (jumpy,
NOT comparable to a YoY line); the `…M159…` variants are the 12-month rates we want.

**Two source kinds** the fetch/compute layer must handle:
- `kind: "index"` — fetch observations, compute YoY = `idx[m]/idx[m-12] − 1` (existing logic).
- `kind: "yoyRate"` — the observation value already **is** the 12-month %; use the latest
  non-null value directly (new, tiny handling).

**Reference-month caveat:** PCE publishes ~2 weeks after CPI, so on a given build the
measures may not all share the same latest month. The panel shows **each measure's own
latest available reading** and labels the comparison as "most recent available," rather
than assuming a single shared reference month.

**SA/NSA note:** headline/core YoY use NSA; PCE and the rate measures are SA-based. Over a
12-month change this difference is immaterial (standard practice to compare CPI and PCE YoY
directly). A short footnote/InfoTip will say these are all ~12-month changes.

## Architecture (extends the existing pipeline — no new patterns)

```
catalog.js   ALT_MEASURES = [{ key, label, seriesId, kind, blurb, color }]  (4 entries)
                └ allSeries() also emits these series ids for the fetch
fetch-fred    fetches every allSeries() id (unchanged loop)
assemble.mjs  builds payload.altMeasures[]:
                index  → computeYoY(obs)          (reuse compute.mjs)
                yoyRate→ latest non-null value    (new helper: latestValue(obs))
                per-entry { key, yoy, stale }  (fallback + stale, same as categories)
merge.js      buildViewData → view.altMeasures = ALT_MEASURES merged with dynamic yoy/stale
              (headline & core already in view; the comparison chart also uses those)
App.jsx       new "How Others Measure It" card renders a horizontal bar comparison
fallback.json altMeasures snapshot (last-known-good)
```

### cpi.json addition
```json
"altMeasures": {
  "corePce":     { "yoy": 3.4 },
  "medianCpi":   { "yoy": 2.9 },
  "trimmedCpi":  { "yoy": 2.9 },
  "stickyCpi":   { "yoy": 3.1 }
}
```
Keyed by `key`. A failed/empty series → `{ yoy: <fallback>, stale: true }` (same convention
as categories). YoY-only in v1 (no MoM for alt measures).

## UI

New card on the dashboard (below the existing charts row, above or near the spending mix),
titled **"How Others Measure It"**:
- One-line lede: "The headline isn't the only inflation gauge — here's what the major
  alternative measures say for the same period."
- A **horizontal bar chart** (Recharts, styled like the existing Biggest-Movers chart) with
  one bar per measure: **Headline, Core, Core PCE, Median CPI, Trimmed-Mean CPI,
  Sticky-Price CPI** — value = latest 12-month %, sorted descending so the spread reads at a
  glance. Each bar its own color; label shows the % on the bar.
- Each measure carries an **InfoTip** (reuse existing component) explaining what it is, and
  the section lists their **FRED series-ID badges** (reuse `DataSourceBadge`) for provenance.
- A small footnote: "All figures are ~12-month (year-over-year) changes. Measures may
  reflect slightly different latest months (e.g. PCE publishes after CPI)."

Tooltips per measure (plain-language, matches existing glossary voice):
- Core PCE — "The Fed's preferred gauge (from the BEA). Weighted differently than CPI and
  usually runs a bit lower; it's what the Fed targets at 2%."
- Median CPI — "Takes the *middle* category's price change, ignoring the biggest movers on
  both ends. A cleaner read on the broad trend."
- Trimmed-Mean CPI — "Throws out the most extreme 8% of price moves on each side, then
  averages the rest. Like Median CPI, it strips out noise."
- Sticky-Price CPI — "Only counts prices that change slowly (rent, insurance) — they tend to
  reflect longer-run expectations, so this is a steadier signal."

## Loose ends handled in the same pass
- **Excel export:** a new "Alternative Measures" section (or rows) — measure, series ID,
  latest YoY, FRED URL — so the "every data point" claim stays true.
- **"All Series IDs Used"** methodology list: include the 4 new series (dynamic, so it
  updates automatically once they're in the view — verify).
- **Glossary:** add PCE, Median CPI, Trimmed-Mean CPI, Sticky-Price CPI entries.

## Error handling / resilience
- Per-series: missing/empty → fallback value + `stale: true` (never blank the panel).
- `latestValue(obs)` returns null on all-null; bar for a null measure is omitted (filtered),
  not rendered as 0/NaN.
- Client keeps the bundled fallback if `cpi.json` is missing/malformed (existing guard).

## Testing (extends existing `node --test`, no new deps)
- `compute.mjs`: `latestValue(observations)` — returns latest non-null, null when none.
- `assemble.mjs`: `altMeasures` — index-kind computes YoY; yoyRate-kind passes the value
  through; a missing series falls back with `stale: true`.
- `merge.js`: `buildViewData` produces `view.altMeasures` as an array of
  `{ key, label, seriesId, kind, color, blurb, yoy, stale }`.
- `catalog.js`: `ALT_MEASURES` has 4 entries; `allSeries()` includes their ids.

## Out of scope (BACKLOG)
- Real-time rent (Zillow ZORI), EIA energy, Case-Shiller home prices.
- Self-built scraped price database (retail scraping is ToS-prohibited/brittle; the credible
  path is public datasets + the hard part is basket/weighting methodology).
- Truflation / other paid or non-credible indexes.
- MoM for the alternative measures.
