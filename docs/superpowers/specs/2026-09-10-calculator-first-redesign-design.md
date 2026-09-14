# Calculator-First Redesign — Design

**Date:** 2026-09-10, revised 2026-09-14
**Project:** inflation-reality
**Status:** Direction approved. 2026-09-14 revision folds in an independent UX/design review, the user's pick of the **toned-down** visual direction, and **dropping the profiles row**. Pending user review of this revision, then the implementation plan.
**Mockup (approved):** https://claude.ai/code/artifact/a59d8dd0-a0af-4f74-bec8-08e2d2ba04ed, committed copy `docs/superpowers/mockups/2026-09-14-layout-c-plain.html`. The earlier receipt-style mockup (`2026-09-10-layout-c.html`) is **superseded**; it is kept for history only. Rates marked `*` in the mockup are placeholders; none ship.

## Problem

Outside feedback on the live dashboard, in two parts:

1. **"What is the goal of the dashboard, what is it trying to tell me?"** The page's point, that inflation is different for every household depending on what it spends money on, is buried. "Your Inflation" is one tile of three, and the sliders that produce it are the 5th of 6 sections, below three charts.
2. **"This comes across as very AI coded."** Tiny spaced-out monospace caps labels, a row of identical stat tiles, cards everywhere, emoji icons, left-border callouts, a pill badge with a green dot, a gradient download card. **Buttons don't look like buttons**: only the export button has a hover state; nothing has pressed, selected or focus states, `aria-pressed` or `aria-selected`.

Also accepted: compare U.S. inflation with other countries, as **a separate spec** after this one.

**Goal, in one sentence:** show people that inflation hits each household differently, and make it obvious, in dollars, how it hits *them*, without the page looking generated.

## Decisions

| Question | Decision |
|---|---|
| Audience | Regular people arriving from a shared link, **mostly on a phone** |
| Spending input | **Monthly dollar amounts**, pre-filled from the person's answers; editable behind "Adjust monthly amounts". No percentage sliders |
| Profiles | **Dropped** (2026-09-14). They duplicated the questions and pushed the result about two phone screens down |
| Questions | Four single-choice questions: **Your home** (rent / mortgage, fixed rate / own it outright), **Getting around** (gas car / hybrid / electric car / no car), **Home heating** (electric / natural gas / heating oil), **Health insurance** (through work / I buy my own / I don't pay a premium). Plus **Also paying for** checkboxes: daycare, college tuition. Commuting is not a question; it's a hint on the gas amount |
| Insurance rates | **Health and home insurance use the increase on the person's own renewal notice.** Each starts at a national estimate labeled "National estimate, change to yours". The CPI health insurance index is never used (it measures insurer retained earnings, not premiums; +28% YoY Sep 2022 then steep falls; BLS *Monthly Labor Review* 2024) |
| Layout | Questions first, result right below on phones (sticky beside the questions on desktop), amounts collapsed after. A dock on phones shows the result while the panel is off screen |
| Result | A plain **result panel**: title, the answer as a sentence ("About $1,450 more a year"), your rate vs. the national rate, one verdict sentence, a line saying how much is guessed, and "Where the extra money goes" (one row per spending line). **No receipt metaphor** (dropped 2026-09-14) |
| First visit | Opens with **the average U.S. household**, nothing selected. The first answer turns it into the person's estimate. "Just want the national numbers?" links to that tab |
| Guesses | When someone answers one question, the others get common answers that are **shown as guesses** (dashed border, "our guess"), not as selections, and the panel says "Based on 1 answer and 3 guesses" |
| Changing answers | Nothing locks; everything updates live. "Change answers" in the panel jumps back to the questions |
| Remembering | Answers saved **in this browser only** (localStorage), never sent anywhere. Returning visitors see "Updated with July 2026 prices.", a one-line summary of their answers, and their result. "Start over" clears it, with **Undo** for 8 seconds |
| Tabs | **Your costs**, **National numbers** (headline/core, month-over-month, 12-month trend, other official measures), **Price check**, **Sources** (method, sources, series IDs, download). The 17-term glossary becomes one-sentence explanations where terms appear |
| Visual direction | **Toned down** (2026-09-14): one type family, flat bordered controls, one accent color, one raised surface per view. Details in *Visual system* |

## Success criteria

- A first-time phone visitor understands within 5 seconds what the page does and that the first number is **the average household's, not theirs**. Checked with the 5-second test below.
- One tap produces the person's own estimate; the page always says how much of it is guessed.
- **The average household reproduces the published headline 12-month change** (to the displayed 0.1), using live data.
- **The rounded dollar lines add up exactly to the rounded total.**
- **Every rate on the page is a live published series, a definition (fixed mortgage = 0%), a clearly labeled derived value, or a number the person typed.** No placeholder rates ship.
- Every control looks interactive and shows hover, pressed, selected, guessed and keyboard-focus states; selection is never shown by color alone.
- The page passes every check in *Design rules* (automated) in both themes at 390px and 1280px.
- A returning visitor sees their result with the newest month without re-entering anything.
- The stale-value notes and the `yoyGap` note (shipped 2026-09-10) keep working.

## Visual system

From the approved mockup. Tokens live in `src/styles/tokens.css`; components never use literal colors.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ground` | `#F3F5F4` | `#161A1E` | page |
| `--surface` | `#FFFFFF` | `#1F252B` | result panel, returning summary, controls |
| `--ink` | `#1F2933` | `#E7ECEA` | text |
| `--ink-2` | `#56626E` | `#AEB8C0` | secondary text |
| `--rule` | `#D5DCDA` | `#353D44` | row dividers, panel border |
| `--control-edge` | `#6B7682` | `#8B96A1` | button and input borders |
| `--accent` | `#2E5E45` | `#8CC9A2` | selected answers, "your costs" bar, focus ring |
| `--accent-soft` | `#E3EDE7` | `#22382C` | guessed answers, checked checkboxes |
| `--bar-us` / `--bar-line` | `#7D8894` / `#A3ADB5` | `#8C97A2` / `#68737D` | national bar, line bars |

- **Type:** Libre Franklin (400/500/600/700/800), fallback `"Franklin Gothic Medium", "Helvetica Neue", Arial, sans-serif`. Tabular figures on every number. Scale: 13 / 15 / 16 / 18 / 20, headings `clamp(30px, 7.6vw, 44px)`, answer sentence `clamp(34px, 9.4vw, 46px)`, weight 800, letter-spacing −0.02em.
- **Controls:** 1.5px `--control-edge` border, 6px radius, ≥44px tall. Hover: `--control-hover` fill and `--ink` border. **Selected:** `--accent` fill, white text, ✓ prefix, `aria-pressed="true"`. **Guessed:** dashed `--accent` border, `--accent-soft` fill, "our guess" tag, `aria-pressed="false"`. Checkboxes are real `<input type="checkbox">` inside bordered labels.
- **Surfaces:** one raised surface per view (1px `--rule` border, 10px radius, no shadow). Only the phone dock and the Undo toast have a shadow.
- **Tabs:** text buttons; the selected tab gets a 3px `--ink` underline; the row wraps at phone width instead of scrolling out of view.
- **Motion:** only in response to actions (dock sliding away, toast), off under `prefers-reduced-motion`.

## Design rules (testable "not AI-looking" criteria)

Each rule is checked by the Playwright audit in *Testing* unless marked (review).

1. At most **two** type families (the design uses one); **no monospace** anywhere.
2. **No all-caps or letter-spaced labels**; sentence case everywhere (`text-transform: none`; letter-spacing ≤ 0 on text under 20px).
3. **No decorative metaphors**: no receipts, tickets, torn or scalloped edges, dashed "cut" lines, highlighter marks. (review)
4. **No template chrome**: no `A · B · C` middle-dot strings, no `WORD — fragment` labels, no `→` appended to buttons or links, no emoji, no eyebrow labels above headings, no single word accented in a heading.
5. **No card grids**; one raised surface per view; radius by role only (controls 6px, panels 10px).
6. **One accent color** for selection, "you" and focus. No red for price increases; semantic color only for stale or error notes, always with text.
7. **Contrast:** text ≥ 4.5:1, UI graphics and focus rings ≥ 3:1, in both themes (a unit test over the token pairs).
8. **Copy follows the Voice guide** (banned-string scan on rendered text).
9. **5-second test** (run by the owner before merge): show the first screen on a phone to 5 people who aren't designers and ask "What does this page do?" and "Is that number yours?" At least 4 of 5 answer both correctly.

## Voice guide

- Plain American English, second person, sentence case, active voice. Say what things are; don't sell.
- A button names its action, and the action keeps that name everywhere ("Change answers" in the panel, the summary and after Undo).
- Explanations are plain sentences, one or two, next to the thing they explain. No bold lead-ins.
- **Banned in site copy:** em dashes; `·` separators; clever taglines ("repriced", "reimagined", "the real cost of…"); "X, not Y" constructions; "Welcome back"; "Here's…", "Let's…", "simply"; exclamation marks; unexplained jargon (CPI, YoY, relative importance) outside Sources.

**Key strings**

| Where | Copy |
|---|---|
| Headline | How much more are you paying than a year ago? |
| Lede (new / average) | Prices overall rose 3.4% in the year to July 2026. How much that costs you depends on how you live. Answer four questions to see your estimate. |
| Lede (returning, folded) | Updated with July 2026 prices. |
| Skip link | Just want the national numbers? |
| Panel title | The average U.S. household vs. July 2025 / Your costs vs. July 2025 |
| Answer | About $1,450 more a year |
| Rates line | Prices overall rose 3.4%. / Your costs rose 2.9%. Prices overall rose 3.4%. |
| Verdict | More than the national rate, mainly because of gas for the car. / Less than the national rate, mainly because your mortgage payment didn't change. / Less than the national rate. / About the same as the national rate. |
| Basis | Based on 1 answer and 3 guesses. Monthly amounts are starting estimates. |
| Mortgage explanation | A fixed-rate payment stays the same from year to year, so it adds nothing here. The official inflation rate leaves mortgage payments out too. Home insurance and repairs still go up. |
| Electric car explanation | Most people charge at home, so we use the change in home electricity prices. |
| Health insurance explanation | Use the increase from your renewal notice. The government's health insurance index tracks what insurers keep, not what people pay, so we don't use it. |
| Undo toast | Answers cleared. [Undo] |

## Numbers

- **Rates:** one decimal, `+` for increases, `%` (e.g. `+24.6%`); a fixed mortgage shows `0%`.
- **Dollars:** the total rounds to the nearest **$50** and is written "About $2,350"; lines round to **$10** using largest-remainder allocation so they **sum exactly to the rounded total**. A line above $0 that allocates to $0 shows "under $10". Monthly totals in the summary round to $50.
- **Inputs:** whole dollars a month, 0 to 100,000; non-numeric input counts as 0. Renewal increases accept one decimal.
- **Dates:** "July 2026"; comparisons "vs. July 2025"; reference months come from `referenceMonth` in the payload, never hardcoded.

## The "Your costs" tab

### States

| State | When | Questions | Panel title | Dock (phones) |
|---|---|---|---|---|
| **Average** | First visit; after Start over | Nothing selected | The average U.S. household vs. July 2025 | Two lines: "Average U.S. household" / "About $2,350 more a year" |
| **Personal** | After any answer or checkbox | Answered = selected; unanswered = guessed common answer | Your costs vs. July 2025 | Two lines: "Your costs" / "About $1,450 more a year" |
| **Returning** | Page load with saved answers | Folded into a summary card: "Rent, gas car, natural gas heat, health insurance through work. Paying for daycare. About $3,950 a month." + "Saved in this browser only." + **Change answers** + **Start over** | Your costs vs. July 2025 | as Personal |

Common answers used as guesses: rent, gas car, natural gas heat, health insurance through work. The page never folds while someone is answering; folding happens only on load.

### Order

- **Phone:** headline, lede, skip link → questions → result panel → "Adjust monthly amounts" (collapsed). The dock hides while the panel is on screen and has a **See details** button that scrolls to the panel. `scroll-padding-bottom` keeps focused controls clear of the dock.
- **Desktop (≥ 900px):** questions and amounts on the left; result panel sticky on the right.

### Result panel

Title → answer sentence → rates line → your-costs vs. national bars (personal only; one shared grid so both bars start at the same x) → verdict → basis → "Where the extra money goes": rows sorted by dollars (label with an optional note such as "Fixed payment", "National estimate, change to yours", "Estimate"; rate; dollars; thin neutral bar), the top **6** shown, then "N smaller items" with their sum, then **"Everything else" always last, in secondary ink, noted "Estimated from the national rate"** → **Change answers** (or **Answer the questions** in Average) and "Show all N items" → fine print: "Estimates based on BLS consumer price data for July 2026. Dollar amounts are rounded." plus any stale or `yoyGap` notes.

### Other tabs

Each tab is addressable by URL hash (`#national-numbers`, `#price-check`, `#sources`).

- **National numbers:** headline and core CPI with month-over-month and annualized rates, the 12-month headline trend (no personal line: there is no real personal history), other official measures, gap/stale notes; a reserved spot for the future country comparison.
- **Price check:** average-price table, EIA weekly fuel, Biggest Movers (fixing its color-index bug).
- **Sources:** how the estimate is worked out (the formula in plain words, the fixed-mortgage and residual explanations, proxies named), every series with a FRED or BLS link, caveats, the .xlsx download.
- **Chart rules (all tabs):** Recharts styled from tokens only; axis and label text in `--ink-2`, gridlines `--rule`; a single series uses `--accent`; comparisons use `--accent` vs `--bar-us`; the 7 other-official-measures bars use **one neutral hue with direct value labels** instead of 7 colors (no categorical palette to validate); increases and decreases are shown by sign and label, not red and green; no chart shadows or cards within the panel; hover tooltips use `--surface` with a `--rule` border.

## Calculation model

For each line: monthly amount `m`, 12-month change `r` (fraction).

```
annual  = 12 × m
yearAgo = annual / (1 + r)          # today's spending already includes the rise
extra   = annual − yearAgo
yourRate   = Σ annual / Σ yearAgo − 1
totalExtra = Σ extra                # shown rounded to $50; lines allocated to $10 so they sum to it
```

- **Fixed-rate mortgage:** `r = 0` by definition. BLS: mortgage interest is part of the cost of the capital good and "not treated as consumption" ([OER factsheet](https://www.bls.gov/cpi/factsheets/owners-equivalent-rent-and-rent.htm)).
- **Health insurance / home insurance:** `r` is the person's renewal increase. Defaults: health = latest KFF Employer Health Benefits Survey average premium increase; home = the latest `CUUR0000SEHD` 12-month change. Both labeled as national estimates; if a default can't be verified in Task 1, that input starts empty and the line stays off the panel until filled, with a prompt.
- **Everything else:** derived residual (below).

### Line → series map

"Verified" = checked 2026-09-10 against the FRED series page and the BLS v1 API, data through July 2026. Task 1 re-verifies every id programmatically.

| Line | Shown when | Series (U.S. city average, NSA) | Source | Status |
|---|---|---|---|---|
| Rent | home = rent | `CUUR0000SEHA` Rent of primary residence | FRED | verified |
| Mortgage payment | home = mortgage | 0% by definition, note "Fixed payment" | — | — |
| Home insurance | mortgage / owned | renewal increase; default `CUUR0000SEHD` Tenants' and household insurance | FRED | verified; named as a national estimate |
| Home repairs | mortgage / owned | `CUUR0000SAH3` Household furnishings and operations (repair indexes `SEHP*` stopped Oct 2024); note "Estimate" | FRED | verified; proxy |
| Groceries | always | `CUUR0000SAF11` | FRED | in catalog |
| Eating out | always | `CUUR0000SEFV` | FRED | in catalog |
| Gas for the car | car = gas or hybrid | `CUUR0000SETB01`; amount hint "Drive less or work from home? Lower this." | FRED | in catalog |
| Charging the car | car = electric | `CUUR0000SEHF01` Electricity (BLS prices EV home-charging plans within electricity) | FRED | verified |
| Car insurance | car ≠ none | `CUUR0000SETE` | **BLS API** | verified; not on FRED |
| Car repairs | car ≠ none | `CUUR0000SETD` | FRED | verified |
| Bus and train fares | car = none | `CUUR0000SETG02` Intracity transportation (`SETG01` is airline fares) | **BLS API** | verified; not on FRED |
| Electricity | always | `CUUR0000SEHF01` | FRED | verified |
| Natural gas bill | heat = natural gas | `CUUR0000SEHF02` | FRED | verified |
| Heating oil | heat = heating oil | `CUUR0000SEHE01` | **BLS API** | verified; not on FRED |
| Daycare | also: daycare | `CUUR0000SEEB03` | **BLS API** | verified; not on FRED |
| College tuition | also: college tuition | `CUUR0000SEEB01` | **BLS API** | verified; not on FRED |
| Health insurance | health ≠ none | renewal increase; default KFF | — | — |
| Doctor and pharmacy | always | physicians' services + prescription drugs, combined by relative importance | FRED/BLS | **ids to verify in Task 1** |
| Clothing | always | `CPIAPPNS` | FRED | in catalog |
| Entertainment | always | `CPIRECNS` | FRED | in catalog |
| Everything else | always | residual | derived | new |

Default amount nudges: hybrid → gas × 0.55; electric heat → electricity + $80; buying your own health insurance → a higher premium default.

### Average household

- Visible lines use **BLS relative-importance weights** (the December table for the latest year, hardcoded in the catalog with source URL and date; a yearly BACKLOG reminder to update). It shows at least housing, groceries, eating out, home energy, gasoline, health care, clothing and entertainment.
- **Everything else** has weight `100 − Σ visible` (**≥ 10**, tested) and a rate **solved from the published headline** with the same formula, so the average household reproduces the headline by construction:
  ```
  1/(1+R_headline) = Σ s_i/(1+r_i) + s_rest/(1+r_rest)   →   solve r_rest
  ```
- **Plausibility bound:** if `r_rest` is more than **3 points** from the headline, the build logs a `::warning::` annotation and marks `basket.stale`, and the panel's fine print says the "Everything else" estimate may be off. Tested.
- The personal "Everything else" line uses the same derived rate. That's an approximation, since personal lines (car insurance, daycare) carve the basket differently; it only covers the amount the person puts on that line. Sources says so.
- Average monthly spending: the latest BLS Consumer Expenditure Survey **mean** annual expenditures excluding personal insurance and pensions, ÷ 12, rounded to $50, cited. Always called "average", never "typical".

### Starting amounts

Defaults come from the answers: Consumer Expenditure Survey tables by housing tenure (renter / owner with mortgage / owner without) where they exist, otherwise illustrative values marked as such in code. **Amounts may be illustrative because people see and edit them; rates never are.**

## Data pipeline changes

Extends the existing build-time pipeline; `compute.mjs` / `assemble.mjs` stay pure and tested.

1. **Catalog** (`src/data/catalog.js`): `CALC_LINES` (`{ id, label, seriesId, source: "fred" | "bls" }`), `COMBOS` (doctor and pharmacy parts and weights), `BASKET` (average visible lines, relative-importance weights, CE monthly mean, source URLs and dates). `CATEGORIES` is superseded; remove it once no view or export reads it.
2. **BLS source** (`scripts/bls.mjs`): pure `parseBlsResponse(json)` → `{ [seriesId]: [{ date: "YYYY-MM-01", value }] }`, the same shape FRED produces. Drops `M13` (annual average) periods; maps `"-"` (e.g. October 2025) to null. Fetch: one POST to `https://api.bls.gov/publicAPI/v2/timeseries/data/` with `registrationkey` from the **`BLS_API_KEY`** Actions secret (**set 2026-09-14**, confirmed via `gh secret list`), `startyear` = current year − 2, ≤ 50 series per request.
3. **Failure policy:** missing key or BLS error → BLS lines fall back to `fallback.json` values with `stale: true`; **non-fatal**. A key or quota error (`REQUEST_NOT_PROCESSED`, invalid key) emits a `::warning::` annotation naming the cause, so an expired key is visible in the Actions summary. **BLS keys must be renewed at least yearly** (next renewal due by 2027-09-14). The headline/core guard is unchanged and still fatal.
4. **Assemble:** `payload.lines = { [id]: { yoy, stale? } }`, anchored to the reference month like categories (so `yoyGap` covers them); `payload.basket = { residualYoy, stale? }` via a pure `residualRate(headlineYoy, parts, restWeight)` in `compute.mjs`. A stale visible basket line makes the residual stale too.
5. **Workflow:** pass `BLS_API_KEY` to the fetch step. The build logs `N/M series live` across FRED **and** BLS (validate the whole manifest, not one loop; LESSONS 2026-09-01).

## Front-end architecture

Today: one 1,084-line `App.jsx` with inline style objects. New structure (Vite + React 18, no new runtime dependencies):

```
index.html                     fonts <link> with preconnect; title, description, Open Graph + Twitter meta
public/og-image.png            1200×630 share image: headline + site name, no numbers (never goes stale)
src/
  App.jsx                      data loading (cpi.json → fallback), hash tabs, shell only
  styles/tokens.css            the Visual system tokens, light + dark
  styles/controls.css          buttons, guessed state, checkboxes, tabs, inputs, focus, reduced motion
  calculator/model.js          pure: activeLines, defaultAmount, computeResult, allocateRounded, verdict, basis, average lines
  calculator/config.js         questions, "also paying for", summary phrases, explanations, common answers
  calculator/storage.js        versioned localStorage ("inflation-reality:answers:v1"); pure parseSaved()
  components/                  Tabs, Questions, Summary, ResultPanel, Amounts, Dock, Toast, Note (stale/gap), Explain
  views/                       YourCosts, NationalNumbers, PriceCheck, Sources
  data/                        catalog.js, merge.js (extended for lines + basket)
```

- **Loading:** the page renders immediately from the bundled `fallback.json` and swaps in `cpi.json` when it arrives (as today); no skeletons or spinners. The fine print carries "Prices through July 2026".
- **Fonts:** `display=swap`; no layout depends on font metrics (no fixed heights on text), so the Arial fallback reflows cleanly.
- **Link previews:** `<title>` "Inflation Reality"; `og:site_name` "Inflation Reality"; `og:title` "How much more are you paying than a year ago?"; `og:description` "See how much prices rose for a household like yours, in dollars, using government price data."; `og:image` `/og-image.png`; `twitter:card` `summary_large_image`.
- The .xlsx export moves to Sources; its personal sheet writes the panel's lines.

## Error handling

| Case | Behavior |
|---|---|
| A line's series fell back | Row keeps its rate; fine print names it: "Using the last known value for car insurance." |
| `yoyGap` present | Note in the fine print, same wording as today |
| BLS key missing, expired or over quota | Build succeeds with a `::warning::`; BLS lines stale with notes; questions stay usable |
| Residual rate implausible | `::warning::` in the build; fine print: "The estimate for everything else may be off this month." |
| localStorage blocked | Everything works; "Saved in this browser only." is hidden |
| Saved data corrupt or old version | Ignored; start in Average |
| Amount or rate input invalid | Clamped per *Numbers*; never an error message for rough numbers |
| A renewal-increase default unavailable | Input empty, line off the panel, prompt "Enter the increase from your renewal notice." |

## Accessibility

Single-choice questions: buttons with `aria-pressed` inside `fieldset`/`legend`; guessed answers stay `aria-pressed="false"` with visible "our guess" text. Checkboxes are native. Tabs: `role="tab"` + `aria-selected`. A **persistent** visually hidden `aria-live="polite"` region (outside the re-rendered panel) announces "Your costs vs. July 2025: About $1,450 more a year. Less than the national rate…" only when that text changes. Visible `:focus-visible` rings in `--accent`; touch targets ≥ 44px; `prefers-reduced-motion` respected; contrast per Design rule 7.

## Testing

- **Unit (`node --test`, no new deps):** `model.js` (formula; fixed mortgage = 0; mapping for every answer and checkbox; default nudges; verdict and basis rules; `allocateRounded` sums exactly to the rounded total, handles "under $10" and totals rounded down); average household = headline; `bls.mjs` parser (M13 dropped, `"-"` → null, FRED-shaped output); `residualRate` (exact reproduction, rest weight ≥ 10, 3-point plausibility flag); assemble `lines`/`basket` with stale and `yoyGap`; `storage.parseSaved`; token contrast pairs (Design rule 7); merge.
- **Before merge: Playwright audit script** (Python, not the shared MCP browser) at 390×844 and 1280×900, light and dark:
  - Flows: first screen shows the Average panel with nothing selected and the dock reading "Average U.S. household"; answering "Mortgage, fixed rate" gives a `0%` "Fixed payment" line, the explanation, three guessed answers and "Based on 1 answer and 3 guesses"; checking Daycare adds its line; the visible dollar lines plus "smaller items" sum to the total; reload shows the summary card; Start over then Undo restores; each tab loads by hash; all four tabs are visible without horizontal scrolling at 390px; zero console errors.
  - **Design-rule audit** over every rendered element: computed `font-family` stack uses only allowed families and no monospace; no `text-transform: uppercase`; no positive letter-spacing under 20px; no rendered text containing `·`, `—`, `→`, or banned Voice-guide strings; no emoji code points.
- **Owner, before merge:** the 5-second test (Design rule 9).
- **After deploy:** live `cpi.json` has every `lines` id and `basket.residualYoy`, 0 stale; the Average panel's rate on the live page equals the headline.

## Rollout

- **Phase 1 (pipeline):** BLS source, `lines`, `basket`, residual and warnings. Invisible to the current UI; ships to `main`. With the key already set, production should show the BLS lines live immediately.
- **Phase 2 (front end):** branch `redesign/calculator-first`; `main` keeps deploying today's site until the merge. Merge gate: tests + Playwright audit pass, the 5-second test passes, production `cpi.json` shows all lines live.

## Out of scope

- International comparison tab (its own spec next; BACKLOG).
- A personal inflation *history* line.
- Share links or answers in the URL (would expose spending data).
- Commodity prices, Case-Shiller, Zillow ZORI (BACKLOG).
- Renaming the site.

## Verify in plan Task 1 (facts, not open decisions)

1. Every series id in the line map, programmatically, on FRED and the BLS API (with the key).
2. Physicians' services and prescription drugs ids and relative-importance weights for "Doctor and pharmacy".
3. The December relative-importance values for the average household's visible lines (rest weight ≥ 10) and the resulting residual rate against the 3-point bound.
4. The Consumer Expenditure Survey mean spending (excluding personal insurance and pensions) and the tenure tables used for starting amounts.
5. The KFF average premium increase for the health insurance default, and the latest `SEHD` change for the home insurance default.
