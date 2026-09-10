# inflation-reality — Sessions

Resumable handoffs, newest at the bottom. Read the most recent `#### Handoff` first.

## 2026-09-10

#### Handoff — Feedback triage, data-integrity fixes, calculator-first redesign spec

**Goal:** Act on outside feedback on the live dashboard ("what is it trying to tell me?", "looks very AI-coded", buttons don't look like buttons, compare other countries): fix the known data-integrity bugs first, then design a calculator-first redesign.

**Done — shipped to `main`, deployed, verified:**
- `c0b775a` build guard: `staleMacroKeys()` (assemble.mjs) makes `fetch-fred.mjs` exit 1 before writing cpi.json if headline or core fell back.
- `7a9944d` `staleLabels()` (merge.js) + `StaleNote` under every section that can show a fallback value.
- `d87a89c` + `30a0fa5` the personal line on the 12-Month Trend was fabricated (`Math.random()` on past points); now headline line + one real "You (latest month)" dot, unclipped.
- `219ad2e` `yoyAnchorDate()` (compute.mjs): BLS never published October 2025, so the October 2026 release (~Nov 12) can't produce any YoY. The pipeline steps back ≤2 months to the newest computable month, pins CPI series to it **only when a gap exists**, writes `payload.yoyGap`, and the page explains "Why September?".
- Docs: 3 CHANGELOG entries (`b748d71`, `63b96c9`, `5e09d8b`); BACKLOG ticked + new items.
- **Verification:** `npm test` 46/46 pass; `npm run build` OK; deploy runs 34510548112 and 34511079376 green with CI log "42/42 series live"; live `cpi.json` 0 stale nodes, headline 3.4 / core 2.5, reference 2026-07. Stale notes checked in dev with injected `stale` flags; the gap note checked in dev with an injected `yoyGap` (page text read via Playwright). The November gap itself has not happened yet — only simulated.
- **Spec** `73af1c3`: `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md`. Mockup (clickable, approved): https://claude.ai/code/artifact/46d43157-14b7-48b3-be56-47cae54d2785 (v2), committed copy `docs/superpowers/mockups/2026-09-10-layout-c.html`.

**Next:**
1. **User reviews the spec** — not reviewed yet. Apply any changes, re-run the spec self-review (placeholders / contradictions / scope / ambiguity).
2. On approval, invoke `superpowers:writing-plans` on the spec. **Phase 1 = pipeline** (BLS source, `lines`, `basket`, residual) ships to `main`; Phase 2 = front end on branch `redesign/calculator-first`. Plan Task 1 is the "Verify in plan Task 1" list at the bottom of the spec (series ids, relative-importance weights, CE spending figure, KFF premium default).
3. **User task:** register a free BLS API key (bls.gov/developers) and add GitHub secret `BLS_API_KEY`. Phase 2 does not merge without it.
4. **Calendar check ~Nov 13, 2026:** the scheduled build log should print `Note: October 2026 has no year-ago figure (October 2025 was never published), so CPI figures are for September 2026.` and the site should show September with the note.

**Decisions (full table in the spec — don't re-litigate):**
- Audience: regular people on phones. Layout **C**: household choices first, live receipt result right below, dollar amounts after; pinned result bar on phones.
- Inputs are **monthly dollars** with profiles as starting points, not % sliders. Household choices: housing (rent / fixed-rate mortgage = 0% / own outright), car (gas / hybrid / EV / none), commute, heating (electric / gas / oil), daycare, college tuition, health insurance.
- **Health insurance uses the person's renewal-notice increase**, never the CPI health insurance index (retained-earnings method; +28% YoY Sep 2022 then steep falls — BLS MLR 2024).
- Opens as **"A typical U.S. household"** (skip = default); first tap personalizes; answers saved in localStorage only; returning visitors see a folded summary + Change / Start over.
- Visual identity from the mockup (paper/ink, shelf-tag yellow on the total only, Big Shoulders Display + Public Sans + Martian Mono, tactile buttons, light + dark).
- International comparison = separate spec after this one. No personal history line, no share links.
- Step-1 decisions: only headline/core are fatal; categories/prices/alt measures may degrade with a note. The `yoyGap` anchor leaves alt measures and EIA fuel on their own dates.

**Gotchas:**
- **Basket coverage:** the live site's 10 categories cover ~79% of the CPI basket, so its default "BLS weights" profile shows 3.9% vs the 3.4% headline (tells an average household it's 0.5 above average). The spec fixes it with a derived "Everything else" residual.
- **7 redesign series are NOT on FRED** (BLS API only): `CUUR0000SETE` car insurance, `SEEB03` daycare, `SEEB01` tuition, `SEHE01` fuel oil, `SETG02` intracity transit, `SEME` health insurance, `SETB02` other motor fuels. `SETG01` is *airline fares*. Household repair indexes (`SEHP*`) stopped after Oct 2024.
- Keyless BLS API = 25 requests/day per IP (today's quota was used up by research).
- October 2025 is `"-"` in every BLS CPI series.
- Playwright MCP blocks `file://` — serve with `python3 -m http.server <port> --directory …`; it can only write under `/home/dynomatic`. It's one shared browser.
- `pkill -f "vite --port 5185"` matches its own shell and exits 144; use a bracketed pattern: `pkill -f "[v]ite --port 5185"`.
- Full-page screenshots cost ~130k tokens of context; prefer element screenshots or reading `document.body.innerText`.
- Locally `public/` is empty and untracked, so dev falls back to the bundled March 2026 `fallback.json` unless you drop a `cpi.json` in (the live one: `curl https://derektm17.github.io/inflation-reality/cpi.json`). Delete it afterwards.

**Resume:**
```bash
cd ~/projects/inflation-reality && git pull && npm install && npm test   # expect 46 pass
# read docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md
python3 -m http.server 5190 --bind 127.0.0.1 --directory docs/superpowers/mockups   # mockup at :5190/2026-09-10-layout-c.html
```
