# Calculator-First Redesign — Design

**Date:** 2026-09-10, revised 2026-09-14 (twice)
**Project:** inflation-reality
**Status:** Approved for planning. Revision 2 folds in the owner's picks (toned-down direction, no profiles); revision 3 folds in a second independent review (basket math, BLS parsing, negatives, fallback, verdict rule, audit details). Phase 1 plan: `docs/superpowers/plans/2026-09-14-calculator-phase1-pipeline.md`.
**Mockup (approved):** https://claude.ai/code/artifact/a59d8dd0-a0af-4f74-bec8-08e2d2ba04ed, committed copy `docs/superpowers/mockups/2026-09-14-layout-c-plain.html`. Where the mockup and this spec differ, **this spec wins** (the mockup predates revision 3: negatives, verdict rule, heating option, insurance defaults). The receipt mockup `2026-09-10-layout-c.html` is superseded. Rates marked `*` in mockups are placeholders; none ship.

## Problem

Outside feedback on the live dashboard:

1. **"What is the goal of the dashboard, what is it trying to tell me?"** The point, that inflation differs by household depending on spending, is buried: "Your Inflation" is one tile of three, and the sliders are the 5th of 6 sections.
2. **"This comes across as very AI coded."** Monospace caps labels, identical stat tiles, cards everywhere, emoji, left-border callouts, a pill badge, a gradient card. **Buttons don't look like buttons**: no pressed, selected or focus states; no `aria-pressed` / `aria-selected`.

Also accepted: compare U.S. inflation with other countries, as **a separate spec** later.

**Goal:** show people that inflation hits each household differently, and make it obvious, in dollars, how it hits *them*, without the page looking generated.

## Decisions

| Question | Decision |
|---|---|
| Audience | Regular people arriving from a shared link, **mostly on a phone** |
| Spending input | **Monthly dollar amounts**, pre-filled from the person's answers; editable behind "Adjust monthly amounts". No percentage sliders |
| Profiles | **Dropped** (2026-09-14): they duplicated the questions and pushed the result about two phone screens down |
| Questions | **Your home** (rent / mortgage, fixed rate / own it outright), **Getting around** (gas car / hybrid / electric car / no car), **Home heating** (electric / natural gas / heating oil / included in my rent), **Health insurance** (through work / I buy my own / I don't pay a premium). Plus **Also paying for** checkboxes: daycare, college tuition. Commuting is a hint on the gas amount, not a question |
| Insurance rates | Health and home insurance use **the increase on the person's own renewal notice**. Health "through work" starts at the KFF 2025 average employer family premium increase (**6%**), labeled "Average for employer plans, change to yours". Health "I buy my own" and home insurance **start empty** (marketplace premiums moved very differently in 2026, and the BLS insurance index covers contents only, not the home). The CPI health insurance index is **never used as the person's health insurance rate** (it measures insurer retained earnings: +28.2% Sep 2022, −37.3% Sep 2023) |
| Layout | Questions first, result right below on phones (sticky beside the questions on desktop), amounts collapsed after; a dock on phones while the result is off screen |
| Result | A plain **result panel**: title, the answer as a sentence, your rate vs. the national rate, one verdict sentence, how much is guessed, and "Where the extra money goes". **No receipt metaphor** |
| First visit | Opens with **the average U.S. household**, nothing selected. "Just want the national numbers?" links to that tab |
| Guesses | After any answer or checkbox, unanswered questions show common answers **as guesses** (dashed, "our guess"), and the panel says how many answers are guesses |
| Changing answers | Nothing locks; everything updates live. "Change answers" jumps back to the questions |
| Remembering | Saved **in this browser only**; returning visitors see "Updated with July 2026 prices.", a summary of their answers, and their result. "Start over" clears it, with **Undo** |
| Tabs | **Your costs**, **National numbers**, **Price check**, **Sources**. The glossary becomes one-sentence explanations where terms appear |
| Visual direction | **Toned down**: one type family, flat bordered controls, one accent color, one raised surface per view |

## Success criteria

- A first-time phone visitor understands within 5 seconds what the page does and that the first number is **the average household's, not theirs** (5-second test).
- One tap produces the person's own estimate; the page always says how much is guessed.
- **The average household reproduces the published headline 12-month change** at the displayed 0.1.
- **The rounded dollar lines add up exactly to the rounded total**, including negative lines.
- **Every rate is a live published series, a definition (fixed mortgage = 0%), a clearly labeled derived value, or a number the person typed.** No placeholder rates ship.
- Every control shows hover, pressed, selected, guessed and focus states; selection is never color alone.
- The page passes every automated *Design rules* check in both themes at 390px and 1280px.
- A returning visitor sees their result with the newest month without re-entering anything.
- **A BLS line on a last known value turns the build red** (the site still deploys).
- Stale-value and `yoyGap` notes keep working.

## Visual system

Tokens in `src/styles/tokens.css`; components never use literal colors.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ground` | `#F3F5F4` | `#161A1E` | page |
| `--surface` | `#FFFFFF` | `#1F252B` | result panel, controls |
| `--ink` | `#1F2933` | `#E7ECEA` | text |
| `--ink-2` | `#56626E` | `#AEB8C0` | secondary text |
| `--ink-3` | `#66717D` | `#9AA5AE` | notes under line labels |
| `--rule` | `#D5DCDA` | `#353D44` | dividers, panel border (decorative) |
| `--control-edge` | `#6B7682` | `#8B96A1` | button and input borders |
| `--control-hover` | `#EAF0ED` | `#29323A` | hover fill |
| `--accent` | `#2E5E45` | `#8CC9A2` | selected fill, your-costs bar, focus ring |
| `--accent-ink` | `#FFFFFF` | `#0F2219` | text on `--accent` |
| `--accent-soft` | `#E3EDE7` | `#22382C` | guessed answers, checked checkboxes |
| `--bar-us` | `#7D8894` | `#8C97A2` | national bar |
| `--bar-line` | `#87919A` | `#7A858F` | line bars |
| `--dock` / `--dock-ink` | `#1F2933` / `#FFFFFF` | `#E7ECEA` / `#161A1E` | phone dock, Undo toast |

- **Type:** Libre Franklin 400–800, fallback `"Franklin Gothic Medium", "Helvetica Neue", Arial, sans-serif`. Tabular figures on numbers. Scale 13 / 15 / 16 / 18 / 20; headings `clamp(30px, 7.6vw, 44px)`; answer sentence `clamp(34px, 9.4vw, 46px)`, weight 800, letter-spacing −0.02em. Every `button`, `input`, `select` sets `font: inherit`.
- **Controls:** 1.5px `--control-edge` border, 6px radius, ≥ 44px tall. Hover: `--control-hover`, `--ink` border. **Selected:** `--accent` fill, `--accent-ink` text, ✓ prefix, `aria-pressed="true"`. **Guessed:** dashed `--accent` border, `--accent-soft` fill, "our guess" tag, `aria-pressed="false"`. Checkboxes are native inputs inside bordered labels.
- **Raised surface** = a bordered, filled, radiused box. One per view: the result panel. The returning summary is **not** boxed (plain section with a top `--rule`). Only the dock and toast have shadows.
- **Navigation:** the four sections are links (`<a href>`), the current one with `aria-current="page"` and a 3px `--ink` underline; the row wraps at phone width.
- **Motion:** only in response to actions (dock, toast), off under `prefers-reduced-motion`.

## Design rules (testable "not AI-looking" criteria)

Checked by the Playwright audit in *Testing* unless marked (review).

1. At most **two** type families (the design uses one); **no monospace** computed on any element. Series IDs render in the body font (never `<code>`).
2. **No all-caps or letter-spaced labels**: no computed `text-transform: uppercase`; no positive letter-spacing on text under 20px.
3. **No decorative metaphors**: receipts, tickets, torn or scalloped edges, dashed "cut" lines, highlighter marks. (review)
4. **No template chrome** in rendered text: no `·`, no `—`, no `→`, no emoji (`\p{Extended_Pictographic}` or U+FE0F), no eyebrow labels above headings, no single accented word in a heading (last two: review).
5. **One raised surface per view** (definition above); radius by role only (controls 6px, panel 10px).
6. **One accent color** for selection, "you" and focus; no red or green for up/down; semantic color only on stale or error notes, always with text.
7. **Contrast**, both themes, checked by a unit test over token pairs: text ≥ 4.5:1 for `--ink`, `--ink-2`, `--ink-3` on `--ground` and `--surface`, `--accent-ink` on `--accent`, `--dock-ink` on `--dock`; non-text ≥ 3:1 for `--control-edge`, `--accent`, `--bar-us`, `--bar-line` on `--surface`, and `--accent` on `--ground` (focus ring). `--rule` is decorative and exempt.
8. **Voice guide** banned strings (scan of rendered text; see scope below).
9. **5-second test** (owner, before Phase 2 merge): 5 non-designers, first screen on a phone, "What does this page do?" and "Is that number yours?" At least 4 of 5 answer both correctly.

## Voice guide

- Plain American English, second person, sentence case, active voice. Say what things are.
- A button names its action, and the action keeps its name everywhere ("Change answers").
- Explanations are one or two plain sentences next to what they explain, no bold lead-ins.
- **Banned everywhere in site copy:** `—` (em dash), `·`, `→`, exclamation marks, "Welcome back", "Here's", "Let's", "simply", clever taglines ("repriced", "reimagined"). **Review-only:** "X, not Y" constructions. **On the Your costs tab only:** unexplained "CPI", "YoY", "relative importance" (other tabs name measures such as "Median CPI").
- Phase 2 rewrites existing strings that break these rules: `StaleNote` and the `yoyGap` note (em dashes, "CPI"), and the `ALT_MEASURES` / `WEEKLY_PRICES` blurbs in `catalog.js` (em dashes).

**Key strings**

| Where | Copy |
|---|---|
| Headline | How much more are you paying than a year ago? |
| Lede (new / average) | Prices overall rose 3.4% in the year to July 2026. How much that costs you depends on how you live. Answer four questions to see your estimate. |
| Lede (returning, folded) | Updated with July 2026 prices. |
| Skip link | Just want the national numbers? |
| Panel title | The average U.S. household vs. July 2025 / Your costs vs. July 2025 |
| Answer | About $1,450 more a year / About $120 less a year / About the same as a year ago |
| Rates line | Prices overall rose 3.4%. / Your costs rose 2.9%. Prices overall rose 3.4%. |
| Verdict | More than the national rate, mainly because of gas prices. / Less than the national rate, mainly because of your fixed mortgage payment. / Less than the national rate. / About the same as the national rate. |
| Basis | Based on 1 answer and 3 guesses. / Based on 4 guesses. / Based on your answers. (+ "Monthly amounts are starting estimates." until any amount is edited) |
| Mortgage explanation | A fixed-rate payment stays the same from year to year, so it adds nothing here. The official inflation rate leaves mortgage payments out too. Home insurance and repairs still go up. |
| Electric car explanation | Most people charge at home, so we use the change in home electricity prices. |
| Health insurance explanation | Use the increase from your renewal notice. The government's health insurance index measures insurance company earnings instead of premiums, so we don't use it. |
| Empty renewal prompt (panel row) | Health insurance: add your renewal increase / Home insurance: add your renewal increase |
| Zero total | Enter your monthly amounts to see your estimate. |
| Undo toast | Answers cleared. [Undo] |

## Numbers

- **Rates:** one decimal with a sign: `+24.6%`, `−4.5%` (U+2212 minus); a fixed mortgage shows `0%`.
- **Dollars:** the total rounds to the nearest **$50**: "About $2,350 more a year", "About $120 less a year", or "About the same as a year ago" when it rounds to $0. Lines round to **$10** with largest-remainder allocation so they **sum exactly to the rounded total** (mixed signs supported); line text `+$150` / `−$40`; a line whose unrounded amount is between −$5 and $5 but not zero shows "under $10". Summary monthly totals round to $50.
- **Bars** start at zero and extend right for increases and left for decreases.
- **Inputs:** whole dollars a month, clamped 0–100,000; renewal increases one decimal, clamped −50 to 100; non-numeric counts as 0.
- **Dates:** "July 2026", "vs. July 2025", always from the payload's `referenceMonth`.

## The "Your costs" tab

### States

| State | When | Questions | Panel | Dock (phones, two lines) |
|---|---|---|---|---|
| **Average** | First visit; after Start over | Nothing selected | Title, answer, rates line, lines list, **Answer the questions**. No bars, verdict or basis | "Average U.S. household" / answer |
| **Personal** | After any answer **or** checkbox | Answered = selected; unanswered = guessed common answer | Everything, including bars, verdict, basis | "Your costs" / answer |
| **Returning** | Load with saved answers | Unboxed summary: "Rent, gas car, natural gas heat, health insurance through work. Paying for daycare. About $3,950 a month." + "Saved in this browser only." + **Change answers** + **Start over** | as Personal | as Personal |

- Common answers used as guesses: rent, gas car, natural gas heat, health insurance through work.
- "Answered" means the person tapped an option in that question. Checkboxes never count as answers or guesses (unchecked = not paying).
- **Amounts in Average** are read-only under "See the monthly amounts" (the average household's shares × $5,750). Editing starts in Personal.
- The page never folds while someone is answering; folding happens only on load.
- **Saved data** (`inflation-reality:answers:v1`): answered choices, checkboxes, amount edits keyed by line id, renewal rates. Unknown ids or options are ignored individually; unparseable JSON or another version is discarded.

### Order

- **Phone:** headline, lede, skip link → questions → result panel → "Adjust monthly amounts" (collapsed). The dock hides while the panel is on screen; **See details** scrolls to it. `scroll-padding-bottom` keeps focused controls clear of the dock.
- **Desktop (≥ 900px):** questions and amounts on the left; panel sticky on the right.

### Result panel

Title → answer → rates line → your-costs vs. national bars (one shared grid) → verdict → basis → "Where the extra money goes": rows sorted by absolute dollars (label with optional note: "Fixed payment", "Average for employer plans, change to yours", "Estimate"; rate; dollars; bar); the top **6** rows **excluding Everything else**; then "N smaller items" with their sum; then **Everything else, always last, secondary ink, "Estimated from the national rate"**; empty-renewal prompt rows (their buttons open "Adjust monthly amounts" and focus that input) → **Change answers** (or **Answer the questions**) and "Show all N items" (N counts every row, including Everything else) → fine print: "Estimates based on BLS consumer price data for July 2026. Dollar amounts are rounded." plus stale or `yoyGap` notes.

A zero total (all amounts 0) replaces the answer with "Enter your monthly amounts to see your estimate." and hides bars, verdict and lines.

### Other tabs

Routes: Your costs = no hash (`/inflation-reality/`); `#national-numbers`, `#price-check`, `#sources`. Section links change the hash (normal history entries); `hashchange` renders the tab; an unknown hash renders Your costs; in-page jumps use `scrollIntoView`, never a hash.

- **National numbers:** headline and core with month-over-month and annualized, the 12-month headline trend (no personal line), other official measures, gap/stale notes, a reserved spot for the country comparison.
- **Price check:** average-price table, EIA weekly fuel, Biggest Movers (fixing its color-index bug).
- **Sources:** how the estimate is worked out (plain-words formula, fixed mortgage, the rolled weights and residual, proxies named), every series with a FRED or BLS link, caveats, the .xlsx download.
- **Chart rules:** Recharts styled from tokens only; text `--ink-2`, gridlines `--rule`; one series `--accent`; comparisons `--accent` vs `--bar-us`; the other-official-measures bars use one neutral hue with direct value labels; direction by sign and label, not red/green; tooltips on `--surface` with a `--rule` border.

## Calculation model

For each line: monthly amount `m`, 12-month change `r` (fraction).

```
annual  = 12 × m
yearAgo = annual / (1 + r)
extra   = annual − yearAgo                 # negative when prices fell
yourRate   = Σ annual / Σ yearAgo − 1
totalExtra = Σ extra
```

- **Fixed-rate mortgage:** `r = 0` ([BLS OER factsheet](https://www.bls.gov/cpi/factsheets/owners-equivalent-rent-and-rent.htm): mortgage interest is "not treated as consumption").
- **Insurance:** `r` = the person's renewal increase (defaults in Decisions). An empty renewal input keeps that line off the total and shows a prompt row.
- **Charging the car** uses the Electricity line's rate. **Heating included in my rent** adds no heating line.

### Verdict rule

Let `P` = your rate and `R` = the headline, both at display precision (one decimal), `d = P − R`.
- `|d| ≤ 0.2` → "About the same as the national rate."
- Otherwise for each line except Everything else, `c_i = (yearAgo_i / Σ yearAgo) × (r_i − R)`. The reason line is the one with the largest `c_i` in the direction of `d` (largest positive when `d > 0`, most negative when `d < 0`). If none has that sign, or its `|c_i| < 0.4 × |d|`, say "More than the national rate." / "Less than the national rate." with no reason. Otherwise append ", mainly because of {because phrase}." Each line has a `because` phrase in `config.js` ("gas prices", "rent", "car insurance", "your fixed mortgage payment", …).

### Line → series map

Verified 2026-09-10 (FRED series pages) and 2026-09-14 (BLS API, data through August 2026).

| Line | Shown when | Series (U.S. city average, NSA) | Source |
|---|---|---|---|
| Rent | home = rent | `CUUR0000SEHA` Rent of primary residence | FRED |
| Mortgage payment | home = mortgage | 0% by definition, note "Fixed payment" | — |
| Home insurance | mortgage / owned | renewal increase only (starts empty) | — |
| Home repairs | mortgage / owned | `CUUR0000SAH3` Household furnishings and operations, note "Estimate" (`SEHP`, `SEHP01`, `SEHP04` stopped in 2024) | FRED |
| Groceries | always | `CUUR0000SAF11` | FRED |
| Eating out | always | `CUUR0000SEFV` | FRED |
| Gas for the car | car = gas or hybrid | `CUUR0000SETB01`, hint "Drive less or work from home? Lower this." | FRED |
| Charging the car | car = electric | Electricity line's rate | — |
| Car insurance | car ≠ none | `CUUR0000SETE` | **BLS** |
| Car repairs | car ≠ none | `CUUR0000SETD` | FRED |
| Bus and train fares | car = none | `CUUR0000SETG02` Intracity transportation | **BLS** |
| Electricity | always | `CUUR0000SEHF01` | FRED |
| Natural gas bill | heat = natural gas | `CUUR0000SEHF02` | FRED |
| Heating oil | heat = heating oil | `CUUR0000SEHE01` | **BLS** |
| Daycare | also: daycare | `CUUR0000SEEB03` | **BLS** |
| College tuition | also: college tuition | `CUUR0000SEEB01` | **BLS** |
| Health insurance | health ≠ none | renewal increase (default per Decisions) | — |
| Doctor and pharmacy | always | `CUUR0000SEMC01` Physicians' services (RI 1.684) + `CUUR0000SEMF01` Prescription drugs (RI 0.973), combined with rolled weights | **BLS** |
| Clothing | always | `CPIAPPNS` | FRED |
| Entertainment | always | `CPIRECNS` | FRED |
| Everything else | always | basket residual | derived |

Default amount nudges: hybrid → gas × 0.55; electric heat → electricity + $80; buying your own health insurance → $650 default premium.

### Rolled weights

BLS relative importance (RI) is published for December; a component's share in a later month `t` is its December weight moved by its own price change relative to all items ([BLS relative importance](https://www.bls.gov/cpi/tables/relative-importance/home.htm)):

```
w_i(t) = w_i(Dec) × (I_i,t / I_i,Dec) ÷ (I_all,t / I_all,Dec)
```

Combining 12-month changes with current-month shares, `1/(1+R) = Σ s_i/(1+r_i)`, is exact for a fixed basket and approximate when the window crosses January's weight update (Sources says so). Using December weights without rolling them forward was off by 0.7 points for Everything else in August 2026 data (gasoline's share moved from 2.90 to 3.85).

### Average household

Visible lines, December 2025 RI ([BLS, 2024 weights](https://www.bls.gov/cpi/tables/relative-importance/2025.htm)):

| Line | Series | RI Dec 2025 |
|---|---|---|
| Housing | `CUUR0000SAH1` Shelter | 35.625 |
| Groceries | `CUUR0000SAF11` | 8.325 |
| Eating out | `CUUR0000SEFV` | 5.373 |
| Home energy | `CUUR0000SAH21` Household energy | 3.402 |
| Gas for the car | `CUUR0000SETB01` | 2.895 |
| Health care | `CPIMEDNS` Medical care | 8.423 |
| Clothing | `CPIAPPNS` Apparel | 2.368 |
| Entertainment | `CPIRECNS` Recreation | 5.137 |
| **Everything else** | residual | 28.452 in Dec 2025 |

- Weights are rolled to the reference month; Everything else's weight is `100 − Σ visible(t)` (≥ 10, tested) and its rate is solved so the basket reproduces the headline: `1+r_rest = s_rest ÷ (1/(1+R) − Σ s_i/(1+r_i))`.
- If `r_rest` is more than **3 points** from the headline, the build logs a warning. No user-facing note.
- The personal Everything else line uses the same rate (an approximation; Sources says so).
- Average monthly spending: BLS Consumer Expenditure Survey 2024, $78,535 minus $9,797 personal insurance and pensions = $68,738 a year, **$5,750 a month** ([BLS CE 2024](https://www.bls.gov/news.release/cesan.nr0.htm)). Always "average", never "typical". Average line amounts = shares(t) × $5,750.
- RI and CE figures are updated once a year (BACKLOG reminder).

### Starting amounts

Defaults come from the answers (illustrative values marked as such in `config.js`, refined from Consumer Expenditure tenure tables in Phase 2 where they exist). **Amounts may be illustrative because people see and edit them; rates never are.**

## Data pipeline (Phase 1)

1. **Catalog:** `CALC_LINES` (`{ id, label, seriesId, source }`), `CALC_COMBOS` (doctor and pharmacy parts with RI), `BASKET` (visible lines with RI, RI year and URL, CE monthly mean and URL). `allSeries()` stays **FRED-only** and adds the FRED-sourced calculator and basket series; a new `blsSeries()` lists BLS ids. `CATEGORIES` stays until Phase 2 removes its last reader.
2. **BLS parsing** (`scripts/bls.mjs`): `blsRequestBody(ids, { startYear, endYear, registrationKey })`; `parseBlsResponse(json, ids)` returns raw FRED-shaped rows (`{ date: "YYYY-MM-01", value: "123.456" }`, `"-"` → `"."`, oldest first, `M13` dropped). A status other than `REQUEST_SUCCEEDED` (or HTTP 429 / non-2xx) fails the whole request; a requested series with no rows is reported missing and counted in N/M.
3. **Anchoring:** `lines` and `basket` are **always** computed at the reference month (`refDate`). A series with no value for that month or its year-ago is stale.
4. **Precision:** `lines[id].yoy`, `basket.weights`, `basket.rates`, `basket.residualYoy`, `basket.headlineYoy` are stored to **6 decimals**; display rounds.
5. **Fallback order:** the currently deployed `cpi.json` (fetched at build) layered over `src/data/fallback.json`. Phase 1 finishes by refreshing `fallback.json` from production so it contains `lines` and `basket`, with a test that every calculator id is present.
6. **Warnings and gate:** `::warning::` annotations for a failed or missing BLS request, missing series, stale calculator lines, a stale basket, and the 3-point residual gap. **After deploy, `scripts/check-lines.mjs` exits 1 if any BLS line is stale**, so the run goes red and GitHub emails. The headline/core guard is unchanged.
7. **Secrets:** `BLS_API_KEY` set 2026-09-14 (`gh secret list`); **renew by 2027-09-14**. `startyear` = the earlier of (current year − 2) and `BASKET.riYear` (so the December weights month is always fetched), `endyear` = current year.

## Front-end architecture (Phase 2)

```
index.html                     fonts <link>; title, description, Open Graph + Twitter meta
public/og-image.png            1200×630 share image: headline + site name, no numbers
src/
  App.jsx                      data loading (cpi.json → fallback), hash routing, shell only
  styles/tokens.css            Visual system tokens, light + dark
  styles/controls.css          buttons, guessed state, checkboxes, section links, inputs, focus, reduced motion
  calculator/model.js          pure: activeLines, defaultAmount, computeResult, allocateRounded, verdict, basis, averageLines
  calculator/config.js         questions, also-paying-for, summary phrases, because phrases, explanations, common answers
  calculator/storage.js        versioned localStorage; pure parseSaved()
  components/                  SectionNav, Questions, Summary, ResultPanel, Amounts, Dock, Toast, Note, Explain
  views/                       YourCosts, NationalNumbers, PriceCheck, Sources
  data/                        catalog.js, merge.js (extended for lines + basket)
```

- **Loading:** render immediately from bundled `fallback.json`, swap in `cpi.json` when it arrives; no skeletons. Fine print shows the price month.
- **Fonts:** `display=swap`; no fixed text heights, so the Arial fallback reflows cleanly.
- **Link previews:** `<title>` "Inflation Reality"; `og:site_name` "Inflation Reality"; `og:title` "How much more are you paying than a year ago?"; `og:description` "See how much prices rose for a household like yours, in dollars, using government price data."; `og:url` `https://derektm17.github.io/inflation-reality/`; `og:image` `https://derektm17.github.io/inflation-reality/og-image.png` (absolute) with `og:image:width` 1200, `og:image:height` 630, `og:image:alt`; `twitter:card` `summary_large_image`.
- The .xlsx export moves to Sources; its personal sheet writes the panel's lines.

## Error handling

| Case | Behavior |
|---|---|
| A line's series fell back | Row keeps its last known rate; fine print: "Using the last known value for car insurance." |
| `yoyGap` present | Note in the fine print (rewritten to the Voice guide) |
| BLS key missing, expired or over quota | Build deploys with last known values, warns, then the check step turns the run red |
| Residual more than 3 points from headline | Build warning only |
| localStorage blocked | Works; "Saved in this browser only." hidden |
| Saved data unparseable or other version | Discarded; start in Average |
| Saved data with unknown ids | Those entries ignored; the rest restored |
| Invalid input | Clamped per *Numbers* |
| Empty renewal input | Line off the total; prompt row in the panel |
| Zero total | "Enter your monthly amounts to see your estimate." |

## Accessibility

Questions: buttons with `aria-pressed` in `fieldset`/`legend`; guessed answers stay `aria-pressed="false"` with visible "our guess". Native checkboxes. Section links with `aria-current="page"`. A **persistent** visually hidden `aria-live="polite"` region outside the panel announces the title, answer and verdict when they change, **debounced 1 second** so typing an amount doesn't flood it. The Undo toast is `role="status"` and its 8-second timer **pauses on hover and focus**. `:focus-visible` rings in `--accent`; targets ≥ 44px; reduced motion respected; contrast per rule 7.

## Testing

- **Phase 1 unit tests (`node --test`, no new deps):** catalog manifest (ids unique, sources valid, `allSeries()` FRED-only, BLS ids in `blsSeries()`, basket rest ≥ 10); `parseBlsResponse` (sorting, `M13`, `"-"` → `"."`, failure statuses, missing series); `rolledWeights`, `combineRates`, `residualRate` (hand-computed cases, exact headline reproduction); assemble `lines`/`basket` (anchoring at `refDate`, stale fallback precedence, `yoyGap`, combo); `staleBlsLines`, `calculatorWarnings`; fallback contains every calculator id.
- **Phase 1 production check:** the first deploy logs N/M across FRED and BLS with no calculator warnings; live `cpi.json` has every `lines` id (not stale) and `basket.residualYoy`; the check step is green.
- **Phase 2 unit tests:** `model.js` (formula, negatives, verdict rule, basis wording, `allocateRounded` sums exactly with mixed signs and "under $10"), `storage.parseSaved`, token contrast (rule 7), merge.
- **Phase 2 audit** — `scripts/audit/ui-audit.py`, run locally before merge (Python Playwright is installed on the owner's machine, not in CI): `npm run build && npx vite preview --base /inflation-reality/`, a committed fixture `scripts/audit/fixture-cpi.json` served in place of live data, Google Fonts requests stubbed, and a fake clock for the toast. It runs the flows (Average first screen; mortgage answer → `0%` line, explanation, guesses, basis; daycare checkbox; a negative line renders `−$`; lines + smaller items + Everything else sum to the total; reload → summary; Start over → Undo; each hash route; no horizontal scroll at 390px; zero console errors) and the Design-rule checks 1, 2, 4 (automatable parts), 5, 8 across every rendered element.
- **Owner, before Phase 2 merge:** the 5-second test.

## Rollout

- **Phase 1 — pipeline** (plan written): ships to `main`; invisible to today's UI (its shape check reads only `trend` and `categories`).
- **Phase 2a — shell and Your costs:** tokens, section nav and routing, the calculator, saved answers; branch `redesign/calculator-first`.
- **Phase 2b — other tabs, export, audit:** National numbers, Price check, Sources, .xlsx, the audit script, link previews; merge gate: unit tests, audit, 5-second test, production data live.

## Out of scope

International comparison tab; a personal inflation history line; share links or answers in the URL; commodity prices, Case-Shiller, ZORI; renaming the site; timestamps on saved renewal rates.

## Verified facts (2026-09-14)

| Fact | Value | Source |
|---|---|---|
| RI Dec 2025 (visible basket, doctor parts) | as tables above | https://www.bls.gov/cpi/tables/relative-importance/2025.htm |
| CE 2024 average annual expenditures / personal insurance and pensions | $78,535 / $9,797 | https://www.bls.gov/news.release/cesan.nr0.htm |
| KFF 2025 employer family premium increase | 6% | https://www.kff.org/health-costs/2025-employer-health-benefits-survey/ |
| BLS v2 limits and fields | `startyear`, `endyear`, `registrationkey`; 50 series, 20 years, 500/day; keys renew yearly | https://www.bls.gov/developers/api_signature_v2.htm, https://www.bls.gov/developers/api_faqs.htm |
| BLS response shape | `year`, `period`, `periodName`, `latest`, `value`, `footnotes`; newest first; `M13` only with `annualaverage`; Oct 2025 `"-"` | live request |
| BLS-only series live through Aug 2026 | `SETE`, `SETG02`, `SEHE01`, `SEEB01`, `SEEB03`, `SEMC01`, `SEMF01` | BLS API |
| SEHD scope | tenants' and household contents only | https://www.bls.gov/cpi/factsheets/tenants-household-insurance.htm |
