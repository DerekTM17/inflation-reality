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

## 2026-09-14

#### Handoff — Critical review of the redesign spec; toned-down mockup for comparison

**Goal:** Stress-test the 2026-09-10 spec and mockup for "does this look AI-made?" and UX problems, and build a toned-down alternative the user can compare before the spec is updated.

**Done:**
- Independent review by a fresh subagent (no session memory) that screenshotted the receipt mockup at 390×844 and 1280×900, light and dark, including the returning state (Python Playwright; temp screenshots in `/tmp/claude-1000/review/`, may be gone). Verdict: structure right; the receipt costume (torn edge, dashed cuts, mono caps, yellow highlighter, offset-shadow buttons, 3 typefaces) reads as current AI-generator house style; one tap turns guesses into "Your year, repriced" with exact dollars; the average household's number is easily mistaken for the visitor's own.
- **Toned-down mockup published:** https://claude.ai/code/artifact/a59d8dd0-a0af-4f74-bec8-08e2d2ba04ed — committed copy `docs/superpowers/mockups/2026-09-14-layout-c-plain.html`. Original receipt mockup still at https://claude.ai/code/artifact/46d43157-14b7-48b3-be56-47cae54d2785.
  - Design: one family (Libre Franklin), cool gray ground `#F3F5F4`, slate ink `#1F2933`, one accent banknote green `#2E5E45` (selection, "you", focus); the answer as a large sentence ("About $1,450 more a year"); flat bordered buttons, filled + ✓ when chosen, dashed + "our guess" when guessed; no profiles row; daycare/tuition as "Also paying for" checkboxes; amounts collapsed; rounding lines to $10 and total to $50 with largest-remainder so the lines add up to the total; Undo toast on Start over; persistent `aria-live` region.
  - Verified: one desktop screenshot before publishing showed the lines summing to $2,390 against "About $2,350"; fixed with the allocation above. **The post-fix version was not re-viewed**, and the phone layout and dark mode were not looked at.
- BLS key steps verified on bls.gov: register at https://data.bls.gov/registrationEngine/ (organization, email, CAPTCHA, terms), key arrives from labstat@bls.gov; v2 = 500 queries/day, 50 series and 20 years per query; **keys must be renewed at least yearly** (BACKLOG item added).

**Next:**
1. **User compares the two mockups** and decides: (a) visual direction, receipt vs toned-down (recommended: toned-down); (b) drop the profiles row (recommended; the toned-down mockup already drops it).
2. **Update the spec in one pass** with that decision plus the accepted findings below, re-run the spec self-review, get user approval, then `superpowers:writing-plans`.
3. User task still open: BLS API key → GitHub secret `BLS_API_KEY`.

**Accepted review findings to fold into the spec:**
- Trust: guessed answers styled as guesses + "Based on N answers and N guesses"; health **and home insurance** use the renewal-notice increase, default labeled "National estimate, change to yours"; home repairs labeled "Estimate"; nothing pre-selected on first load; phone dock says "Average U.S. household" until the first answer; "Everything else" always last, gray, "Estimated from the national rate", with a test bounding its rate (not just its weight); say "average", not "typical" (it's a mean).
- Numbers: lines to $10, total to $50 with "About", allocated so lines sum to the total.
- First screen: 4 questions (home, getting around, heating, health) + "Also paying for" checkboxes; commute becomes a hint on the gas amount; amounts collapsed behind "Adjust monthly amounts".
- Copy: headline "How much more are you paying than a year ago?"; result title "Your costs vs. July 2025"; buttons "Change answers" / "Answer the questions"; returning lede "Updated with July 2026 prices."; verdict e.g. "Less than the national rate, mainly because your mortgage payment didn't change."; tab "National numbers" (not "The bigger picture"); explainers as plain sentences without bold lead-ins; no middle-dot separators; no em dashes in site copy.
- Accessibility: contrast (no yellow on light, focus ring in the accent), persistent live region, `scroll-padding-bottom` for the dock, tabs wrap at 390px, Undo for Start over, neutral bars instead of red.
- Spec gaps to add: voice guide with banned patterns; testable not-AI criteria (≤2 type families, no monospace, no letter-spaced caps labels, no decorative metaphor, no middle-dot meta strings, no → on links); a 5-second test with 5 non-designers on phones (user runs it); number-formatting rules; visual rules for the other tabs and charts; loading/stale visuals and font-fallback behavior; link-preview image, title and description; loud CI warning when the BLS key fails or expires.
- **Rejected:** "one type family" as a hard rule (write "max two, no mono"); testing the site name is out of scope.

**Gotchas:**
- The user's design-quality memo ("Designed, Not Generated" artifact) lists tells beyond the obvious: cream + serif + terracotta, near-black + acid green, broadsheet hairline layouts, SaaS card kits, tracked-out caps eyebrows, `A · B · C` meta strings, `WORD — fragment` labels, mono data labels, `→` on buttons.
- U.S. Web Design System blue + Public Sans would make the site look like an official .gov page, which is a credibility and impersonation risk for an independent site. Avoided.

**Resume:**
```bash
cd ~/projects/inflation-reality && git pull && npm install && npm test   # expect 46 pass
# Open both mockup artifact links above; then edit docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md
```

#### Handoff — Spec revised: toned-down direction, profiles dropped, BLS key set

**Done:** The user picked the **toned-down** mockup and **dropped the profiles row**, and added the BLS key (`gh secret list` shows `BLS_API_KEY` set 2026-09-14T19:13Z). The spec `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md` was rewritten in one pass with those decisions and every accepted finding above. It gained new sections: Visual system (tokens), Design rules (testable not-AI criteria, including an automated Playwright audit and a 5-second test), Voice guide with key strings, Numbers (rounding with largest-remainder allocation), chart rules, link-preview meta, residual plausibility bound (3 points), and BLS key-expiry warnings. The spec self-review found and fixed three places where the spec broke its own rules (`·` strings in the dock column and tabs row, a muddled link-preview bullet).

**Next:**
1. **User reviews the revised spec.** Not yet reviewed.
2. On approval, invoke `superpowers:writing-plans`. Phase 1 (pipeline) first; its Task 1 is the spec's "Verify in plan Task 1" list, and the BLS key is now available for those checks.
3. BLS key renewal due by 2027-09-14.

#### Handoff — Spec revision 3 and the Phase 1 plan

**Done:** A second independent review (technical + UX) found the average-household basket underspecified and its residual about 0.7 points off (December relative-importance weights must be rolled forward to the reference month), a BLS parsing trap (a null value becomes a real zero through `parseObservations`), lines not actually anchored to the reference month outside a `yoyGap`, unspecified negative rates, a missing fallback for new lines, and an undefined verdict rule. Nearly everything was accepted and folded into the spec (revision 3). Verified directly on bls.gov: December 2025 relative importance (Physicians' services 1.684, Prescription drugs 0.973, basket values match) and CE 2024 ($78,535 − $9,797 = $68,738 a year → $5,750 a month). Wrote `docs/superpowers/plans/2026-09-14-calculator-phase1-pipeline.md` (6 tasks: catalog manifest, BLS parser, weight math, assemble lines/basket, fetch + CI gate + push/verify, fallback refresh + docs).

**Not accepted from the review:** a user-facing note for the 3-point residual gap (warning only, per the review's own "consider"); timestamps on saved renewal rates.

**Next:** The user chooses how to run the Phase 1 plan: subagent-driven (recommended) or inline. Task 5 pushes to `main` (invisible to the UI) and must be verified against production before Task 6. After Phase 1: write the Phase 2a plan (shell + Your costs).

## 2026-09-16

#### Handoff — Calculator Phase 1 (data pipeline) shipped and verified in production

**Goal:** Run `docs/superpowers/plans/2026-09-14-calculator-phase1-pipeline.md` (6 tasks, subagent-driven, a review after every task plus a whole-branch review) so `public/cpi.json` carries a 12-month rate for every calculator line and an average-household basket, with no visible change to the live site.

**Done — all 6 tasks, deployed twice, `main` at `c72685a` in sync with origin, nothing uncommitted.**
- Commits: `a0ddd8e` catalog manifest · `a837111` BLS parser · `ee43ea1` weight math · `e0a4da7` null guards (riDec, headlinePct) · `4b4e0e5` assemble lines/basket · `e51697d` BLS fetch + fallback + post-deploy gate · `822b0fd` changelog · `b97cbd9` backlog · `034847c` fallback refresh · `0126b5c` drop a test assertion that ran no code · `9c7c196` `ef5e2af` `f192c23` `c72685a` final-review fixes.
- **Verified by:** `npm test` → 71/71 pass (run directly, not just reported by a subagent). Deploy runs `35116045213` and `35137212694` both succeeded, including the new `Check calculator BLS lines are live` step; log: `54/54 series live (FRED + BLS)`, `Calculator BLS lines are live.`, zero `::warning`/`::error`. Live `cpi.json` after the second deploy: `generatedAt` 2026-09-16T18:53:54Z, `referenceMonth` 2026-08, 16 lines with no null rate, 0 stale nodes, no basket rate exactly 0; basket `restWeight` 28.137887, `residualYoy` 2.014252, `headlineYoy` 3.396548 (gap 1.38 points, tolerance 3). Numbers identical across both deploys — the final fixes changed no published value.
- Live line rates (yoy %): rent 2.75, upkeep 1.98, groceries 2.19, dining 3.37, gasoline 27.40, carIns −5.13, carUpkeep 5.24, transit −3.70, electric 3.79, heatGas 4.39, heatOil 52.04, daycare 3.99, tuition 2.82, clothing 3.61, fun 2.68, doctor 0.19.
- `src/data/fallback.json` is now a copy of that live payload (was the March 2026 seed with no `lines`/`basket`), so a build that loses both BLS and the deployed payload still degrades to August 2026 values marked stale.
- **The UI does not read any of it yet.** `buildViewData` in `src/data/merge.js` returns a fixed 11-key object with no `lines` and no `basket`. Wiring them through is Phase 2's job.

**Next:** Write the Phase 2a implementation plan (the page shell + the "Your costs" section) from `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md`, using `superpowers:writing-plans`. Phase 2 goes on a branch (the earlier split: Phase 1 on `main`, Phase 2 front end on a branch). Its first task should extend `merge.js` to forward `lines` and `basket`, with tests against `buildViewData`'s output (not the raw fixture).

**Decisions (made during execution; don't re-open without a reason):**
- **Only the user pushes.** The plan had Task 6 push twice; every push to `main` deploys, so subagents only commit locally.
- **One missing basket series still stales the whole basket** (`rolledWeights` is all-or-nothing, while each calculator line fails on its own). The final review suggested dropping the missing series and redistributing its weight into "Everything else". Not done: that silently changes what the visible items and "Everything else" mean. It's a spec decision for Phase 2. Instead the stale-basket warning now names the unreadable series.
- **`yoyAt` and `computeYoY` stay separate copies**, with comments pointing at each other. `computeYoY` feeds the already-live category figures; merging them risked changing live numbers. A change to the year-ago lookup rule must be made in both.
- `loadDeployedPayload` now warns on each failure path (HTTP error, fetch/parse failure, unrecognized shape) instead of failing silently. The plan asked for silence; overridden.
- Two ledger-tool commits (`822b0fd`, `b97cbd9`) lack the `Co-Authored-By` line. Left as-is rather than rewrite history.

**Gotchas:**
- **`null >= 0` is `true` in JavaScript.** It nearly reintroduced the missing-data-becomes-zero bug twice: once in a reviewer's suggested guard, once in a fix-wave draft. Use `x != null && x >= 0`.
- `round6(null)` used to return `0`, and it WAS reachable: a basket component with a valid weight but no year-ago reading published `0.000000%`. Fixed in `9c7c196`; `round6` now returns `null`.
- For Phase 2, not discoverable from `merge.js`:
  - `categories.gas` and `lines.gasoline` use the same series but different month-anchoring, so they can disagree by a month.
  - A stale `basket` can be a bare `{stale: true}` with no `month`/`weights`/`rates`; guard for missing fields.
  - `lines[id].yoy` is stored to 6 decimals; the page must round.
  - A stale value carries no age; only the post-deploy gate (`scripts/check-lines.mjs`) bounds how long one persists.
- The BLS key (`BLS_API_KEY` secret) expires yearly; renew by 2027-09-14. When it lapses the site still deploys with last-known values and the run goes red.
- `gh run view <id> --log | grep -E "::warning|::error|series live|Calculator BLS lines"` is the fastest way to read a deploy.
- Gasoline +27.4% and heating oil +52.0% are large and were not checked against a second source.

**Resume:**
```bash
cd ~/projects/inflation-reality
git pull && npm ci && npm test          # expect 71/71
gh run list --workflow="Deploy to GitHub Pages" --limit 3
curl -s https://derektm17.github.io/inflation-reality/cpi.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s);console.log(p.referenceMonth,Object.keys(p.lines).length,"lines",p.basket.residualYoy)})'
```
