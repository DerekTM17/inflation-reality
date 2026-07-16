# inflation-reality — Backlog

Open work organized by horizon (Now / Soon / Someday) with `[tag]` for
domain. Markdown checkboxes; edit by hand. Shipped items go to
`CHANGELOG.md`, not here.

## Now

Items we're actively working on or planning to do imminently.

## Soon

Items we want to tackle in the near term but aren't started yet.
- [ ] **[feat]** add Dallas Trimmed-Mean PCE (`PCETRIM12M159SFRBDAL`) as an additional FRED alternative measure — easy FRED series add to complement the existing four official gauges <!-- added 2026-07-13 -->
- [ ] **[feat]** add Case-Shiller home price index (`CSUSHPINSA`) to the alternatives panel — requires FRED series fetch and UI layout adjustment to accommodate a fifth measure <!-- added 2026-07-13 -->
- [ ] **[feat]** integrate Zillow ZORI (rent) data for real-time rental inflation visibility — fragile bulk CSV download + licensing check required; consider seasonal adjustment and smoothing <!-- added 2026-07-13 -->
- [ ] **[feat]** integrate EIA energy price API for gasoline and heating-oil spot prices — requires EIA API key, series routing, and comparison layout updates <!-- added 2026-07-13 -->
- [ ] **[feat]** surface `stale` flags subtly in the UI when a series falls back — when live FRED data is unavailable, highlight or badge affected series to signal data freshness <!-- added 2026-07-10 -->
- [ ] **[feat]** consider optional daily cron if mid-month proves too sparse — current 13th/16th schedule may miss data for mid-cycle analytics; daily refresh would catch all releases <!-- added 2026-07-10 -->
- [ ] **[feat]** consider category MoM if SA `CUSR` series coverage is sufficient — currently categories are YoY-only; expand to MoM if seasonally-adjusted CUSR series exist for all tracked categories <!-- added 2026-07-10 -->
- [ ] **[bug]** avgPrices yearAgo-null does not fall back or flag stale — when year-ago average price is unavailable, UI should gracefully handle or signal the missing data like other series <!-- added 2026-07-10 -->
- [ ] **[tech-debt]** merge macro uses default-param not optional-chaining for null headline/core node — refactor to use optional-chaining for consistency and clarity <!-- added 2026-07-10 -->
- [x] **[perf]** code-split the xlsx export behind a dynamic import() — DONE 2026-07-16: xlsx now loads on-demand in `downloadWorkbook` via `await import("xlsx")`, emitted as its own chunk (143 kB gzip); main bundle's critical path dropped ~90 kB gzip (258→168). Vite warning persists — remaining bulk is recharts, which is needed on first paint so it stays in the main chunk. <!-- added 2026-05-21, done 2026-07-16 -->
- [x] **[ops]** bump GitHub Actions off deprecated Node 20 — DONE 2026-07-14: checkout/setup-node v4→v7 (native Node 24 runtime), app build node-version 20→22 LTS; peaceiris@v4 left (not flagged). Deprecation annotation confirmed gone. <!-- added 2026-05-21, done 2026-07-14 -->

## Someday

Latent items captured for future-when-they-bite. Not blocking anything now.

<!-- Suggested tags: bug, feat, perf, tech-debt, docs, ops, security, strategic. Use whatever fits. -->
- [ ] **[feat]** build a custom price-panel scraper for basket items — retail scraping is ToS-prohibited and brittle across sites; credible path requires public datasets (e.g., Bureau of Labor Statistics detail files, FRED linked data) + custom basket/weighting methodology (the hard part). Research and prototype alongside any future local price comparisons <!-- added 2026-07-13 -->
- [ ] **[feat]** refresh CPI-U data — values are hardcoded as of BLS March 2026; consider a script or BLS/FRED API pull instead of manual edits <!-- added 2026-05-21 -->
