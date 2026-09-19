# Inflation Reality — Done

Finished backlog items, moved here by `ledger done` and `ledger tidy`. Newest first.

## 2026-09-18

- [x] **[feat]** surface `stale` flags in the UI when a series falls back — DONE 2026-09-10: `staleLabels()` + `StaleNote` under every section that shows fallback-able figures. Plain text for now; restyle in the redesign. <!-- added 2026-07-10, promoted 2026-09-01, done 2026-09-10 --> <!-- from Now -->
- [x] **[bug]** `fetch-fred.mjs` should fail the build when a *macro* series (headline/core) falls back — DONE 2026-09-10: `staleMacroKeys()` fatals before cpi.json is written. Paired with `yoyAnchorDate()` so the missing October 2025 doesn't trip it in November 2026. <!-- added 2026-09-01, done 2026-09-10 --> <!-- from Now -->
- [x] **[ops]** register a free BLS Public Data API key and add it as a GitHub Actions secret — DONE 2026-09-14: `BLS_API_KEY` set (confirmed via `gh secret list`). BLS keys must be renewed at least yearly; renew by 2027-09-14. <!-- added 2026-09-10, done 2026-09-14 --> <!-- from Now -->
- [x] **[feat]** add Dallas Trimmed-Mean PCE (`PCETRIM12M159SFRBDAL`) as an additional FRED alternative measure — DONE 2026-07-14 (5th alt measure; live on the "How Others Measure It" chart). Ticked 2026-09-10. <!-- added 2026-07-13, done 2026-07-14 --> <!-- from Soon -->
- [x] **[perf]** code-split the xlsx export behind a dynamic import() — DONE 2026-07-16: xlsx now loads on-demand in `downloadWorkbook` via `await import("xlsx")`, emitted as its own chunk (143 kB gzip); main bundle's critical path dropped ~90 kB gzip (258→168). Vite warning persists — remaining bulk is recharts, which is needed on first paint so it stays in the main chunk. <!-- added 2026-05-21, done 2026-07-16 --> <!-- from Soon -->
- [x] **[ops]** bump GitHub Actions off deprecated Node 20 — DONE 2026-07-14: checkout/setup-node v4→v7 (native Node 24 runtime), app build node-version 20→22 LTS; peaceiris@v4 left (not flagged). Deprecation annotation confirmed gone. <!-- added 2026-05-21, done 2026-07-14 --> <!-- from Soon -->
