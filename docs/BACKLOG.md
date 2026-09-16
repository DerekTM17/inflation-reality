# inflation-reality — Backlog

Open work organized by horizon (Now / Soon / Someday) with `[tag]` for
domain. Markdown checkboxes; edit by hand. Shipped items go to
`CHANGELOG.md`, not here.

## Now

Items we're actively working on or planning to do imminently.
- [x] **[feat]** surface `stale` flags in the UI when a series falls back — DONE 2026-09-10: `staleLabels()` + `StaleNote` under every section that shows fallback-able figures. Plain text for now; restyle in the redesign. <!-- added 2026-07-10, promoted 2026-09-01, done 2026-09-10 -->
- [x] **[bug]** `fetch-fred.mjs` should fail the build when a *macro* series (headline/core) falls back — DONE 2026-09-10: `staleMacroKeys()` fatals before cpi.json is written. Paired with `yoyAnchorDate()` so the missing October 2025 doesn't trip it in November 2026. <!-- added 2026-09-01, done 2026-09-10 -->
- [ ] **[feat]** calculator-first redesign: "how inflation hits you" reframe, dollar inputs + household situation choices (housing, getting around, commute, heating, daycare, tuition, health insurance via your own renewal increase), non-generic visual identity, real buttons with pressed/focus states. Brainstorm in progress 2026-09-10; spec to docs/superpowers/specs/. <!-- added 2026-09-10 -->
- [x] **[ops]** register a free BLS Public Data API key and add it as a GitHub Actions secret — DONE 2026-09-14: `BLS_API_KEY` set (confirmed via `gh secret list`). BLS keys must be renewed at least yearly; renew by 2027-09-14. <!-- added 2026-09-10, done 2026-09-14 -->
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
- [ ] **[ops]** Yearly (after BLS publishes December relative importance, around February, and the Consumer Expenditure release): update BASKET and CALC_COMBOS riDec values, riYear, and ceMonthlyMean in src/data/catalog.js, and re-run the basket tests. Stale weights make the Everything else rate drift. <!-- added 2026-09-16 -->
- [ ] **[feat]** Phase 2 decision: when one of the 8 basket series is missing, the whole basket falls back to last month (rolledWeights is all-or-nothing) while each calculator line fails on its own. Decide with the spec whether to drop the missing series and fold its weight into Everything else (changes what the visible items mean) or keep the whole-basket fallback. The warning already names the series. <!-- added 2026-09-16 -->
- [ ] **[tech-debt]** Test the fallback layering order in scripts/fetch-fred.mjs ({...bundledFallback, ...deployed}): it decides which number is published when both sources have one, and fetch-fred.mjs has no tests at all. Extract the merge into a pure function and test it. Also: check-lines.mjs parses public/cpi.json unguarded, so a bad file gives a stack trace instead of an ::error:: annotation. <!-- added 2026-09-16 -->
- [ ] **[data]** Sanity-check the large live rates against a second source before the calculator shows them: gasoline +27.4% and heating oil +52.0% year over year (August 2026). EIA weekly fuel is already in the payload (weeklyPrices) and makes a quick cross-check. <!-- added 2026-09-16 -->
- [ ] **[redesign]** Fix before merging redesign/calculator-first: allocateRounded (src/calculator/format.js) can still flip a small positive line negative when leftover steps are removed (k<0). Repros with real totals: [-300,8,-40] -> [-300,-10,-40]; [-1069,0,0,5,-11] -> [-1070,0,0,-10,-20]. Fix: in the k<0 branch take steps from negative-valued eligible entries first (removing never flips them), then positive entries with at least 2 units; mirror the headroom check for k>0; add both repros plus [104,7,12] as tests. <!-- added 2026-09-16 -->
- [ ] **[redesign]** Phase 2b: rebuild National numbers, Price check and Sources, then delete src/views/LegacyDashboard.jsx. Also: move focus to <main> and set document.title on route change; add aria-controls to the 'Show all N items' toggle; extend the audit with a keyboard-only Start over -> Undo flow and a 'set an amount to 0' flow. <!-- added 2026-09-16 -->
- [ ] **[redesign]** Owed before merging the redesign: the owner's 5-second test (5 non-designers, first phone screen: 'What does this page do?' and 'Is that number yours?'; at least 4 of 5 answer both correctly). <!-- added 2026-09-16 -->

## Someday

Latent items captured for future-when-they-bite. Not blocking anything now.

<!-- Suggested tags: bug, feat, perf, tech-debt, docs, ops, security, strategic. Use whatever fits. -->
- [ ] **[feat]** build a custom price-panel scraper for basket items — retail scraping is ToS-prohibited and brittle across sites; credible path requires public datasets (e.g., Bureau of Labor Statistics detail files, FRED linked data) + custom basket/weighting methodology (the hard part). Research and prototype alongside any future local price comparisons <!-- added 2026-07-13 -->
- [ ] **[feat]** refresh CPI-U data — values are hardcoded as of BLS March 2026; consider a script or BLS/FRED API pull instead of manual edits <!-- added 2026-05-21 -->
