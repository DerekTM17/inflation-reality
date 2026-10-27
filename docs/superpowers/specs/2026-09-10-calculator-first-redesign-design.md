# Calculator-First Redesign — Design

**Date:** 2026-09-10, revised 2026-09-14 (twice), 2026-10-16
**Project:** inflation-reality
**Status:** Revision 4 approved by the owner 2026-10-17. Revision 2 folds in the owner's picks (toned-down direction, no profiles); revision 3 folds in a second independent review (basket math, BLS parsing, negatives, fallback, verdict rule, audit details). **Revision 5 (2026-10-27)** follows a failed 5-second test: the Average state's strip says whose number it is; see *Revision 5*. **Revision 4 (2026-10-16)** follows the owner's 5-second test of Phase 2b ("too gray"): the Bolder look, quick-start households back, a compact layout, cards that fold on phones, and hover detail everywhere. See *Revision 4* below; where it conflicts with an earlier section, revision 4 wins. Phase 1 plan: `docs/superpowers/plans/2026-09-14-calculator-phase1-pipeline.md`.
**Revision 4 mockups (approved):** spending mix https://claude.ai/artifact/K1bqKshUY117QCUU6Em7Ng, Your costs https://claude.ai/artifact/JVd3KnL8NVPBN4PFBMwfyP, National numbers https://claude.ai/artifact/9EDzFvkHYt6EyXfBuXL1n5; copies in `docs/superpowers/mockups/2026-10-02-color-study-*.html`. Use the **Bolder** treatment in each. The mockups take the look, layout and interactions from these; behavior (states, guesses, renewal inputs, rounding, saving) comes from this spec.
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
| Spending input | **Monthly dollar amounts**, pre-filled from the person's answers. No percentage sliders. **Rev 4:** always open (no "Adjust monthly amounts" disclosure), grouped into family cards, each amount a dollar box plus a dollar slider |
| Profiles | **Rev 4: back as quick starts** (Young renter, Family with kids, Commuter, Retiree). Revision 2 dropped them because they pushed the result down; the compact layout fixes that. See *Quick starts* |
| Questions | **Your home** (rent / mortgage, fixed rate / own it outright), **Getting around** (gas car / hybrid / electric car / no car), **Home heating** (electric / natural gas / heating oil / included in my rent), **Health insurance** (through work / I buy my own / I don't pay a premium). Plus **Also paying for** checkboxes: daycare, college tuition. Commuting is a hint on the gas amount, not a question |
| Insurance rates | Health and home insurance use **the increase on the person's own renewal notice**. Health "through work" starts at the KFF 2025 average employer family premium increase (**6%**), labeled "Average for employer plans, change to yours". Health "I buy my own" and home insurance **start empty** (marketplace premiums moved very differently in 2026, and the BLS insurance index covers contents only, not the home). The CPI health insurance index is **never used as the person's health insurance rate** (it measures insurer retained earnings: +28.2% Sep 2022, −37.3% Sep 2023) |
| Layout | **Rev 4:** a sticky result strip at the top on every width, quick starts and questions under it, then the amounts as family cards (two columns on desktop, folding cards on phones). The phone dock goes away. See *Revision 4 layout* |
| Result | A plain **result panel**: title, the answer as a sentence, your rate vs. the national rate, one verdict sentence, how much is guessed, and "Where the extra money goes". **No receipt metaphor** |
| First visit | Opens with **the average U.S. household**, nothing selected. "Just want the national numbers?" links to that tab |
| Guesses | After any answer or checkbox, unanswered questions show common answers **as guesses** (dashed, "our guess"), and the panel says how many answers are guesses |
| Changing answers | Nothing locks; everything updates live. "Change answers" jumps back to the questions |
| Remembering | Saved **in this browser only**; returning visitors see "Updated with July 2026 prices.", a summary of their answers, and their result. "Start over" clears it, with **Undo** |
| Tabs | **Your costs**, **National numbers**, **Price check**, **Sources**. The glossary becomes one-sentence explanations where terms appear |
| Visual direction | ~~Toned down~~ **Rev 4: Bolder**: one type family and flat bordered controls stay; color by kind of spending (and by publisher on National numbers), tinted cards, thicker bars, hover detail cards, and motion that respects reduced-motion settings |

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
- **Rev 4:** with the Commuter quick start, the end of the amounts is within **1,500px** of the page top at 1280px, and within **2,000px** at 390px with every card folded (mockup: 1,347px and 1,828px with one card open).
- **Rev 4:** every target in the *Hover detail cards* table shows its card on hover and, at 600px and wider, on keyboard focus. Mix slices reach keyboard users through the legend.

## Revision 4 — Bolder look, quick starts, compact layout (2026-10-16)

### What the owner decided

- **Bolder treatment** (2026-10-02): color by kind of spending on Your costs and Price check, and by publisher on National numbers; tinted cards and rows, thicker bars, a shaded area under the trend line; hover cards, a chart crosshair that arrow keys can move, bars grow in, the line draws in, numbers count up. **Color never means good or bad.** Rises and falls are shown by sign and by which side of zero a bar sits.
- **Quick-start households come back** (2026-10-02).
- **Less scrolling** (2026-10-02): the compact layout below. Amounts are dollars, never percentage shares; the spending mix bar shows the shares.
- **Cards fold on phones** (2026-10-16).
- **Hover** (2026-10-16): the spending-mix mockup's hover cards plus the line-chart crosshair and row cards from the other two mockups cover it.

### Families

Every calculator line belongs to one family. Families always appear in this fixed order (never re-sorted by size, so cards don't jump while someone drags a slider):

| Family | Lines (`config.js` ids) | Light | Dark |
|---|---|---|---|
| Home | rent, mortgage, homeIns, upkeep | `#2F6DB5` | `#4C8BD6` |
| Getting around | gasoline, charging, carIns, carUpkeep, transit | `#D2602E` | `#DE6A35` |
| Food | groceries, dining | `#1A9473` | `#2AAA85` |
| Utilities | electric, heatGas, heatOil | `#C48A12` | `#B98312` |
| Clothing and fun | clothing, fun | `#C9638C` | `#CB668F` |
| Health | health, doctor | `#3E7D2E` | `#5C9A45` |
| Kids and school | daycare, tuition | `#5A4AA8` | `#9085E9` |
| Everything else | rest | `#87919A` | `#7A858F` |

- **Average rows use basket ids** (`BASKET.visible` in `catalog.js`), so they get their own mapping: `housing` → Home, `gasoline` → Getting around, `groceries` and `dining` → Food, `energy` → Utilities, `clothing` and `fun` → Clothing and fun, `health` (all medical care, not insurance) → Health, `rest` → Everything else. Each basket row gets its own `about` text; never look up a line's `about` by a basket id.
- Add a `family` field to each line in `config.js` and a `FAMILIES` list (id, label, token) there. Tokens `--f-home`, `--f-around`, `--f-food`, `--f-util`, `--f-fun`, `--f-health`, `--f-kids`, `--f-rest` go in `tokens.css` (both dark blocks identical, per `tokens.test.mjs`).
- **Publishers** on National numbers reuse these colors through alias tokens: `--p-labor` = `--f-home` (Bureau of Labor Statistics measures), `--p-commerce` = `--f-food` (Core PCE), `--p-cleveland` = `--f-kids` (Median, Trimmed mean), `--p-atlanta` = `--f-util` (Sticky price), `--p-dallas` = `--f-fun` (Dallas trimmed-mean PCE).
- The palette passed the dataviz validator (lightness, chroma, color-blind separation). The original site's palette failed it; don't go back to it.
- **Family colors are for marks only** (dots, bars, slider fills, tints, slices), never for text. Every mark has a text label next to it.
- **Text inside tinted cards and rows uses `--ink` and `--ink-2` only, never `--ink-3`** (`--ink-3` drops to about 3.8:1 on a 13% tint; `--ink-2` stays above 4.7:1).
- **Contrast (token test):** each family color ≥ 3:1 against `--surface` and `--ground` in both themes, except light-mode Utilities (2.74:1 on `--ground`) and Everything else (2.93:1), allowed down to 2.7:1. The test also **composites each family's 13% tint over `--ground`** and checks `--ink` and `--ink-2` ≥ 4.5:1 on it, and the family mark ≥ 2.4:1 on it (light Utilities measures 2.43). The low mark floors are accepted because the labels carry the meaning. The test's pair list takes an optional minimum ratio as a third element; its token-count assert grows with the new tokens.
- **New token `--track`** (unfilled slider track): light `#E4E9E7`, dark `#2C343B`.
- **Tints:** cards use the family color at 6% over the ground (`color-mix(in srgb, var(--f-x) 6%, transparent)`), a hovered row 13%, a highlighted card 11% plus a 1.5px inset ring at 55%. Tinted cards have **no border** (they are not raised surfaces).

### Revision 4 layout (Your costs)

Top to bottom:

1. **Headline and lede** (unchanged copy).
2. **Result strip** (`.strip`), `position: sticky; top: env(safe-area-inset-top, 0px)`, the view's one raised surface (bordered, 10px radius). Under 900px the verdict, mix bar and legend render in an unbordered sibling (`.strip-more`) right after `.strip`, because a sticky element only sticks inside its parent; at 900px and wider they sit inside `.strip`. `scroll-padding-top` is set from the strip's measured height (a ResizeObserver writes a CSS variable), and the old 110px `scroll-padding-bottom` for the dock is removed. The strip's only button is **Answer the questions** in the Average state (scrolls to the questions); **Change answers** lives in the Summary.
   - **Widths:** desktop is ≥ 900px; 600 to 899px uses the phone strip with cards open (the `columns: 2 380px` rule gives one or two columns by width); phones are < 600px.
   - **Desktop (≥ 900px):** two columns. Left: panel title, the answer sentence (it counts to its new value over 350ms), the rates line, the Your costs and National (or Outside housing) bars, the verdict. Right: the **spending mix bar** (22px, one slice per family with spending, in family order) and its legend ("Home 41%"); shares are whole percentages that add to 100 (largest remainder).
   - **Phone:** only title, answer and the two bars are sticky. The verdict, mix bar and legend sit right under the strip and scroll away, so the sticky part stays short.
   - Average state: title, answer and rates line, plus the mix bar for the average household (families mapped from basket rows); no bars or verdict (as before).
3. **Basis** line ("Based on 1 answer and 3 guesses.") right under the strip.
4. **Quick starts:** "Start from a household like yours" and four buttons. Shown in every state.
5. **Questions**, two columns of fieldsets on desktop. After a quick start or on a returning load they fold into the existing **Summary** (comma-joined, no `·`) with **Change answers** and **Start over**.
6. **Your monthly amounts:** family cards, two CSS columns on desktop (`columns: 2 380px`), one column on phones.
   - **Card heading:** dot, family name, and the family's yearly change ("+$930 a year"), which is the sum of its rounded lines, so cards add up to the total.
   - **Each amount is one tight row:** label, its rate ("+27.4%"), what it adds ("+$980 a year", the line's allocated dollars from `allocateRounded`), the dollar box, and a slider in the family color under it.
   - **Slider:** 0 to max(500, three times the line's starting amount rounded up to $100), step $10; it updates live on `input`. The box keeps its current commit behavior and clamps at 100,000; an amount above the slider's max pins the thumb at the end. Slider `aria-label` "{label}, dollars a month", `aria-valuetext` "$380 a month".
   - **Target sizes** (replaces "≥ 44px" for these controls only): the slider's hit area is 32px tall with a 22px thumb; the dollar box is at least 36px tall; fold buttons, quick starts, answer buttons and other buttons stay ≥ 44px. All meet WCAG 2.2's 24px minimum. Renewal lines (health insurance, home insurance) keep their percent box beside the dollar box; an empty one shows "Add your renewal increase" in place of the dollar change (this replaces the panel's prompt rows).
   - **Average state:** cards hold the basket rows. Each row shows label, rate, adds this year and the monthly amount **as text** (no box, no slider); headings show the family's yearly change, so the rows still add up to the answer. Under the cards: "Answer the questions or pick a household to change these." Editing starts in Personal, as before.
   - **Phones (< 600px): every card folds** to a full-width button showing dot, name, yearly change and a chevron icon (inline SVG, `aria-hidden`). It has `aria-expanded` and `aria-controls`. Cards start folded; which ones are open lasts for the visit and is not saved. A focused input inside a card keeps it open. A folded card with an empty renewal line shows "Add your renewal increase" on its heading.
   - **At 600px and wider** the heading is not a button: it is a `tabindex="0"` element that opens the family card on focus (`aria-describedby`).
7. **Fine print** (price month, rounding, stale and `yoyGap` notes) after the amounts.

**Removed by revision 4:** the "Where the extra money goes" list, "N smaller items", "Show all N items", the panel's renewal prompt rows (the cards now carry all of these), the "Adjust monthly amounts" disclosure, and the phone dock (the sticky strip does its job). "Everything else" stays last as its own card, labelled "Estimated from the national rate". The Undo toast, LiveRegion, saved answers and every state stay.

### Quick starts

| Button | Answers | Also paying for | Amount edits |
|---|---|---|---|
| Young renter | home `rent`, car `none`, heat `included`, health `work` | none | rent 1,450; groceries 380; dining 300; fun 180 |
| Family with kids | home `mortgage`, car `gas`, heat `gas`, health `work` | daycare | groceries 1,100; gasoline 280; dining 260 |
| Commuter | home `rent`, car `gas`, heat `electric`, health `work` | none | gasoline 380; carUpkeep 90 |
| Retiree | home `owned`, car `hybrid`, heat `gas`, health `none` ("I don't pay a premium") | none | doctor 220; groceries 520; gasoline 90 |

(Option ids as in `config.js`; the plan must confirm each before building.)

- Tapping one **replaces** all answers, checkboxes and amount edits (renewal rates are kept). All four questions count as **answered**, so nothing shows as a guess. Then the page enters Personal, folds the questions into the Summary, saves, and moves focus to the answer (`tabindex="-1"`). Lines without an edit use their normal starting amount.
- Because it replaces what the person entered, a quick start shows the Undo toast: "Filled in as {household}. [Undo]". Undo restores the answers, checkboxes and amounts from just before the tap.
- **Quick starts never show a selected state.** They are plain buttons, not toggles.

### Hover detail cards

One shared `HoverCard` component: fixed position, above the target (below when there's no room), clamped 16px inside the viewport, `--surface` fill, `--rule` border, the only element besides the toast with a shadow (`--shadow`). It names the family with a colored dot in its heading. Text is `--ink` / `--ink-2`.

- **Opens on:** mouse or pen hover; keyboard focus on the target **at 600px and wider** (on phones a fixed card would cover the on-screen keyboard); **tap** on the mix slices, legend items and chart points. Amount rows and card headings don't open a card on touch: a finger on a row is moving its slider, and a tap on a heading folds or unfolds it.
- **Closes on:** pointer leave, focus leaving, Escape, a tap elsewhere, or scrolling (an unpinned card; a moved mouse brings it back).
- **Content updates live** while its slider is dragged.
- `role="tooltip"`; the focused target gets `aria-describedby` pointing at it. Everything in a card is also available elsewhere (row text, Sources), so the card is extra help, not the only path.

| Target | Card shows |
|---|---|
| Amount row | label; "Price change since July 2025" with the rate; "You pay now" "$380 a month, $4,560 a year"; "Adds this year" "+$980" (the row's allocated dollars, matching the row); "Same things a year ago" = the yearly amount minus that figure; one plain line on what the price covers (new `about` field per line in `config.js`) |
| Card heading, mix slice, legend item | family name; "Share of your spending"; "You pay now" per month; "Price change" (the family's combined rate; never "Prices overall", which names the headline); "Adds this year" (sum of its rows); "Biggest mover: Gas for the car, +$980 a year" when the family has more than one line. Shares count only lines in the result (an empty renewal line is left out) |
| Your costs bar | your rate; "Each amount's price change, weighted by what you spend on it." |
| National / Outside housing bar | the rate and the existing yardstick sentence |
| Trend chart point | month and the 12-month change; a missing month says "Not published" |
| Other official measures row | name, publisher, the measure's blurb, its value, and "0.5 points above prices overall" |
| Price check mover row | item, family, price now and a year ago with units, and the change |
| National numbers big number | how it is measured (the current `Stat` sentences) |

Hovering an amount row or card also **links the highlights**: its card gets the highlight tint and ring, its slice in the mix bar grows to 130% height while other slices fade to 30%, and its legend item turns `--ink` and bold while other legend items fade to 45%. Pointing at a slice or legend item highlights its card the same way.

### Charts and the other tabs

- **Trend chart (National numbers):** built as a Recharts `ComposedChart` (Area plus Line; Recharts 2.15.4 is installed), with `accessibilityLayer` for the arrow keys. Remove `aria-hidden="true"` from the chart wrapper (`TrendChart.jsx`), since a focusable chart can't sit inside it; the visually hidden table stays as the full text version. Recharts starts its keyboard index at the oldest point, so on focus set the active index to the latest month. Pass `isAnimationActive={!reducedMotion}` (Recharts ignores the media query). Line in `--accent` with a shaded area under it at 12%; the line draws in over 900ms on first view; an end label on the latest point; a **crosshair with a dot** that follows the pointer, and **ArrowLeft / ArrowRight** step month by month once the chart has focus (the chart is one tab stop, showing the latest month on focus). The visually hidden table stays. Fix the uneven y-axis ticks (0/2/5%) to evenly spaced ones.
- **Big numbers (National numbers):** "Prices overall" in `--accent`, "Prices other than food and energy" in `--p-labor`; 6% tinted cards (8px radius on all corners; the mockup's 7% and square-bottom corners are not used) with a 3px top rule in their color; the number counts up over 900ms; a filled 12-month sparkline on the overall card; "pace" bars comparing the past year with this month's annualized pace (dashed outline for the pace bar).
- **Other official measures:** rows tinted in their publisher color, 12px bars that grow from zero, a dashed reference line "Prices overall +3.4%", and publisher chips that toggle (`aria-pressed`) a highlight on that publisher's rows on click or tap, fading the others to 35%. The blurb moves into the row's hover card.
- **Price check, Biggest price changes:** bars and row dots in the item's family color, growing from a zero line (left for falls); row hover cards. Fix the fuel `.help` paragraphs that run together.
- **Sources:** no color changes beyond family dots on each series row.

### Motion

- Bars grow from zero (`scaleX`, 400ms, 45ms stagger), the trend line draws in (900ms), big numbers count up (900ms on load), the answer counts to each new value (350ms), a changed row's dollar figure flashes its family color (350ms), hover tints and cards fade in (120–150ms), folding cards turn their chevron (150ms).
- Motion only plays on first view of a tab and in response to the person's actions; nothing loops.
- **The page is complete at rest:** every number and bar is readable in its final state if no animation runs. Under `prefers-reduced-motion: reduce`, all of it is off: values appear at once, bars at full length, no flash, no slice growth, no card movement.

### Copy for revision 4

- "a year" and "a month", never "/yr" or "/mo".
- No `·`: the hover card writes "$380 a month, $4,560 a year"; the Summary joins with commas.
- Chevrons are SVG icons, not text glyphs, so the banned-string scan stays as it is.
- New strings: "Start from a household like yours", "Your monthly amounts", "Answer the questions or pick a household to change these.", "Add your renewal increase", "Biggest mover: {line}, {amount} a year", "Not published", "{n} points above prices overall" / "below", and the card labels in the table above.

### Audit and test changes

- **Design rule 5** becomes: one **bordered** raised surface per view (the result strip; the HoverCard and toast are fixed and exempt); tinted cards must stay borderless. Allowed radii add 3px (bars), 5px (slider tracks), and 50% for dots and slider thumbs. Where the mockups differ, the spec wins: chips use 6px (not 999px), tinted rows 6px (not 4px), slider tracks 5px (not 3px).
- **Design rule 6** becomes: `--accent` for selection, "you" and focus; family and publisher colors for kinds of spending and publishers; no color for up or down; semantic color only on stale or error notes, with text.
- The dark-mode "light background" check allows family-colored marks (`[data-family]` dots, bars, slices, slider fills).
- **Numbers are read with reduced motion emulated** (count-up tweens would otherwise be read mid-count against the fake clock); one separate pass with motion on checks that values settle to the same numbers and that there are no console errors.
- **Rewrite what the removals break:** `panel_sum_ok` and every `.line` selector re-point to the card rows (Average included); delete the Show all and renewal-prompt-row flows (replace the latter with "empty renewal box shows Add your renewal increase in its row and on the folded heading"); the sticky check moves from `.result-col` at 1280 to `.strip` at every width; drop the `.dock` exemption; at 390px the random-amounts fill opens the cards before typing.
- New audit flows: a quick start folds the questions and the Commuter page height meets the success criterion at both widths; hovering a row shows a card with its dollar figures; arrow keys move the trend crosshair; on 390px a card heading toggles `aria-expanded` and reveals its sliders; with reduced motion emulated, bars are at full width on first paint.
- Fold in the audit gaps from the Phase 2b reviews: check the Personal state in dark mode at 1280px; scan banned strings in the whole page, not only `main`; remove the dead cpi.json console filter.
- Token test: add the family tokens and their contrast rule above.
- **Code the plan must remove or rewrite:** `Dock.jsx`, the IntersectionObserver, `amountsOpen` and `openRenewal` in `YourCosts.jsx`; `ResultPanel.jsx` Show all and prompts; `panel.js` `TOP_ROWS`, `top`, `smaller`, `allCount`, `prompts` and their tests in `panel.test.mjs`; the `.dock` and `.prompts` CSS. **Keep** `model.main` and `model.rest` (the .xlsx personal sheet reads them, `workbook.js`), and the `--dock` / `--dock-ink` tokens (the toast uses them).
- **Folding:** once the questions fold (returning load or quick start) they stay folded for the visit, including after switching tabs, until **Change answers**.
- Unit tests: family assignment covers every line id and every `BASKET.visible` id; card totals sum to the rounded total; mix shares sum to 100; quick starts produce the listed answers and edits and count as answered.

### Plan decisions (2026-10-17)

Owner defaults settled while planning (`docs/superpowers/plans/2026-10-17-calculator-rev4-bolder.md`):

- **Average-state wording:** in the Average state the hover cards say "Share of spending" and "Average spending now", never "your" or "You pay now", so nobody reads the average household's numbers as their own.
- **Measure blurbs:** under 600px each Other official measures row shows its blurb as visible help text under the row (those rows open no card on a phone). At 600px and wider the blurb is in the row's hover card, plus visually hidden text in the row.
- **Big numbers:** the number text stays `--ink`. `--accent` and `--p-labor` color only the card's marks (top rule, tint, sparkline, pace bars), because family and publisher colors are for marks only.
- **Phone strip:** under 900px the rates line and the Average state's **Answer the questions** button go in `.strip-more` with the verdict and mix bar, so only the title, answer and bars stick.
- **Scrolling (deliberate exception to "Closes on … scrolling"):** a card whose target holds keyboard focus stays open on scroll and follows its target. Focusing an off-screen row scrolls the page, and closing its card then would hide every keyboard-opened card.

### Rollout for revision 4

Built on `redesign/phase2b` on top of Phase 2b. Merge gate unchanged: unit tests, audit, the owner's 5-second test, production data live. Merge and push only on the owner's word.

## Revision 5 — Say whose number it is (2026-10-27)

**Why.** The owner's 5-second test of revision 4 (2026-10-27) failed. All 5 testers answered "What does this page do?" correctly. None answered "Is that number yours?" correctly. They said "I don't know if it is me or not" and "No numbers look familiar to me". In a quick look, people read the big "About $2,250 more a year" and miss the small panel title "The average U.S. household vs. August 2025". Nobody noticed that answering the questions gives their own number. The owner picked "option 3, layout B" from the mockup https://claude.ai/artifact/9CCZbYqNX1DgyN2FLo74Bp, which has "average" inside the big answer and a pointer to the questions right under it. Where this section conflicts with an earlier one, revision 5 wins.

**Scope.** This changes only the Average state of the Your costs result strip, at every width. The Personal state, the cards, the quick starts and the other tabs do not change.

### Average state of the result strip

Top to bottom inside `.strip-main`:

1. **Panel title:** "Compared with {month a year earlier}", for example "Compared with August 2025". It replaces "The average U.S. household vs. August 2025", so "average household" is not said twice. The Personal title stays "Your costs vs. August 2025".
2. **Answer** (`p.answer#answer`, still the focus target and still one element, so a screen reader reads one sentence). It has two lines:
   - **Lead-in** (`span.answer-lead`, display block): "The average U.S. household pays". Weight 800, `font-size: clamp(17px, 4.6vw, 22px)`, line-height 1.15. It sits directly above the amount with no gap beyond the line-height.
   - **Amount**, same size as today: "about $2,250 more a year" / "about $120 less a year" / "about the same as a year ago". The first word is lowercase because it continues the lead-in. The count-up (CountUp, 350ms) formats with this lowercase Average variant.
   - The lead-in shows only when the strip shows a dollar answer. With no data ("Average household figures are not available right now." or "Price data is not available right now."), the answer is that sentence alone, with no lead-in and no pointer.
3. **Pointer:** a button styled as a text link (accent color, weight 700, underlined, no border or fill, min-height 44px), placed right after the answer, reading "That's the average. Answer four questions to see yours." It does what **Answer the questions** did: it scrolls to the questions and focuses the first one. On phones it is inside the sticky part of the strip, taking the place the bars hold in the Personal state. On desktop it sits in the left column under the answer.
4. The rates line, the mix bar and the legend stay where they are (under the strip on phones, inside it on desktop).

**Removed:** the **Answer the questions** button in the Average state (in `.strip-more` on phones and in the left column on desktop). The pointer replaces it. "Answer the questions or pick a household to change these." under the cards stays.

### Copy for revision 5

| Where | Copy |
|---|---|
| Panel title (Average) | Compared with August 2025 |
| Answer lead-in (Average) | The average U.S. household pays |
| Answer amount (Average) | about $2,250 more a year / about $120 less a year / about the same as a year ago |
| Pointer (Average) | That's the average. Answer four questions to see yours. |

The Personal strings ("Your costs vs. August 2025", "About $1,450 more a year" and the rest) do not change. The lead-in is part of the answer sentence. It is not one of the bold lead-ins the voice guide bans, which are labels in front of explanations. "four" matches the lede and the four questions in `QUESTIONS`.

### Checks for revision 5

- Unit tests (`panel.test.mjs`) cover the Average title, the lead-in, all three lowercase amount variants, and the no-data case having no lead-in or pointer. Existing tests that assert the old Average title or the capitalized Average answer are updated, not deleted. That includes any `.xlsx` sheet that copies the panel title.
- The audit still passes with the fixture and with `--real-fonts`. The page height stays within the limits (1,500px at 1280, 2,000px at 390 with the cards folded).
- **First screen:** at 390×844, light theme, the Average state, the whole of the answer, the pointer and the mix bar are visible without scrolling. Check with the real fonts and a screenshot.
- The audit's banned-string scan passes, and the pointer is reachable by keyboard with a visible focus ring.

### Rollout for revision 5

Built on `redesign/phase2b` as one change. The merge gate is a new 5-second test with 5 people who did not take part in the 2026-10-27 test, asking the same two questions, with the same pass mark of 4 of 5 answering both. Merge and push only on the owner's word. `docs/methodology-update` merges after `redesign/phase2b`.

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
- **Raised surface** (rev 4: see *Audit and test changes*; tinted family cards are borderless and allowed) = a bordered, filled, radiused box. One per view: the result panel. The returning summary is **not** boxed (plain section with a top `--rule`). Only the toast and (rev 4) the hover card have shadows; the dock is removed in rev 4.
- **Navigation:** the four sections are links (`<a href>`), the current one with `aria-current="page"` and a 3px `--ink` underline; the row wraps at phone width.
- **Motion:** replaced by revision 4's *Motion* section (still off under `prefers-reduced-motion`).

## Design rules (testable "not AI-looking" criteria)

Checked by the Playwright audit in *Testing* unless marked (review).

1. At most **two** type families (the design uses one); **no monospace** computed on any element. Series IDs render in the body font (never `<code>`).
2. **No all-caps or letter-spaced labels**: no computed `text-transform: uppercase`; no positive letter-spacing on text under 20px.
3. **No decorative metaphors**: receipts, tickets, torn or scalloped edges, dashed "cut" lines, highlighter marks. (review)
4. **No template chrome** in rendered text: no `·`, no `—`, no `→`, no emoji (`\p{Extended_Pictographic}` or U+FE0F), no eyebrow labels above headings, no single accented word in a heading (last two: review).
5. (Rev 4 rewrites this rule; see *Audit and test changes*.) **One raised surface per view** (definition above); radius by role only (controls 6px, panel 10px).
6. (Rev 4 rewrites this rule; see *Audit and test changes*.) **One accent color** for selection, "you" and focus; no red or green for up/down; semantic color only on stale or error notes, always with text.
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
| Rates line | Prices overall rose 3.4%. / Your costs rose 2.9%. Prices overall rose 3.4%. / (owners, 2026-10-01) Your costs rose 3.9%. Prices other than housing rose 3.6%. |
| Verdict | More than the national rate, mainly because of gas prices. / Less than the national rate, mainly because of your fixed mortgage payment. / Less than the national rate. / About the same as the national rate. Owners get the same sentences with "prices other than housing" in place of "the national rate". |
| Basis | Based on 1 answer and 3 guesses. / Based on 4 guesses. / Based on your answers. (+ "Monthly amounts are starting estimates." until any amount is edited) |
| Mortgage explanation | A fixed-rate payment stays the same from year to year, so it adds nothing here. The official inflation rate leaves mortgage payments out too. {local home costs} |
| Owner explanation (home = owned) | With no mortgage payment, your home costs here are repairs and insurance. {local home costs} |
| {local home costs} (2026-09-17) | Property taxes are left out because they depend on where you live, and home insurance counts only if you add your renewal increase. |
| {owner yardstick} (2026-10-01, after {local home costs} in both owner explanations) | We compare you with prices other than housing, because the national rate counts rent that owners don't pay. |
| Compare bar label | National / Outside housing (owners) |
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

(Rev 4: the Dock column no longer applies, and the Average "lines list" becomes the Average family cards.)

| State | When | Questions | Panel | Dock (phones, two lines) |
|---|---|---|---|---|
| **Average** | First visit; after Start over | Nothing selected | Title, answer, rates line, lines list, **Answer the questions**. No bars, verdict or basis | "Average U.S. household" / answer |
| **Personal** | After any answer **or** checkbox | Answered = selected; unanswered = guessed common answer | Everything, including bars, verdict, basis | "Your costs" / answer |
| **Returning** | Load with saved answers | Unboxed summary: "Rent, gas car, natural gas heat, health insurance through work. Paying for daycare. About $3,950 a month." + "Saved in this browser only." + **Change answers** + **Start over** | as Personal | as Personal |

- Common answers used as guesses: rent, gas car, natural gas heat, health insurance through work.
- "Answered" means the person tapped an option in that question. Checkboxes never count as answers or guesses (unchecked = not paying).
- **Amounts in Average** are read-only under "See the monthly amounts" (the average household's shares × $5,750). Editing starts in Personal.
- The page never folds while someone is answering; folding happens only on load (rev 4: and after a quick start).
- **Saved data** (`inflation-reality:answers:v1`): answered choices, checkboxes, amount edits keyed by line id, renewal rates. Unknown ids or options are ignored individually; unparseable JSON or another version is discarded.

### Order

**Replaced by *Revision 4 layout*.** Kept for history:


- **Phone:** headline, lede, skip link → questions → result panel → "Adjust monthly amounts" (collapsed). The dock hides while the panel is on screen; **See details** scrolls to it. `scroll-padding-bottom` keeps focused controls clear of the dock.
- **Desktop (≥ 900px):** questions and amounts on the left; panel sticky on the right.

### Result panel

**Revision 4 splits this into the result strip and the family cards; see *Revision 4 layout* for what is removed.** Kept for history:


Title → answer → rates line → your-costs vs. national bars (one shared grid) → verdict → basis → "Where the extra money goes": rows sorted by absolute dollars (label with optional note: "Fixed payment", "Average for employer plans, change to yours", "Estimate"; rate; dollars; bar); the top **6** rows **excluding Everything else**; then "N smaller items" with their sum; then **Everything else, always last, secondary ink, "Estimated from the national rate"**; empty-renewal prompt rows (their buttons open "Adjust monthly amounts" and focus that input) → **Change answers** (or **Answer the questions**) and "Show all N items" (N counts every row, including Everything else) → fine print: "Estimates based on BLS consumer price data for July 2026. Dollar amounts are rounded." plus stale or `yoyGap` notes.

A zero total (all amounts 0) replaces the answer with "Enter your monthly amounts to see your estimate." and hides bars, verdict and lines.

### Other tabs

Routes: Your costs = no hash (`/inflation-reality/`); `#national-numbers`, `#price-check`, `#sources`. Section links change the hash (normal history entries); `hashchange` renders the tab; an unknown hash renders Your costs; in-page jumps use `scrollIntoView`, never a hash.

- **National numbers:** headline and core with month-over-month and annualized, the 12-month headline trend (no personal line), other official measures, gap/stale notes, a reserved spot for the country comparison.
- **Price check:** average-price table, EIA weekly fuel, Biggest Movers (fixing its color-index bug).
- **Sources:** how the estimate is worked out (plain-words formula, fixed mortgage, the rolled weights and residual, proxies named), every series with a FRED or BLS link, caveats, the .xlsx download.
- **Chart rules** (rev 4: colors, crosshair and motion per *Charts and the other tabs*; the token-only rule stays): Recharts styled from tokens only; text `--ink-2`, gridlines `--rule`; one series `--accent`; comparisons `--accent` vs `--bar-us`; the other-official-measures bars use one neutral hue with direct value labels; direction by sign and label, not red/green; tooltips on `--surface` with a `--rule` border.

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
- **Property taxes are out of scope** (2026-09-17): there is no published national rate, and asking for a local figure is homework most people cannot do from memory. Mortgage and owned answers say so in their explanation instead. Owners who own outright see a *higher percentage on a smaller budget* while their dollar total falls; the national rate they are compared against includes owners' equivalent rent, which they do not pay in cash. **Resolved 2026-10-01:** both kinds of owner (mortgage and owned) are compared with CPI-U all items less shelter (`CUUR0000SA0L2`, FRED), computed at the reference month like every calculator line (catalog `CALC_LINES` entry `exShelter`, flagged `yardstick: true`, never a household line). Renters keep the all-items rate. If that series is missing, owners fall back to the national rate. **Home insurance stays** (2026-10-01): it is opt-in through the renewal increase and is one of only two home lines for outright owners.
- **Charging the car** uses the Electricity line's rate. **Heating included in my rent** adds no heating line.

### Verdict rule

Let `P` = your rate and `R` = the yardstick (the headline; for owners, all items less shelter), both at display precision (one decimal), `d = P − R`.
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
- **Revision 4 — Bolder look:** on `redesign/phase2b` before its merge; see *Rollout for revision 4*.
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
