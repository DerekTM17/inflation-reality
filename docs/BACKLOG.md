# inflation-reality — Backlog

Open work organized by horizon (Now / Soon / Someday) with `[tag]` for
domain. Markdown checkboxes; edit by hand. Shipped items go to
`CHANGELOG.md`, not here.

## Now

Items we're actively working on or planning to do imminently.

## Soon

Items we want to tackle in the near term but aren't started yet.
- [ ] **[perf]** code-split the xlsx export behind a dynamic import() — bundle is 851kB / 258kB gzip, tripping Vite's 500kB chunk warning; xlsx is only needed on Excel export <!-- added 2026-05-21 -->
- [ ] **[ops]** bump GitHub Actions to Node 24 / newer action majors — checkout@v4, setup-node@v4, peaceiris@v4 flagged Node 20 deprecation (forced June 2 2026, removed Sept 16 2026) <!-- added 2026-05-21 -->

## Someday

Latent items captured for future-when-they-bite. Not blocking anything now.

<!-- Suggested tags: bug, feat, perf, tech-debt, docs, ops, security, strategic. Use whatever fits. -->
- [ ] **[feat]** refresh CPI-U data — values are hardcoded as of BLS March 2026; consider a script or BLS/FRED API pull instead of manual edits <!-- added 2026-05-21 -->
