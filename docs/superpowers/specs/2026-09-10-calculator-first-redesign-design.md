# Calculator-First Redesign — Design

**Date:** 2026-09-10
**Project:** inflation-reality
**Status:** Direction approved (layout C + visual identity, via clickable mockup). Spec pending user review, then implementation plan.
**Mockup:** https://claude.ai/code/artifact/46d43157-14b7-48b3-be56-47cae54d2785 (v2) — committed copy at `docs/superpowers/mockups/2026-09-10-layout-c.html`. Placeholder rates marked ◦ in the mockup are mockup-only; none ship.

## Problem

Outside feedback on the live dashboard, in two parts:

1. **"What is the goal of the dashboard, what is it trying to tell me?"** The page's point — inflation is different for every household depending on what it spends money on — is buried. "Your Inflation" is one tile of three, and the sliders that produce it are the 5th of 6 sections, below three charts. A visitor sees "your" number before doing anything to make it theirs.
2. **"This comes across as very AI coded."** Tiny spaced-out monospace caps labels on every card, a row of identical stat tiles, cards everywhere, emoji as icons, left-border callouts, a pill badge with a green dot, a gradient download card. And **buttons don't look like buttons**: only the export button has a hover state; tabs and presets have no pressed, selected or focus states and no `aria-pressed` / `aria-selected`.

Also raised and accepted: compare U.S. inflation with other countries — **a separate spec** after this one lands.

**Goal of the redesign, in one sentence:** show people that inflation hits each household differently, and make it obvious — in dollars — how it hits *them*.

## Decisions made in brainstorming (2026-09-10)

| Question | Decision |
|---|---|
| Audience | Regular people arriving from a shared link, **mostly on a phone** |
| How people describe their spending | **Monthly dollar amounts**, pre-filled from one-tap profiles; not percentage sliders |
| Household choices | Housing (rent / fixed-rate mortgage / own outright), getting around (gas / hybrid / EV / no car), commute (yes / no), home heating (electric / natural gas / heating oil), kids in daycare, paying college tuition, health insurance (through work / buy my own / no premium) |
| Health insurance rate | **The increase on the person's own renewal notice.** The CPI health insurance index measures insurer retained earnings, not premiums, lags ~1 year, and swung to +28% YoY (Sep 2022) then fell steeply through Sep 2023 (BLS *Monthly Labor Review*, 2024) — never used as a premium proxy |
| Layout | **C: choices first, live result immediately below**, dollar amounts after; pinned result bar on phones; receipt sticky beside the choices on desktop |
| Result format | A **receipt** — "Your year, repriced": one line per spending item with its 12-month change and extra dollars a year, a highlighted yearly total, you-vs-U.S. bars, one plain sentence explaining why |
| Skipping | Page opens as **"A typical U.S. household"** (national spending mix); first tap turns it into "Your year, repriced". A "Skip the questions" link goes to The bigger picture |
| Changing answers | Nothing locks; everything updates live. "Change my answers" on the receipt and "Edit" on the pinned bar jump back to the choices |
| Remembering | Answers saved **in the browser only** (localStorage), never sent anywhere. Returning visitors get "Welcome back", answers folded into a one-line summary, their receipt with the latest month. "Start over" clears it |
| Other content | Moves behind the calculator: **The bigger picture** (headline/core, month-over-month, 12-month trend, How Others Measure It), **Price check** (restyled), **Sources** (method, sources, series IDs, download). The 17-term glossary wall becomes short explanations beside the thing they explain |
| Visual identity | As mockup: paper `#F2F3EF`, ink `#17191E`, shelf-tag yellow `#F5C542` only behind the total, price-up red `#B3261E`; Big Shoulders Display (signage), Public Sans (the U.S. government's typeface), Martian Mono (receipt lines); tactile buttons; light + dark themes |

## Success criteria

- A first-time phone visitor sees a dollar result (typical household) without doing anything, and their own result after one tap.
- **The typical household reproduces the published headline 12-month change exactly** (to the displayed 0.1), using live data. (Today's "BLS default" profile shows 3.9% vs a 3.4% headline because the 10 categories cover only ~79% of the basket — the live page tells an average household it is 0.5 points above average.)
- **Every rate on the page is a live published series, a definition (fixed mortgage = 0%), a clearly derived value, or a number the person typed.** No placeholder rates ship.
- Every interactive control looks interactive and shows hover, pressed, selected and keyboard-focus states; selection is never shown by color alone.
- A returning visitor sees their receipt with the newest month without re-entering anything.
- The stale-value notes and the `yoyGap` note (shipped 2026-09-10) keep working in the new UI.
- Works and reads well at 390px and 1280px, in light and dark.

## The "Your inflation" tab

### States

| State | When | Receipt title | Choices area |
|---|---|---|---|
| **Typical** | First visit; after "Start over"; "Typical U.S. household" profile | "A typical U.S. household" | All options unselected; profiles shown |
| **Personal** | After any answer or profile | "Your year, repriced" | Options show selection; explainers under relevant answers |
| **Returning** | Page load with saved personal answers | "Your year, repriced" | Folded into a summary line ("Rent · Gas car · Commutes · Gas heat · Insurance through work · About $3,960 a month") with **Change my answers** and **Start over** |

First tap from Typical fills the other groups with common answers (`rent, gas car, commute, natural gas, no daycare, no tuition, insurance through work`) and says so: *"We filled in the rest with common answers. Change any that don't fit."* The page never auto-folds while someone is tapping; folding only happens on load for a returning visitor.

### Order

- **Phone (one column):** intro (question, one-line explanation, saved row, profiles, skip link) → choices → receipt → monthly amounts. Pinned bar at the bottom (total + you-vs-U.S. + **Edit**) hides while the receipt is on screen.
- **Desktop (≥900px):** left column intro → choices → amounts; right column receipt, `position: sticky`. The receipt shows the top **6** lines plus an "N more lines" row and a "Show all" toggle, so the total stays in view on a laptop-height screen.

### Receipt

Header "CONSUMER PRICES · U.S. CITY AVERAGE", reference month vs a year earlier (from `referenceMonth`) → title → lines sorted by extra dollars (label, 12-month change, `+$`, thin bar scaled to the largest line; a fixed mortgage shows `0.0%`, `+$0`, a FIXED tag) → yearly total on the yellow tag → you-vs-U.S. bars (personal only; one shared grid so both bars start at the same x) → verdict sentence → "Change my answers" / "Make it mine" → notes (stale values, `yoyGap`).

Verdict rules: typical → national rate in dollars + "tap your answers"; above national → "rose N points faster than the national rate, mostly because of {largest line}"; below → "N points slower", plus "Your fixed mortgage payment is a big reason why" when housing is a fixed-rate mortgage; within 0.05 → "about as fast".

### Copy

Plain American English, second person, no unexplained jargon. Terms that must appear (CPI, 12-month change, relative importance) get a one-sentence explanation where they appear. Explainers already written in the mockup: fixed-rate mortgage (why 0%), owning outright, EV charging, health insurance.

### Other tabs

- **The bigger picture:** headline and core CPI with month-over-month + annualized, the 12-month headline trend (no personal line — there is no real personal history), How Others Measure It, gap/stale notes. Placeholder heading for the future international comparison.
- **Price check:** existing average-price table, EIA weekly fuel panel and Biggest Movers, restyled; fixes the Movers color-index bug.
- **Sources:** how the calculation works (formula below, in plain words), data sources, every series ID with FRED/BLS links, caveats, and the .xlsx download.
- Tabs are addressable by URL hash (`#bigger-picture`, `#price-check`, `#sources`) so the skip link and shared links land on the right tab.

## Calculation model

For each line: monthly amount `m`, 12-month change `r` (as a fraction).

```
annual = 12 × m
yearAgo = annual / (1 + r)          # today's spending already includes the rise
extra = annual − yearAgo
yourRate = Σ annual / Σ yearAgo − 1
totalExtra = Σ extra
```

- **Fixed-rate mortgage:** `r = 0` by definition. BLS: mortgage interest is part of the cost of the capital good and "not treated as consumption" ([OER factsheet](https://www.bls.gov/cpi/factsheets/owners-equivalent-rent-and-rent.htm)).
- **Health insurance:** `r` is the person's renewal-notice increase. The input starts with a **sourced national average premium increase** (latest KFF Employer Health Benefits Survey, cited in Sources) if it verifies in plan Task 1; if not, the input starts empty and the line is left out of the receipt until filled, with a prompt.
- **Everything else:** a **derived residual** — see Typical household.

### Line → series map

"Verified" = checked 2026-09-10 against the FRED series page and the BLS v1 API, data through July 2026. Plan Task 1 re-verifies every id programmatically before any code depends on it (past builds shipped 404ing ids).

| Line | Shown when | Series (U.S. city average, NSA) | Source | Status |
|---|---|---|---|---|
| Rent | housing = rent | `CUUR0000SEHA` Rent of primary residence | FRED | verified |
| Mortgage payment | housing = mortgage | — (0% by definition) | — | — |
| Home insurance | mortgage / owned | `CUUR0000SEHD` Tenants' and household insurance (no homeowners-insurance index exists) | FRED | verified; proxy, say so in Sources |
| Home repairs | mortgage / owned | `CUUR0000SAH3` Household furnishings and operations (repair indexes `SEHP*` stopped Oct 2024) | FRED | verified; proxy, say so in Sources |
| Groceries | always | `CUUR0000SAF11` Food at home | FRED | in catalog |
| Eating out | always | `CUUR0000SEFV` Food away from home | FRED | in catalog |
| Gas for the car | car = gas or hybrid | `CUUR0000SETB01` Gasoline | FRED | in catalog |
| Charging the car | car = EV | `CUUR0000SEHF01` Electricity (BLS prices EV home-charging plans within electricity) | FRED | verified |
| Car insurance | car ≠ none | `CUUR0000SETE` Motor vehicle insurance | **BLS API** | verified; not on FRED |
| Car repairs | car ≠ none | `CUUR0000SETD` Motor vehicle maintenance and repair | FRED | verified |
| Bus and train fares | car = none | `CUUR0000SETG02` Intracity transportation | **BLS API** | verified; not on FRED |
| Electricity | always | `CUUR0000SEHF01` Electricity | FRED | verified |
| Natural gas bill | heat = gas | `CUUR0000SEHF02` Utility (piped) gas service | FRED | verified |
| Heating oil | heat = oil | `CUUR0000SEHE01` Fuel oil | **BLS API** | verified; not on FRED |
| Daycare | daycare = yes | `CUUR0000SEEB03` Day care and preschool | **BLS API** | verified; not on FRED |
| College tuition | college = yes | `CUUR0000SEEB01` College tuition and fees | **BLS API** | verified; not on FRED |
| Health insurance | health ≠ none | person's renewal increase | — | — |
| Doctor and pharmacy | always | Medical care **excluding** health insurance: physicians' services + prescription drugs, combined by relative importance | FRED/BLS | **ids to verify in Task 1** |
| Clothing | always | `CPIAPPNS` Apparel | FRED | in catalog |
| Entertainment | always | `CPIRECNS` Recreation | FRED | in catalog |
| Everything else | always | residual (below) | derived | new |

"Commute" changes no rate — it scales the default fuel/charging/fare amounts. "Electric heat" raises the default electricity amount.

### Typical household

- The typical receipt uses a fixed set of **visible lines with BLS relative-importance weights** (the December relative importance table for the most recent year, hardcoded in the catalog with its source URL and date, and a yearly BACKLOG reminder to update). It must show at least housing, groceries, eating out, home energy, gasoline, health care, clothing and entertainment as separate lines so it tells the same story as a personal receipt.
- **"Everything else" is the rest of the basket**: weight `100 − Σ visible weights` (must be **≥ 10**, enforced by a test, so the derived rate can't swing wildly), and its rate is **solved from the published headline** with the same formula, so the typical household reproduces the headline by construction:
  ```
  1/(1+R_headline) = Σ s_i/(1+r_i) + s_rest/(1+r_rest)   →   solve r_rest
  ```
  The personal receipt's "Everything else" line uses the same derived rate — an approximation, since personal lines (car insurance, daycare, …) carve the basket up differently than the typical lines do; it only covers what the person puts in that one amount. Sources explains it in plain words: "worked out from the national rate and the other lines."
- Typical monthly spending: the latest BLS Consumer Expenditure Survey average annual expenditures **excluding personal insurance and pensions**, ÷ 12, rounded to $50, cited — verified in Task 1.

### Profiles

Typical U.S. household · Renter who drives · Family with a mortgage · Retired homeowner · City renter, no car. Each sets choices and starting amounts. Amounts come from Consumer Expenditure Survey tables by housing tenure, age of reference person and household composition where those exist; otherwise they are marked in code as illustrative. **Amounts may be illustrative because people edit them; rates never are.**

## Data pipeline changes

Extends the existing build-time pipeline; `compute.mjs` / `assemble.mjs` stay pure and tested.

1. **Catalog** (`src/data/catalog.js`): `CALC_LINES` (`{ id, label, seriesId, source: "fred" | "bls" }`), `COMBOS` (doctor and pharmacy parts + weights), `BASKET` (typical visible lines, relative-importance weights, CE monthly total, source URLs + dates). `CATEGORIES` is superseded; remove it once no view or export reads it.
2. **BLS source** (`scripts/bls.mjs`): pure `parseBlsResponse(json)` → `{ [seriesId]: [{ date: "YYYY-MM-01", value }] }` — the same observation shape FRED produces, so compute/assemble need no source-specific logic. Drops `M13` (annual average) periods; maps `"-"` (e.g. October 2025) to null. Fetch: one POST to `https://api.bls.gov/publicAPI/v2/timeseries/data/` with `registrationkey` from the **`BLS_API_KEY`** Actions secret, `startyear` = current year − 2 (≤ 50 series per request).
3. **Failure policy:** missing key or BLS error → BLS-sourced lines fall back to `fallback.json` values with `stale: true` and a build-log warning; **non-fatal**. The macro guard (headline/core) is unchanged and still fatal.
4. **Assemble:** `payload.lines = { [id]: { yoy, stale? } }`, anchored to the reference month exactly like categories (so the `yoyGap` logic covers them); `payload.basket = { residualYoy, stale? }` via a pure `residualRate(headlineYoy, parts, restWeight)` in `compute.mjs`. If a visible basket line is stale, the residual is computed from its fallback value and marked stale too.
5. **Workflow:** pass `BLS_API_KEY` to the fetch step. The build logs `N/M series live` across FRED **and** BLS (validate the whole manifest, not one loop — LESSONS 2026-09-01).

## Front-end architecture

Today: one 1,084-line `App.jsx` with inline style objects and copy-pasted label styles. New structure (Vite + React 18, no new runtime dependencies):

```
src/
  App.jsx                      data loading (cpi.json → fallback), tab shell only
  styles/tokens.css            palette, type scale, light/dark tokens (from the mockup)
  styles/controls.css          buttons, tabs, inputs, focus-visible, reduced motion
  calculator/model.js          pure: activeLines, defaultAmount, computeReceipt, verdict, typical lines
  calculator/config.js         choice groups, summary labels, profiles, explainers
  calculator/storage.js        versioned localStorage (key "inflation-reality:answers:v1"); pure parseSaved()
  components/                  Tabs, Receipt, Choices, Summary, Amounts, PinBar, Note (stale/gap), InfoTip (restyled)
  views/                       YourInflation, BiggerPicture, PriceCheck, Sources
  data/                        catalog.js, merge.js (extended for lines + basket)
```

- Fonts via Google Fonts `<link>` in `index.html` with preconnect and real fallback stacks (not inside JSX, as today).
- Recharts stays for the trend, alt-measures and movers charts, restyled through the tokens.
- The .xlsx export moves to Sources; its personal sheet writes the receipt lines instead of the old slider weights.

## Error handling

| Case | Behavior |
|---|---|
| A line's series fell back | Receipt row keeps its rate; a note under the receipt names it ("Using the last known value for: Car insurance") |
| `yoyGap` present | Note under the receipt header, same wording as today's note |
| BLS key missing / BLS down | Build succeeds; BLS lines stale with notes; choices stay usable |
| localStorage blocked | Everything works; the "saved" row is hidden |
| Saved data corrupt or old schema version | Ignored; start in Typical |
| Amount input non-numeric / negative / huge | Non-numeric → 0; negative → 0; capped at $100,000 a month |
| Health insurance with no rate | Line left out of the receipt, with a prompt beside the input |

## Accessibility

Choice and profile buttons use `aria-pressed` inside `fieldset`/`legend`; tabs use `role="tab"` + `aria-selected`; visible `:focus-visible` on every control; touch targets ≥ 44px; `prefers-reduced-motion` disables the press/bump/slide animations; the verdict is `aria-live="polite"`; selection shows a ✓ as well as the fill, and the fixed mortgage shows a FIXED tag, never color alone.

## Testing

- **Unit (`node --test`, no new deps):** `model.js` (formula, fixed mortgage = 0, line mapping for every choice, default nudges, verdict rules, typical household = headline); `bls.mjs` parser (M13 dropped, `"-"` → null, shape matches FRED); `residualRate` (exact reproduction, rest weight ≥ 10 guard); assemble `lines`/`basket` including stale and `yoyGap` anchoring; `storage.parseSaved` (corrupt, old version, valid); merge.
- **Before merge — browser check with a Python Playwright script** (not the shared MCP browser) at 390×844 and 1280×900, light and dark: first frame shows the typical receipt; tapping "Mortgage, fixed rate" gives a 0% FIXED line and the explainer; reload shows the summary; Start over returns to Typical; every tab loads by hash; zero console errors.
- **After deploy:** live `cpi.json` has every `lines` id and `basket.residualYoy`, 0 stale; typical rate on the live page equals the headline.

## Rollout

- **Two phases, one spec.** Phase 1 (pipeline: BLS source, lines, basket, residual) is invisible to the current UI and ships to `main`. Phase 2 (front end) is built on branch `redesign/calculator-first`; `main` keeps deploying the current site on its schedule until the merge.
- **Prerequisite (user):** register a BLS API key and add the `BLS_API_KEY` secret. Phase 1 can merge without it (BLS lines stale), but Phase 2 does not merge until the key is set and production shows those lines live.

## Out of scope

- International comparison tab — its own spec next (BACKLOG).
- A personal inflation *history* line — needs per-line history; revisit after launch.
- Share links or answers in the URL — they would expose spending data.
- Commodity prices, Case-Shiller, Zillow ZORI (BACKLOG).

## Verify in plan Task 1 (facts, not open decisions)

1. Every series id in the line map, programmatically, on FRED and the BLS API.
2. Physicians' services and prescription drugs ids + relative importance weights for "Doctor and pharmacy".
3. The December relative-importance values for the typical visible lines (rest weight ≥ 10).
4. The Consumer Expenditure Survey average spending figure (excluding personal insurance and pensions) and the tables used for profile amounts.
5. The KFF average premium increase used as the health insurance default (or drop the default).
