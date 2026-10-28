# Inflation Reality — Done

Finished backlog items, moved here by `ledger done` and `ledger tidy`. Newest first.

## 2026-10-28

- [x] Restyle the new tabs with per-good colors, hover details and motion before Phase 2b merges <!-- added 2026-10-14 --> <!-- from Soon -->
  Owner picked the Bolder mockup, wants quick-start households back and a compact two-column layout. Open: collapsible family cards on phones. Mockups in docs/superpowers/mockups/2026-10-02-color-study-*.html on branch redesign/phase2b; palette and plan in the 2026-10-14 handoff in docs/SESSIONS.md.
- [x] **[bug]** The "BLS Default" spending profile shows 3.9%, not the 3.4% headline, and wrongly calls an average household 0.5 points above it <!-- added 2026-09-10 --> <!-- from Now -->
  live site: the "BLS Default" spending profile shows 3.9% vs the 3.4% headline and labels an average household "+0.5 above headline" — the 10 CATEGORIES cover only ~79% of CPI relative importance, so default weights cannot reproduce the headline. Fixed by the redesign (derived "Everything else" residual, see 2026-09-10 spec); if the redesign slips, relabel or hide the delta for the default profile.
- [x] **[bug]** Biggest Movers bar colors can land on the wrong bars — the Cell color list is built from a list that does not drop null-yoy items, so indices drift from the chart data. Fix in the redesign. <!-- added 2026-09-10 --> <!-- from Soon -->

## 2026-10-27

- [x] **[feat]** Redesign the site around a calculator that shows how inflation hits you, using your own dollar amounts and situation <!-- added 2026-09-10 --> <!-- from Now -->
  calculator-first redesign: "how inflation hits you" reframe, dollar inputs + household situation choices (housing, getting around, commute, heating, daycare, tuition, health insurance via your own renewal increase), non-generic visual identity, real buttons with pressed/focus states. Brainstorm in progress 2026-09-10; spec to docs/superpowers/specs/.
- [x] **[redesign]** Phase 2b: rebuild National numbers, Price check and Sources, then delete src/views/LegacyDashboard.jsx. Also: move focus to <main> and set document.title on route change; add aria-controls to the 'Show all N items' toggle; extend the audit with a keyboard-only Start over -> Undo flow and a 'set an amount to 0' flow. <!-- added 2026-09-16 --> <!-- from Soon -->
- [x] **[redesign]** Owed before merging the redesign: the owner's 5-second test (5 non-designers, first phone screen: 'What does this page do?' and 'Is that number yours?'; at least 4 of 5 answer both correctly). <!-- added 2026-09-16 --> <!-- from Soon -->

## 2026-09-28

- [x] **[redesign]** Fix before merging redesign/calculator-first: allocateRounded (src/calculator/format.js) can still flip a small positive line negative when leftover steps are removed (k<0). Repros with real totals: [-300,8,-40] -> [-300,-10,-40]; [-1069,0,0,5,-11] -> [-1070,0,0,-10,-20]. Fix: in the k<0 branch take steps from negative-valued eligible entries first (removing never flips them), then positive entries with at least 2 units; mirror the headroom check for k>0; add both repros plus [104,7,12] as tests. <!-- added 2026-09-16 --> <!-- from Soon -->

## 2026-09-18

- [x] **[feat]** surface `stale` flags in the UI when a series falls back — DONE 2026-09-10: `staleLabels()` + `StaleNote` under every section that shows fallback-able figures. Plain text for now; restyle in the redesign. <!-- added 2026-07-10, promoted 2026-09-01, done 2026-09-10 --> <!-- from Now -->
- [x] **[bug]** `fetch-fred.mjs` should fail the build when a *macro* series (headline/core) falls back — DONE 2026-09-10: `staleMacroKeys()` fatals before cpi.json is written. Paired with `yoyAnchorDate()` so the missing October 2025 doesn't trip it in November 2026. <!-- added 2026-09-01, done 2026-09-10 --> <!-- from Now -->
- [x] **[ops]** register a free BLS Public Data API key and add it as a GitHub Actions secret — DONE 2026-09-14: `BLS_API_KEY` set (confirmed via `gh secret list`). BLS keys must be renewed at least yearly; renew by 2027-09-14. <!-- added 2026-09-10, done 2026-09-14 --> <!-- from Now -->
- [x] **[feat]** add Dallas Trimmed-Mean PCE (`PCETRIM12M159SFRBDAL`) as an additional FRED alternative measure — DONE 2026-07-14 (5th alt measure; live on the "How Others Measure It" chart). Ticked 2026-09-10. <!-- added 2026-07-13, done 2026-07-14 --> <!-- from Soon -->
- [x] **[perf]** code-split the xlsx export behind a dynamic import() — DONE 2026-07-16: xlsx now loads on-demand in `downloadWorkbook` via `await import("xlsx")`, emitted as its own chunk (143 kB gzip); main bundle's critical path dropped ~90 kB gzip (258→168). Vite warning persists — remaining bulk is recharts, which is needed on first paint so it stays in the main chunk. <!-- added 2026-05-21, done 2026-07-16 --> <!-- from Soon -->
- [x] **[ops]** bump GitHub Actions off deprecated Node 20 — DONE 2026-07-14: checkout/setup-node v4→v7 (native Node 24 runtime), app build node-version 20→22 LTS; peaceiris@v4 left (not flagged). Deprecation annotation confirmed gone. <!-- added 2026-05-21, done 2026-07-14 --> <!-- from Soon -->
