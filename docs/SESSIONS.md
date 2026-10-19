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

#### Handoff — Calculator Phase 2a (shell + Your costs) merged to local main, NOT pushed

**Goal:** Run `docs/superpowers/plans/2026-09-16-calculator-phase2a-your-costs.md` (9 tasks, subagent-driven) to build the calculator-first Your costs tab and the new shell.

**Done — merged locally into `main` (fast-forward), `main` is 13 commits ahead of origin, nothing pushed, working tree clean.**
- Commits: `e281839` merge forwards lines/basket · `089c4e1` format.js · `92b8466` config + model · `a89593a` panel.js · `6f38206` storage.js · `91fedb0` tokens/controls/font · `65e8cc0` shell, hash routing, old dashboard → `src/views/LegacyDashboard.jsx` · `ea01fa4` Your costs tab · `656534c` final-review fixes (zero lines no longer get dollars, Start over/Undo keyboard focus, no re-fold on tab return, no-data message, Undo can't overwrite newer answers) · `9ffbf5c` plan · 3 backlog commits.
- **Verified by:** `npm test` → 132/132 on merged main (run by controller); `npx vite build` ok; a Python Playwright smoke script (30 checks: Average panel, mortgage answer → guesses/verdict/basis, banned-string scan, renewal prompt focus, save → reload → folded summary, Start over → Undo, section links + Back + unknown hash, desktop sticky layout, no horizontal scroll at 390px, zero console errors) passed on `656534c`; dark scheme computes the dark tokens; reduced motion disables the dock transition. Every task passed its review; the final opus review's two Important findings were fixed and re-reviewed.

**Next (in this order):**
1. **Do not push `main` yet unless you want the redesign live.** Pushing deploys it: Your costs becomes the first screen and the other three sections show the OLD dashboard views (LegacyDashboard) until Phase 2b. The plan intended no merge before 2b; the owner chose to merge locally on 2026-09-16.
2. Fix the parked rounding bug (BACKLOG, tag redesign): `allocateRounded` k<0 can show a +$5–$9 line as −$10 in a household whose total is negative. Repros: `[-300,8,-40]` total −350 → `[-300,-10,-40]`; `[-1069,0,0,5,-11]` total −1100. Fix = take removed steps from negative entries first, then positive entries with ≥ 2 units; mirror for k>0; add repros as tests.
3. Write the Phase 2b plan (National numbers, Price check, Sources, .xlsx export, committed audit script `scripts/audit/ui-audit.py`, link previews + og image), then delete LegacyDashboard. Owner owes the 5-second test before the redesign ships.

**Decisions:** Legacy views serve the three other sections until 2b. Parked (in BACKLOG or accepted): unchecking the last checkbox clears saved amount edits; the live region announces once on load; read-only Average amounts don't sum exactly to $5,750; route-change focus/title, Show-all aria-controls, legacy views in dark mode → 2b. The whole-basket fallback decision is still open.

**Gotchas:**
- The Playwright MCP browser is shared with other sessions ("Browser is already in use"); use Python Playwright (`from playwright.sync_api import sync_playwright`) against `npx vite preview --port 4719 --strictPort` instead.
- There is no local `public/cpi.json`, so preview uses `fallback.json` and logs a cpi.json 404 warning (expected).
- Validating the plan's end state missed an ordering bug (a test scanned `App.jsx` before Task 7 replaced it); and default-amount smoke tests can't catch rounding bugs on $0 or tiny lines — probe with random amounts including 0.

**Resume:**
```bash
cd ~/projects/inflation-reality
git status -sb            # main ahead of origin by 13, clean
npm test                  # expect 132/132
npx vite build && npx vite preview --port 4719 --strictPort   # open /inflation-reality/
```

#### Handoff — Calculator Phase 2a is LIVE (supersedes the "NOT pushed" handoff above)

**Goal:** Run the Phase 2a plan (shell + Your costs calculator), then answer the owner's question about what "Own it outright" does to the number.

**Done — Phase 2a is deployed and verified in production.**
- Merged `redesign/calculator-first` into `main` fast-forward and pushed it (deploy run `35169680134`, green). Branch deleted. Commits `e281839` merge forwards lines/basket · `089c4e1` format.js · `92b8466` config + model · `a89593a` panel.js · `6f38206` storage.js · `91fedb0` tokens/controls/font · `65e8cc0` shell + hash routing + old dashboard → `src/views/LegacyDashboard.jsx` · `ea01fa4` the tab · `656534c` final-review fixes · `2edb70b` handoff.
- Then `337f2d8` (deploy run `35292990025`, green): mortgage and "own it outright" answers now end with "Property taxes are left out because they depend on where you live, and home insurance counts only if you add your renewal increase." The spec's copy table and a scope note were updated in the same commit.
- **Verified by:** `npm test` → 133/133; `npx vite build` ok; the 30-check Python Playwright smoke script run **against the live site** (https://derektm17.github.io/inflation-reality/) passed after both deploys, with zero console errors; both deploys logged `54/54 series live` and `Calculator BLS lines are live.` with no warnings.
- Live behavior today: Your costs is the first screen; National numbers, Price check and Sources still render the OLD dashboard views (LegacyDashboard) until Phase 2b.
- **`main` is 2 commits ahead of origin** (`ea6f2c8`, `de5fff7`), both docs-only, and NOT written by this session — probably a parallel session's ledger tidy. Read them before pushing; pushing redeploys (harmless for docs).

**Next (in this order):**
1. **Fix the rounding sign flip** (BACKLOG, tag redesign). `allocateRounded` in `src/calculator/format.js`: when leftover steps are removed (k < 0) it can take a step from a small positive line whose floor is 0, showing e.g. a +$8 line as −$10. Repros with real totals: `[-300, 8, -40]` total −350 → `[-300, -10, -40]`; `[-1069, 0, 0, 5, -11]` total −1100 → `[-1070, 0, 0, -10, -20]`. Fix: take removed steps from negative-valued eligible entries first (removing can never flip them), then positive entries with at least 2 units; mirror the headroom check on the k > 0 branch; add both repros plus `[104, 7, 12]` (total 100) as tests. Needs a negative household total, so it is rare but real.
2. **Decide the two owner-framing questions the owner raised** (see Decisions): whether to drop the Home insurance line, and how the rate/verdict should read for someone who owns outright.
3. **Write the Phase 2b plan** (National numbers, Price check, Sources, .xlsx export, the committed audit script `scripts/audit/ui-audit.py`, link previews + og image), then delete LegacyDashboard. The owner still owes the 5-second test.

**Decisions:**
- **Property taxes stay out of the calculator** (spec updated 2026-09-17). There is no published national rate; the only honest figure is the person's own bill, and that is homework most people cannot do from memory. The explanation says so instead.
- **Why "Own it outright" raises the percentage:** it removes the $1,650 rent line (rent is up only 2.75%), so the remaining spending leans toward faster risers, mainly gas at +27.4%. With live data and the other three questions guessed: rent 3.48% / $1,550 a year on $3,830 a month; mortgage 2.11% / $1,050 on $4,210; owned 3.92% / $1,050 on $2,310. The dollars fall, the rate rises. **Open:** the national rate includes owners' equivalent rent, which an outright owner does not pay in cash, so "More than the national rate" is an unfair comparison for them. Not yet fixed.
- Phase 2a merged to main and shipped before Phase 2b, at the owner's explicit request (the plan had assumed it would wait).
- Parked from the final review (all in BACKLOG or accepted): unchecking the last checkbox clears saved amount edits; the live region announces once on load; read-only Average amounts don't sum to exactly $5,750; route-change focus/title, "Show all" `aria-controls`, and the legacy views' light styling in dark mode → Phase 2b.

**Gotchas:**
- The Playwright MCP browser is shared with other sessions and often busy ("Browser is already in use"). Use Python Playwright (`from playwright.sync_api import sync_playwright`) instead; it is installed.
- The smoke script is not committed. It lives in the session scratchpad; recreate it from the plan's Task 9 (`docs/superpowers/plans/2026-09-16-calculator-phase2a-your-costs.md`) or point it at the live URL. Phase 2b is supposed to commit the real audit as `scripts/audit/ui-audit.py`.
- There is no local `public/cpi.json`, so `vite preview` logs a cpi.json 404 and falls back to `src/data/fallback.json` (expected).
- Validating a plan only against its end state missed an ordering bug (a test scanned `App.jsx` before Task 7 replaced it), and default-amount browser checks cannot catch rounding bugs on $0 or tiny lines. Probe with random amounts including 0.

**Resume:**
```bash
cd ~/projects/inflation-reality
git status -sb                      # expect main ahead of origin by 2 (docs only), clean
npm test                            # expect 133/133
npx vite build && npx vite preview --port 4719 --strictPort   # then open /inflation-reality/
```

## 2026-10-14

#### Handoff — Phase 2b built and reviewed; owner wants the Bolder color treatment before merge (supersedes all earlier handoffs)

**Goal:** Fix the rounding sign flip, settle the two owner questions, write and run the Phase 2b plan, then merge after the owner's 5-second test. The 5-second test turned into a visual redesign request, which is where things stand.

**Done (all verified):**
- `8ecfa42` rounding fix (`allocateRounded` re-checks sign safety before every step; a seeded 5,000-household property test also caught an adding-side flip). `ef81ff2` owners (mortgage and owned) are compared with "Prices other than housing" (CPI-U all items less shelter, `CUUR0000SA0L2`, catalog `CALC_LINES` entry `exShelter`, `yardstick: true`); renters keep the national rate. Home insurance stays as-is. Both are **LIVE**: pushed `main` at `5adc80d`, deploy run `36939661044` green, `55/55 series live`, live cpi.json has `exShelter` 3.590982, Python Playwright check on the live site showed rent 3.5% vs National 3.4%, owned 3.9% vs "Outside housing" 3.6%, mortgage 2.1% vs 3.6%, zero console errors.
- Phase 2b plan `docs/superpowers/plans/2026-10-01-calculator-phase2b-other-tabs.md`, executed subagent-driven on branch **`redesign/phase2b`** in worktree **`~/projects/inflation-reality-phase2b`** (a worktree because other sessions run ledger commits in the main checkout). 12 tasks + a final-review fix wave, each with a task review; final whole-branch review verdict "ready after fixes", fixes re-reviewed clean. Commits `b2c493a`..`1319b8e`, plus `53c8fd1` (mockups). Branch head on GitHub is `1319b8e` (pushed during the gap by someone else, not by this session; a branch push does not deploy). `53c8fd1` is local only.
- Branch state verified: `npm test` 184/184; `npx vite build` ok; `scripts/audit/ui-audit.py` 0 FAIL (127 checks) against `vite preview`, and it fails on injected faults.
- SDD ledger with every ruling and every deferred minor: `~/projects/inflation-reality-phase2b/.superpowers/sdd/2026-10-01-calculator-phase2b-other-tabs/progress.md` (gitignored; read it before touching the branch).

**Owner's 5-second test result:** the owner felt down about the new tabs. They miss the original's per-good colors, hover details and animation. Three clickable mockups were made (copies committed on the branch in `docs/superpowers/mockups/2026-10-02-color-study-*.html`):
- Your costs panel: https://claude.ai/artifact/JVd3KnL8NVPBN4PFBMwfyP
- National numbers: https://claude.ai/artifact/9EDzFvkHYt6EyXfBuXL1n5
- Spending mix (answers + amounts): https://claude.ai/artifact/K1bqKshUY117QCUU6Em7Ng

**Decisions the owner made (2026-10-02):**
- **Bolder treatment**: color by *kind of spending* (Your costs, Price check) and by *publisher* (National numbers measures); tinted cards and rows, thicker bars, shaded area under the trend line; hover cards on rows, chart crosshair with arrow keys, bars grow in, line draws in, numbers count up; all motion off under prefers-reduced-motion. Color never means good/bad; rises/falls shown by sign and bar side.
- **Quick-start households come back** (Young renter, Family with kids, Commuter, Retiree). This reverses spec revision 2's "no profiles"; record it in the spec.
- **Less scrolling**: compact two-column layout (result beside the spending-mix bar; kinds of spending as two columns of tinted cards; one tight row per amount; questions fold to a one-line summary with "Change answers" after a quick start). Measured to end of amounts, Commuter household: desktop 2,812px -> 1,347px; phone 3,252px -> 2,379px.
- Dollars, not percentage shares, for amounts (no auto-normalizing); the mix bar shows the percentages.

**Validated palette** (dataviz validator: lightness, chroma, color-blind separation, normal-vision floor; amber gets a contrast WARN in light mode, relieved by text labels). Families in this fixed order: Home, Getting around, Food, Utilities, Clothing and fun, Health, Kids and school; Everything else is gray.
- Light (on `#F3F5F4`): `#2F6DB5, #D2602E, #1A9473, #C48A12, #C9638C, #3E7D2E, #5A4AA8`, rest `#87919A`
- Dark (on `#161A1E`): `#4C8BD6, #DE6A35, #2AAA85, #B98312, #CB668F, #5C9A45, #9085E9`, rest `#7A858F`
- Publishers on National numbers: Labor Dept = home blue, Commerce = food green, Cleveland Fed = kids violet, Atlanta Fed = utilities amber, Dallas Fed = fun rose.
- The original's palette FAILED the validator (too dull; plum vs steel blue ΔE 10.4). Don't go back to it.

**Next (in this order):**
1. Re-show the owner the exact message below and get the one open answer: **collapsible family cards on phones, yes or no?**
2. Write spec revision 4 into `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md` (on the branch): visual system (family + publisher colors with the palette above, Bolder treatment, hover and motion rules, reduced motion), quick starts back, compact layout, the phone-collapse answer. Get the owner's review of the written spec.
3. Write a plan for it (writing-plans), execute on `redesign/phase2b` (subagent-driven worked well), re-run tests + audit (the audit's design rules must be updated: it currently enforces one accent / gray bars / at most one raised surface).
4. Owner's 5-second test again, then merge to `main` from `~/projects/inflation-reality` and push **only on the owner's word**, then run the audit with `--base-url https://derektm17.github.io/inflation-reality/`, then Task 13 of the Phase 2b plan (handoff, `ledger ship`, `ledger done` for Phase 2b / route focus / Show all aria-controls / legacy dark mode, `ledger idea` follow-ups).

**Deferred items from the Phase 2b reviews worth folding into the restyle:** uneven y-axis ticks on the trend chart (0/2/5%); fuel `.help` paragraphs run together on Price check; the audit doesn't check the personal state of Your costs in dark/1280, checks banned strings only inside `main`, and has a dead cpi.json console filter. Full list in the SDD ledger.

**Gotchas:**
- Use Python Playwright, not the Playwright MCP (shared browser). Kill preview servers by PID only; a broad `pkill -f "vite preview"` has killed agents' own shells. A stray preview once held port 4720 for days.
- `vite preview` has no `public/cpi.json`, so it falls back to `src/data/fallback.json` (expected).
- Artifact mockups need the page wrapped in `<!doctype html>…<body>` to screenshot locally; they're published without one.

**The exact message to bring back up (owner asked for it verbatim):**

> I updated the spending-mix mockup (same link): **https://claude.ai/artifact/K1bqKshUY117QCUU6Em7Ng**. Open it on **Bolder** and tap a quick start such as **Commuter**.
>
> **How much shorter it is,** measured from the top of the page to the end of the amounts, for the Commuter household:
>
> | Screen | In between | Bolder, compact | Saved |
> |---|---|---|---|
> | Desktop (1280px) | 2,812px | **1,347px** | about half |
> | Phone (390px) | 3,252px | **2,379px** | about a quarter |
>
> **What made the difference:**
> - **Desktop:** the result sits next to the spending mix bar. The kinds of spending fill two columns of tinted cards, like the old grid.
> - **Each amount is one tight row:** name, price change, what it adds a year (for example "+$980/yr"), the dollar box, and a slider just under it.
> - **The questions fold away:** a quick start collapses them to one line ("Rent · Gas car · Heat: electric · …") with a **Change answers** button.
>
> **Phone is still the long one,** since everything has to stack into one column. To shorten it further, I'd make each tinted card collapsible on phones. Each card would show only its name and total, like "Getting around +$930/yr", and you'd tap to open its sliders. That would cut the phone version roughly in half again. The catch is one extra tap to reach a slider. Do you want that?
>
> So far you've decided:
> - The **Bolder** treatment, with the family colors.
> - **Quick-start households come back.**
> - **Less scrolling**, using the compact two-column layout.
>
> Once you've answered the phone question, I'll write these into the spec as a revision covering all three tabs, then plan the work onto this branch before merging. This session has also gotten long. When the spec is approved, I'd write a handoff so a fresh session can build it cheaply.

**Resume:**
```bash
cd ~/projects/inflation-reality-phase2b          # the branch worktree (redesign/phase2b)
git status -sb && git log --oneline -3           # expect clean, head 53c8fd1 (1 ahead of origin: mockups)
npm test                                         # expect 184/184
npx vite build && npx vite preview --port 4730 --strictPort --host   # owner can open http://localhost:4730/inflation-reality/
# main checkout: ~/projects/inflation-reality is clean on main at 5adc80d plus this handoff commit
```

### 2026-10-17

#### Handoff — Spec revision 4 approved and its build plan written (supersedes all earlier handoffs)

**Goal:** Turn the owner's Bolder decisions into an approved spec and a reviewed build plan for `redesign/phase2b`, ready to build in a fresh session.

**Done (all on branch `redesign/phase2b`, worktree `~/projects/inflation-reality-phase2b`; branch NOT pushed; nothing merged or deployed):**
- `478d7ca` added hover detail cards, linked highlights and phone fold-up cards to the spending-mix mockup, published at https://claude.ai/artifact/K1bqKshUY117QCUU6Em7Ng. Checked with Python Playwright at 1280 and 390: zero console errors, no sideways scroll, and at 390 the Commuter page ended at 1,828px with one card open.
- The owner said yes to cards that fold on phones (2026-10-16). They also said the Bolder hover plus the line-chart crosshair "covers" the hover they were missing.
- **Spec revision 4** is in `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md`, section "Revision 4 — Bolder look, quick starts, compact layout". Commits: `1d0f55e` written, `d1b8c63` approved by the owner 2026-10-17 ("this looks good"). A fresh reviewer checked it against the code first. It found 3 blockers, now fixed: Average rows had no family mapping, Average cards were undefined, and `--ink-3` text on tints was too faint. Rendered: https://claude.ai/artifact/HjDnVtGkcictTE8CU6yZ6f
- **Plan** `docs/superpowers/plans/2026-10-17-calculator-rev4-bolder.md` (`9112bad`, 11 tasks, about 5,300 lines). How it was checked:
  - The drafter applied every code block to a scratch copy of `d1b8c63`: 221 tests pass, `vite build` ok, audit 223/223 at a random seed and at `--seed 1`.
  - The audit still fails on an injected fault.
  - An independent reviewer found no blockers and re-ran Tasks 1–3: 206 tests, matching the plan.
  - The review's fixes were applied and re-validated.
  - The plan also added a "Plan decisions (2026-10-17)" note to the spec.
  - Rendered: https://claude.ai/artifact/QqPg3sH9xYW6h3very4keQ
- The branch itself is unchanged apart from docs and mockups: 184/184 tests (run 2026-10-14 this session).

**Next:**
1. The owner reviews the plan and picks an execution method. Recommend **subagent-driven**: 11 tasks with heavy interface coupling across tasks (`cards.js`, `useHover` and the CSS classes the audit selects). Phase 2b ran subagent-driven successfully.
2. Execute on `redesign/phase2b` in the worktree (superpowers:subagent-driven-development). Task 11 includes an audit run with `--real-fonts`, which needs network access to Google Fonts. The page-height limits (≤ 1,500px at 1280, ≤ 2,000px at 390, Commuter household) must pass with real fonts before the 5-second test. With fallback fonts the plan measured 1,423 and 1,793.
3. The owner runs the 5-second test again. Merge to `main` from `~/projects/inflation-reality` and push only on the owner's word, then run the audit with `--base-url https://derektm17.github.io/inflation-reality/`, then the ledger steps in Task 11.

**Decisions (don't re-litigate):**
- Bolder look, quick starts back, compact layout, cards fold on phones under 600px, hover cards. The "Where the extra money goes" list, Show all and the phone dock are removed. The family cards and the sticky result strip replace them.
- A quick start counts all four answers as answered. It shows a "Filled in as {household}. [Undo]" toast and never shows a selected state.
- Average-state hover wording stays neutral ("Share of spending"), for the "Is that number yours?" test.
- Measure blurbs show as visible text under each row on phones, and in the hover card at 600px and wider.
- Big-number text stays `--ink`; color goes on the marks only.
- A card whose target has focus stays open when the page scrolls. This deviates from the spec on purpose, because Tab scrolls the page.
- Recharts is pinned to exactly 2.15.4. The trend chart starts on the latest month through the internal `accessibilityManager.setIndex()`. The arrow-key audit check would catch it if that breaks.

**Gotchas:**
- Use Python Playwright, never the Playwright MCP (it's a shared browser). Kill preview servers by PID only.
- `vite preview` falls back to `src/data/fallback.json`.
- Chrome re-sends pointer events after a scroll, so park the mouse in the margin before running focus checks.
- The main checkout gets ledger commits from other sessions. Build only in the worktree.

**Resume:**
```bash
cd ~/projects/inflation-reality-phase2b
git status -sb && git log --oneline -3   # expect clean, head 9112bad, ahead of origin
npm test                                 # expect 184/184 before Task 1
# then: superpowers:subagent-driven-development on docs/superpowers/plans/2026-10-17-calculator-rev4-bolder.md
```

### 2026-10-18

#### Handoff — Revision 4 built, reviewed and verified on `redesign/phase2b`; waiting on the owner's 5-second test (supersedes all earlier handoffs)

**Goal:** Build the approved revision 4 plan (`docs/superpowers/plans/2026-10-17-calculator-rev4-bolder.md`, Tasks 1–10, plus Task 11's controller checks) subagent-driven in the worktree.

**Done (branch `redesign/phase2b`, worktree `~/projects/inflation-reality-phase2b`; NOT pushed, NOT merged, nothing deployed):**
- Tasks 1–10, one commit each, `9ffcde9` … `94fc255`. Each was built by a fresh implementer and passed a task review (spec and quality) with no open Critical or Important findings.
- A final whole-branch review (Opus) said "with fixes": 0 critical, 3 important, 12 minor. One fix wave followed (`120ba15`, `252014d`, `33f62ed`), and a scoped re-review found all 10 targeted findings fixed with nothing broken. What the wave fixed:
  - The trend-chart card now closes on Escape and when focus leaves the chart, and the audit checks both.
  - The audit's reduced-motion "bars full width on first paint" check reloads the page and fails when it finds no bars. It was proved to fail when the reduced-motion rule is removed.
  - The dark-mode light-background check now exempts only the marks.
  - Hover: an Escape-closed card stays closed, a keyboard-opened card comes back after the mouse passes over another target, and hint text is read once.
  - The renewal box gets `aria-describedby`; focusable rows get names.
  - Undo after a quick start restores the returning lede.
  - The slider has hover and pressed states.
- Verified at the branch tip `33f62ed` (2026-10-18, by the controller):
  - `npm test`: tests 221, pass 221, fail 0.
  - `vite build` ok.
  - No literal colors; the dark token blocks are identical.
  - The audit with the fixture passed at seed 236974 and at `--seed 1`.
  - The audit with `--real-fonts` passed, and Libre Franklin 400/800 was confirmed loaded.
  - Page heights with Commuter: 1,423px at 1280 (limit 1,500) and 1,793px at 390 with every card folded (limit 2,000). They are the same as with fallback fonts because fixed control heights dominate.
  - The fault injection (a `.fam` border) makes the audit exit 1.
- Screenshots for the spec walk-through and the 5-second test (20 of them: 390/1280 × light/dark × Average, Commuter and three tabs) are at `/tmp/ir-rev4-*.png`. The phone first screen is `/tmp/ir-rev4-390-light-first-screen.png`. I checked the phone first screen by eye. The other 19 have NOT been compared against the mockups yet. `/tmp` may be wiped; Task 11 Step 3 has the script to regenerate them.

**Next:**
1. The owner runs the 5-second test (Task 11 Step 4): 5 non-designers see the first phone screen and are asked "What does this page do?" and "Is that number yours?". Pass is at least 4 of 5 answering both correctly. Use the first-screen image above, or serve the preview to the LAN with `--host 0.0.0.0`; the command is in Task 11 Step 4. Record the result here. Do not merge without it.
2. Optional before the test: compare the 20 screenshots with the Bolder mockups (`docs/superpowers/mockups/2026-10-02-color-study-*.html`, `data-v="c"`) and list any differences that aren't spec-wins cases as owner questions.
3. On the owner's word only: merge per Task 11 Step 5 (read `git log redesign/phase2b..main` first; `main` has new docs and ledger commits, so expect a merge commit, not a fast-forward). Then push, run the audit against `https://derektm17.github.io/inflation-reality/` with and without `--live-data` (Step 6), and run the ledger steps (Step 7): `ledger ship`, then `ledger done` for the "owner's 5-second test" and "Phase 2b: rebuild National numbers" items. Add one `ledger idea` per plan open question the owner leaves unsettled. `ledger ship` was deliberately NOT run yet, because nothing is live.

**Decisions this session (controller rulings; each lists its cost if wrong):**
- The changed-row flash tints the row's background at 13% (`color-mix(... var(--c) 13% ...)`), not the text color. This satisfies both the spec's "flashes its family color" and "family colors are for marks only". Cost if wrong: a softer flash, one keyframe to change.
- `.line-note` was re-added to `tabs.css`. Task 5's rewrite of `calculator.css` had dropped its only definition while Price check still uses it.
- A mouse click pins a hover card (Escape or a click elsewhere unpins it). Cost: if unwanted, gate the pin to touch only.
- Plan-mandated duplication was left in place: `useReducedMotion` is re-implemented in YourCosts, `MINUS` is declared twice, and `"around"` is hard-coded in `sources.js`. Cost: a small cleanup.
- Measure and price-change list rows got `aria-labelledby` but not `role="group"`, because that role on an `li` breaks list semantics.
- Parked (real, not blocking):
  - Crossing 600px while focus is inside a card folds it and drops focus. This is rare and happens on rotation.
  - `.lg.hl` bold text makes the legend reflow.
  - Very small shares can draw slices 1px wide or less.
  - The end label can clip at about −10.5%.
  - The audit's `lum()` misreads Chrome `color(srgb …)` values, so a pale tint in dark mode can't fail the light-background check.
  - The useHover `dismissed` key clears only on pointer leave.
- For the owner (spec choices the final reviewer declined to judge):
  - Hover cards close on pointer leave, so they aren't hoverable (WCAG 1.4.13).
  - Dimmed rows, legend items and slices sit below contrast while another is highlighted.
  - The sticky phone strip takes a big share of the screen while the on-screen keyboard is up.
  - Decision 9 adds many tab stops.

**Gotchas:**
- The preview procedure's `echo $! > /tmp/ir-preview.pid` after `setsid … &` often records the wrong PID (setsid forks). Get the real listener from `ss -ltnp | grep 4719` and kill that PID only.
- Use Python Playwright, never the Playwright MCP.
- The main checkout gets ledger and doc commits from other sessions. Build only in the worktree.

**Resume:**
```bash
cd ~/projects/inflation-reality-phase2b
git status -sb && git log --oneline -1     # expect clean, head 33f62ed, ahead of origin
npm test 2>&1 | grep -E "^ℹ (pass|fail)"  # expect pass 221, fail 0
# preview: npm run build && setsid node node_modules/vite/bin/vite.js preview --port 4719 --strictPort </dev/null >/tmp/ir-preview.log 2>&1 & disown; ss -ltnp | grep 4719
# then: Task 11 Step 4 (owner's 5-second test) → Step 5 merge only on the owner's word
```
