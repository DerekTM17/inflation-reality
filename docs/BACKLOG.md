# inflation-reality — Backlog

Open work organized by horizon (Now / Soon / Someday) with `[tag]` for
domain. Markdown checkboxes; edit by hand. Shipped items go to
`CHANGELOG.md`, not here.

## Now

Items we're actively working on or planning to do imminently.
- [x] **[feat]** surface `stale` flags in the UI when a series falls back — DONE 2026-09-10: `staleLabels()` + `StaleNote` under every section that shows fallback-able figures. Plain text for now; restyle in the redesign. <!-- added 2026-07-10, promoted 2026-09-01, done 2026-09-10 -->
- [x] **[bug]** `fetch-fred.mjs` should fail the build when a *macro* series (headline/core) falls back — DONE 2026-09-10: `staleMacroKeys()` fatals before cpi.json is written. Paired with `yoyAnchorDate()` so the missing October 2025 doesn't trip it in November 2026. <!-- added 2026-09-01, done 2026-09-10 -->
- [ ] **[feat]** calculator-first redesign: "how inflation hits you" reframe, dollar inputs + household situation choices (housing, getting around, commute, heating, daycare, tuition, health insurance via your own renewal increase), non-generic visual identity, real buttons with pressed/focus states. Brainstorm in progress 2026-09-10; spec to docs/superpowers/specs/. <!-- added 2026-09-10 -->
- [ ] **[ops]** register a free BLS Public Data API key (bls.gov/developers) and add it as a GitHub Actions secret — 7 of the redesign series are NOT on FRED (car insurance SETE, daycare SEEB03, tuition SEEB01, fuel oil SEHE01, intracity transit SETG02, health insurance SEME, other motor fuels SETB02); keyless tier is 25 requests/day. USER TASK. <!-- added 2026-09-10 -->
- [ ] **[bug]** live site: the "BLS Default" spending profile shows 3.9% vs the 3.4% headline and labels an average household "+0.5 above headline" — the 10 CATEGORIES cover only ~79% of CPI relative importance, so default weights cannot reproduce the headline. Fixed by the redesign (derived "Everything else" residual, see 2026-09-10 spec); if the redesign slips, relabel or hide the delta for the default profile. <!-- added 2026-09-10 -->

## Soon

Items we want to tackle in the near term but aren't started yet.
- [x] **[feat]** add Dallas Trimmed-Mean PCE (`PCETRIM12M159SFRBDAL`) as an additional FRED alternative measure — DONE 2026-07-14 (5th alt measure; live on the "How Others Measure It" chart). Ticked 2026-09-10. <!-- added 2026-07-13, done 2026-07-14 -->
- [ ] **[feat]** add Case-Shiller home price index (`CSUSHPINSA`) to the alternatives panel — requires FRED series fetch and UI layout adjustment to accommodate a fifth measure <!-- added 2026-07-13 -->
- [ ] **[feat]** integrate Zillow ZORI (rent) data for real-time rental inflation visibility — fragile bulk CSV download + licensing check required; consider seasonal adjustment and smoothing <!-- added 2026-07-13 -->
- [ ] **[feat]** integrate EIA energy price API for gasoline and heating-oil spot prices — requires EIA API key, series routing, and comparison layout updates <!-- added 2026-07-13 -->
- [ ] **[feat]** consider optional daily cron if mid-month proves too sparse — current 13th/16th schedule may miss data for mid-cycle analytics; daily refresh would catch all releases <!-- added 2026-07-10 -->
- [ ] **[feat]** consider category MoM if SA `CUSR` series coverage is sufficient — currently categories are YoY-only; expand to MoM if seasonally-adjusted CUSR series exist for all tracked categories <!-- added 2026-07-10 -->
- [ ] **[bug]** avgPrices yearAgo-null does not fall back or flag stale — when year-ago average price is unavailable, UI should gracefully handle or signal the missing data like other series <!-- added 2026-07-10 -->
- [ ] **[tech-debt]** merge macro uses default-param not optional-chaining for null headline/core node — refactor to use optional-chaining for consistency and clarity <!-- added 2026-07-10 -->
- [x] **[perf]** code-split the xlsx export behind a dynamic import() — DONE 2026-07-16: xlsx now loads on-demand in `downloadWorkbook` via `await import("xlsx")`, emitted as its own chunk (143 kB gzip); main bundle's critical path dropped ~90 kB gzip (258→168). Vite warning persists — remaining bulk is recharts, which is needed on first paint so it stays in the main chunk. <!-- added 2026-05-21, done 2026-07-16 -->
- [x] **[ops]** bump GitHub Actions off deprecated Node 20 — DONE 2026-07-14: checkout/setup-node v4→v7 (native Node 24 runtime), app build node-version 20→22 LTS; peaceiris@v4 left (not flagged). Deprecation annotation confirmed gone. <!-- added 2026-05-21, done 2026-07-14 -->
- [ ] **[feat]** add IMF/World Bank global commodity prices as a third source — verified live on FRED: coffee `PCOFFOTMUSDM`, beef `PBEEFUSDM`, bananas `PBANSOPUSDM`, sugar `PSUGAISAUSDM`, poultry `PPOULTUSDM`, wheat `PWHEAMTUSDM`. Monthly, first-of-month dates, so `avgPrice`/`computeYoY` work unchanged (no weekly-lookup work needed, unlike the EIA add). Frames as 'what the raw commodity costs on world markets vs what you pay at the store' for goods already in the Price Check table. CONSTRAINT: units are cents/lb and USD/tonne, so only YoY-vs-YoY is honest — never show these as dollars beside retail prices. <!-- added 2026-09-01 -->
- [ ] **[feat]** international comparison tab: US inflation vs other countries (OECD/IMF, via FRED where mirrored). Separate spec after the redesign lands; verify sources and comparability (HICP vs CPI) first. <!-- added 2026-09-10 -->
- [ ] **[bug]** Biggest Movers bar colors can land on the wrong bars — the Cell color list is built from a list that does not drop null-yoy items, so indices drift from the chart data. Fix in the redesign. <!-- added 2026-09-10 -->
- [ ] **[ops]** BLS API keys must be renewed at least once a year (bls.gov/developers/api_faqs.htm). An expired BLS_API_KEY would quietly turn the 6 BLS-only calculator lines stale (non-fatal by design), so fetch should log a loud ::warning:: annotation when BLS returns a key/threshold error, and set a yearly reminder from the date the key is registered. <!-- added 2026-09-10 -->

## Someday

Latent items captured for future-when-they-bite. Not blocking anything now.

<!-- Suggested tags: bug, feat, perf, tech-debt, docs, ops, security, strategic. Use whatever fits. -->
- [ ] **[feat]** build a custom price-panel scraper for basket items — retail scraping is ToS-prohibited and brittle across sites; credible path requires public datasets (e.g., Bureau of Labor Statistics detail files, FRED linked data) + custom basket/weighting methodology (the hard part). Research and prototype alongside any future local price comparisons <!-- added 2026-07-13 -->
- [ ] **[feat]** refresh CPI-U data — values are hardcoded as of BLS March 2026; consider a script or BLS/FRED API pull instead of manual edits <!-- added 2026-05-21 -->
