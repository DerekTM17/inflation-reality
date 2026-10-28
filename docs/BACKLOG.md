# Inflation Reality — Backlog

Open work organized by horizon (Now / Soon / Someday) with `[tag]` for
domain. Markdown checkboxes; edit by hand. Shipped items go to
`CHANGELOG.md`, not here.

## Now

Items we're actively working on or planning to do imminently.

## Soon

Items we want to tackle in the near term but aren't started yet.
- [ ] **[feat]** add Case-Shiller home price index (`CSUSHPINSA`) to the alternatives panel — requires FRED series fetch and UI layout adjustment to accommodate a fifth measure <!-- added 2026-07-13 -->
- [ ] **[feat]** integrate Zillow ZORI (rent) data for real-time rental inflation visibility — fragile bulk CSV download + licensing check required; consider seasonal adjustment and smoothing <!-- added 2026-07-13 -->
- [ ] **[feat]** integrate EIA energy price API for gasoline and heating-oil spot prices — requires EIA API key, series routing, and comparison layout updates <!-- added 2026-07-13 -->
- [ ] **[feat]** consider optional daily cron if mid-month proves too sparse — current 13th/16th schedule may miss data for mid-cycle analytics; daily refresh would catch all releases <!-- added 2026-07-10 -->
- [ ] **[feat]** consider category MoM if SA `CUSR` series coverage is sufficient — currently categories are YoY-only; expand to MoM if seasonally-adjusted CUSR series exist for all tracked categories <!-- added 2026-07-10 -->
- [ ] **[bug]** avgPrices yearAgo-null does not fall back or flag stale — when year-ago average price is unavailable, UI should gracefully handle or signal the missing data like other series <!-- added 2026-07-10 -->
- [ ] **[tech-debt]** merge macro uses default-param not optional-chaining for null headline/core node — refactor to use optional-chaining for consistency and clarity <!-- added 2026-07-10 -->
- [ ] **[feat]** add IMF/World Bank global commodity prices as a third source — verified live on FRED: coffee `PCOFFOTMUSDM`, beef `PBEEFUSDM`, bananas `PBANSOPUSDM`, sugar `PSUGAISAUSDM`, poultry `PPOULTUSDM`, wheat `PWHEAMTUSDM`. Monthly, first-of-month dates, so `avgPrice`/`computeYoY` work unchanged (no weekly-lookup work needed, unlike the EIA add). Frames as 'what the raw commodity costs on world markets vs what you pay at the store' for goods already in the Price Check table. CONSTRAINT: units are cents/lb and USD/tonne, so only YoY-vs-YoY is honest — never show these as dollars beside retail prices. <!-- added 2026-09-01 -->
- [ ] **[feat]** international comparison tab: US inflation vs other countries (OECD/IMF, via FRED where mirrored). Separate spec after the redesign lands; verify sources and comparability (HICP vs CPI) first. <!-- added 2026-09-10 -->
- [ ] **[ops]** BLS API keys must be renewed at least once a year (bls.gov/developers/api_faqs.htm). An expired BLS_API_KEY would quietly turn the 6 BLS-only calculator lines stale (non-fatal by design), so fetch should log a loud ::warning:: annotation when BLS returns a key/threshold error, and set a yearly reminder from the date the key is registered. <!-- added 2026-09-10 -->
- [ ] **[ops]** Yearly (after BLS publishes December relative importance, around February, and the Consumer Expenditure release): update BASKET and CALC_COMBOS riDec values, riYear, and ceMonthlyMean in src/data/catalog.js, and re-run the basket tests. Stale weights make the Everything else rate drift. <!-- added 2026-09-16 -->
- [ ] **[feat]** Phase 2 decision: when one of the 8 basket series is missing, the whole basket falls back to last month (rolledWeights is all-or-nothing) while each calculator line fails on its own. Decide with the spec whether to drop the missing series and fold its weight into Everything else (changes what the visible items mean) or keep the whole-basket fallback. The warning already names the series. <!-- added 2026-09-16 -->
- [ ] **[tech-debt]** Test the fallback layering order in scripts/fetch-fred.mjs ({...bundledFallback, ...deployed}): it decides which number is published when both sources have one, and fetch-fred.mjs has no tests at all. Extract the merge into a pure function and test it. Also: check-lines.mjs parses public/cpi.json unguarded, so a bad file gives a stack trace instead of an ::error:: annotation. <!-- added 2026-09-16 -->
- [ ] **[data]** Sanity-check the large live rates against a second source before the calculator shows them: gasoline +27.4% and heating oil +52.0% year over year (August 2026). EIA weekly fuel is already in the payload (weeklyPrices) and makes a quick cross-check. <!-- added 2026-09-16 -->
- [ ] **[redesign]** Decide whether to drop the Home insurance line <!-- added 2026-09-24 -->
  It starts empty and only shows a prompt row asking for a renewal increase, which is homework most people skip; the same reasoning that kept property taxes out (2026-09-17 spec note) may apply to it. Alternative: keep it but drop the prompt row.
- [ ] **[redesign]** Make the national comparison fair for people who own their home outright <!-- added 2026-09-24 -->
  The national rate includes owners' equivalent rent, which an outright owner does not pay in cash, so the verdict can read 'More than the national rate' right after they say they own outright, while their dollar total actually falls (3.92% on $2,310/mo vs 3.48% on $3,830/mo renting). Options: lead with dollars, soften or drop the comparison for owners, or explain the mismatch in one sentence. Needs a spec change to the verdict rule.
- [ ] Restyle the new tabs with per-good colors, hover details and motion before Phase 2b merges <!-- added 2026-10-14 -->
  Owner picked the Bolder mockup, wants quick-start households back and a compact two-column layout. Open: collapsible family cards on phones. Mockups in docs/superpowers/mockups/2026-10-02-color-study-*.html on branch redesign/phase2b; palette and plan in the 2026-10-14 handoff in docs/SESSIONS.md.
- [ ] Make the dark-mode color check catch pale tinted backgrounds <!-- added 2026-10-18 -->
  scripts/audit/ui-audit.py lum() misreads Chrome's color(srgb …) values, so color-mix tints on .fam/.mrow can never fail the dark light-background check. Parse color(srgb r g b) as 0–1 floats. Found in the 2026-10-18 rev 4 final review.
- [ ] Polish leftovers from the bolder look review <!-- added 2026-10-18 -->
  Parked 2026-10-18: card folds and drops focus when crossing 600px with focus inside (FamilyCards narrow flip); .lg.hl bold reflows legend; tiny shares draw ≤1px slices (min-width); trend EndLabel clips past ~6 chars (right margin 48); useHover dismissed key clears only on pointerleave; dedupe useReducedMotion/MINUS/'around'.
- [ ] Point the price-data script at the new address <!-- added 2026-10-26 -->
  scripts/fetch-fred.mjs:16 still fetches derektm17.github.io/inflation-reality/cpi.json; works via 301 redirect. Switch to https://inflation.translatingpolicy.com/cpi.json.
- [ ] Base the calculator's starting dollar amounts on government spending surveys <!-- added 2026-10-27 -->
  None of the 21 defaults has a source (rent 1650, hybrid x0.55, +80 electric heat, 650 own insurance...). Sources page now calls them example numbers. Spec 2026-09-10 planned Consumer Expenditure tenure tables. Found by the methodology rewrite, branch docs/methodology-update.
- [ ] Check the health insurance through work default against what workers actually pay <!-- added 2026-10-27 -->
  Default applies KFF 2025's 6% family-premium rise to the worker's own share, which may grow differently; the 180 a month start matches no KFF figure. KFF also publishes single-plan and worker-contribution numbers.
- [ ] Stop Everything else from double counting lines people already entered <!-- added 2026-10-27 -->
  Personal Everything else uses the average household's leftover rate, which includes cars, car insurance, fares, tuition that the user may have entered separately. Disclosed as an estimate; not corrected.

## Someday

Latent items captured for future-when-they-bite. Not blocking anything now.

<!-- Suggested tags: bug, feat, perf, tech-debt, docs, ops, security, strategic. Use whatever fits. -->
- [ ] **[feat]** build a custom price-panel scraper for basket items — retail scraping is ToS-prohibited and brittle across sites; credible path requires public datasets (e.g., Bureau of Labor Statistics detail files, FRED linked data) + custom basket/weighting methodology (the hard part). Research and prototype alongside any future local price comparisons <!-- added 2026-07-13 -->
- [ ] **[feat]** refresh CPI-U data — values are hardcoded as of BLS March 2026; consider a script or BLS/FRED API pull instead of manual edits <!-- added 2026-05-21 -->
