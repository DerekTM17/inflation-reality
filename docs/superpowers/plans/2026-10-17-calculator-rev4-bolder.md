# Calculator Revision 4 (Bolder look, quick starts, compact layout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the spec's Revision 4 on `redesign/phase2b`: family colors on Your costs and Price check and publisher colors on National numbers, quick-start households, a sticky result strip in place of the result panel and phone dock, family cards with dollar sliders that fold on phones, one shared hover card with linked highlights, and motion that is complete at rest and off under reduced motion.

**Architecture:** Same pattern as Phase 2a/2b. Everything a component shows is computed by a pure, unit-tested module: `src/calculator/cards.js` (family cards, spending mix, hover-card text), `src/calculator/visit.js` (what lasts for one visit), `src/calculator/motion.js` (tween math), plus additions to `config.js`, `model.js`, `panel.js`, `src/tabs/national.js`, `src/tabs/prices.js` and `src/tabs/sources.js`. React components only lay that data out. Hover cards share one fixed `HoverCard` driven by a `useHover()` hook whose state holds a key, never the content, so an open card is re-rendered from the latest numbers and follows a slider live. Colors reach elements only through `--c`, set from `data-family` / `data-publisher` attributes in a new `src/styles/marks.css`.

**Tech Stack:** Vite 5, React 18, Recharts 2.15.4 (installed; `ComposedChart` + `accessibilityLayer`), plain CSS with tokens, Node's built-in test runner (`node --test`), Python Playwright for the audit. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md`, section **"Revision 4: Bolder look, quick starts, compact layout (2026-10-16)"** (approved 2026-10-17), plus the sections it builds on: Success criteria (Rev 4 bullets), Visual system, Design rules, Voice guide, Numbers, States, Accessibility, Testing. Where Revision 4 conflicts with an earlier section, Revision 4 wins. Look, layout and interaction come from the approved mockups `docs/superpowers/mockups/2026-10-02-color-study-{spending-mix,your-costs,national-numbers}.html`, **Bolder treatment (`data-v="c"`)**; the spending-mix file has the hover card and phone fold-up code this plan adapts. Where a mockup and the spec differ, the spec wins. Previous plan (house style, audit conventions): `docs/superpowers/plans/2026-10-01-calculator-phase2b-other-tabs.md`.

**Baseline:** branch `redesign/phase2b` at `d1b8c63` ("docs(spec): revision 4 approved"). `npm test` reports `tests 184`, `pass 184`, `fail 0`. Every task below lists the expected cumulative pass count; `fail 0` is the gate, and a different pass count means a test was added or lost by mistake.

**Validated:** on 2026-10-17 every code block below was applied in task order to a scratch copy of `d1b8c63` (script-extracted from this file). Results: `npm test` 221/221 after Task 9, with each task's intermediate count as stated; `npx vite build` succeeded after every task; each task's smoke check printed what its *Expected* line says; `scripts/audit/ui-audit.py` passed all 223 checks against `vite preview` with the fixture at a random seed and at `--seed 1` (re-validated after the plan review fixes), and failed as expected on an injected `.fam` border. Measured page heights with the Commuter quick start: 1,423px at 1280 and 1,793px at 390 with every card folded (fallback fonts).

## Global Constraints

Copied from the spec (verbatim where quoted). Every task's requirements include this section.

- **Rollout:** "Built on `redesign/phase2b` on top of Phase 2b. Merge gate unchanged: unit tests, audit, the owner's 5-second test, production data live. Merge and push only on the owner's word." Never commit to `main`; never push unless the owner says so in this session (a push to `main` deploys the live site).
- **Commits** end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (every commit command below passes it as a second `-m`).
- **No new npm dependencies.** "Phase 2 unit tests (`node --test`, no new deps)". Test files are `*.test.mjs` next to the code. **There is no React test harness and this plan does not add one:** components are verified by `npx vite build`, a short Python Playwright smoke check in each UI task, and the full audit in Task 10.
- **Colors:** "Tokens in `src/styles/tokens.css`; components never use literal colors." `src/styles/tokens.test.mjs` scans `styles/`, `components/`, `tabs/`, every view and `App.jsx` for `#hex`, `rgb(`, `hsl(`. Family tokens go in `tokens.css` "(both dark blocks identical, per `tokens.test.mjs`)". Recharts gets colors as `var(--token)` strings.
- "**Family colors are for marks only** (dots, bars, slider fills, tints, slices), never for text. Every mark has a text label next to it."
- "**Text inside tinted cards and rows uses `--ink` and `--ink-2` only, never `--ink-3`**".
- "Tinted cards have **no border** (they are not raised surfaces)." Tints: "cards use the family color at 6% over the ground (`color-mix(in srgb, var(--f-x) 6%, transparent)`), a hovered row 13%, a highlighted card 11% plus a 1.5px inset ring at 55%."
- "**Color never means good or bad.** Rises and falls are shown by sign and by which side of zero a bar sits."
- "Families always appear in this fixed order (never re-sorted by size, so cards don't jump while someone drags a slider)".
- "Amounts are dollars, never percentage shares; the spending mix bar shows the shares."
- **Copy:** "\"a year\" and \"a month\", never \"/yr\" or \"/mo\"." "No `·`: the hover card writes \"$380 a month, $4,560 a year\"; the Summary joins with commas." "Chevrons are SVG icons, not text glyphs, so the banned-string scan stays as it is."
- **Voice guide:** "**Banned everywhere in site copy:** `—` (em dash), `·`, `→`, exclamation marks, \"Welcome back\", \"Here's\", \"Let's\", \"simply\", clever taglines (\"repriced\", \"reimagined\")." "**On the Your costs tab only:** unexplained \"CPI\", \"YoY\", \"relative importance\"". Plain American English, second person, sentence case.
- **Numbers:** "**Rates:** one decimal with a sign: `+24.6%`, `−4.5%` (U+2212 minus); a fixed mortgage shows `0%`." "Lines round to **$10** with largest-remainder allocation so they **sum exactly to the rounded total** (mixed signs supported)". "**Inputs:** whole dollars a month, clamped 0–100,000; renewal increases one decimal, clamped −50 to 100; non-numeric counts as 0."
- **Target sizes:** "the slider's hit area is 32px tall with a 22px thumb; the dollar box is at least 36px tall; fold buttons, quick starts, answer buttons and other buttons stay ≥ 44px."
- **Motion:** "Motion only plays on first view of a tab and in response to the person's actions; nothing loops." "**The page is complete at rest:** every number and bar is readable in its final state if no animation runs. Under `prefers-reduced-motion: reduce`, all of it is off: values appear at once, bars at full length, no flash, no slice growth, no card movement."
- "**Quick starts never show a selected state.** They are plain buttons, not toggles."
- "Every control shows hover, pressed, selected, guessed and focus states; selection is never color alone."
- "The palette passed the dataviz validator (lightness, chroma, color-blind separation). The original site's palette failed it; don't go back to it."
- **Keep** `model.main` and `model.rest` ("the .xlsx personal sheet reads them, `workbook.js`") and the `--dock` / `--dock-ink` tokens ("the toast uses them").
- **Null, never zero:** `null >= 0` is `true` in JavaScript. Guard every comparison on a maybe-null value (`v != null && v >= 0`). A missing number shows as "Not available" or is left out, never `0.0%`, `NaN` or `Infinity`.
- **Audit tooling:** Python Playwright (`from playwright.sync_api import sync_playwright`), **never the Playwright MCP browser** (it is one browser shared with other sessions).
- **Preview servers:** start them detached and stop them **by PID only**, never with a broad `pkill`. `vite preview` has no `public/cpi.json`, so the app logs a 404 and uses `src/data/fallback.json`; the audit answers `cpi.json` with `scripts/audit/fixture-cpi.json` unless `--live-data` is passed.
- **Do not touch** `scripts/*.mjs` (the pipeline), `.github/workflows/`, `src/data/fallback.json`, `src/data/merge.js`, `src/data/payload.js`, `src/data/catalog.js`, `src/calculator/storage.js`, `src/calculator/format.js`, `src/tabs/workbook.js`, `scripts/audit/fixture-cpi.json`.

**Preview procedure** (used by every smoke step; run from the repo root):

```bash
npm run build 2>&1 | tail -2
setsid node node_modules/vite/bin/vite.js preview --port 4719 --strictPort < /dev/null > /tmp/ir-preview.log 2>&1 &
echo $! > /tmp/ir-preview.pid; disown
sleep 2; curl -s -o /dev/null -w "STATUS: %{http_code}\n" http://localhost:4719/inflation-reality/
```

Expected: `✓ built in …` and `STATUS: 200`. Stop it with `kill "$(cat /tmp/ir-preview.pid)"` (node is the setsid'd process itself, so its PID is the server).

## Review Focus

The five input classes the spec implies, most likely to bite a visitor, each pinned by a test in its owning task:

1. **An empty renewal box** (home insurance with a mortgage, or "I buy my own" health insurance). The row says "Add your renewal increase", the line stays out of the total, the family's rate, the spending shares and the mix bar, and the folded phone heading still shows the family's dollar total plus the prompt. Pinned in Task 2 (`an empty renewal line stays out of the shares, the family rate and the totals, and says so`) and Task 10 (the renewal flow at 390px).
2. **An amount above the slider's range** (typing $4,000 for groceries when the slider ends at $1,900). The box keeps $4,000, the thumb sits at the end, and nothing writes a smaller number back. Pinned in Task 2 (`an amount above the slider's max keeps its number and pins the thumb`) and Task 10 (`an amount above the slider's max pins the thumb at the end`).
3. **A zero total or missing data** (every amount set to 0). The cards keep their rows and boxes so the person can type again, the mix bar is empty, shares are `null`, and nothing renders `NaN`. Pinned in Task 2 (`zero total: cards keep their rows and boxes, no mix, no NaN`) and Task 10 (`all amounts 0: zero-total message`).
4. **A quick start over earlier entries, then Undo.** The tap replaces answers, checkboxes and amounts but keeps typed renewal rates; Undo restores exactly what was there, and the earlier answers object is never mutated. Pinned in Task 3 (`applyQuickStart replaces answers, checkboxes and edits, keeps renewal rates, and leaves the old answers alone`) and Task 10 (`Undo restores the answers from before the tap`).
5. **Trend data with gap months or negative values.** Y-axis ticks stay evenly spaced and include zero, the sparkline breaks at gaps instead of drawing through them, a gap month's chart card says "Not published", and falls get bars left of zero. Pinned in Task 8 (`evenTicks: …`, `sparkPaths: …`, `hover cards: big numbers, measures and chart points`) and Task 9 (`movers: …`, existing).

## Decisions this plan makes (not settled by the spec)

Each one is repeated under *Open questions for the owner* at the end.

1. **Average-state hover labels.** In the Average state the hover cards say "Share of spending" and "Average spending now" instead of "Share of your spending" and "You pay now", because the success criterion is that people see the first numbers are the average household's, not theirs.
2. **Phone strip contents.** Under 900px the sticky part holds only the title, answer and bars (spec). The rates line, verdict, mix bar and the Average state's **Answer the questions** button go in `.strip-more`, so they scroll away.
3. **Folded heading with an empty renewal line** shows "Add your renewal increase" on a line under the heading **in addition to** the family's yearly change, so headings still add up to the total.
4. **Undo after a quick start** also restores whether the questions were folded. Undo after Start over behaves as before.
5. **The returning lede** ("Updated with July 2026 prices.") shows only for a fold that came from saved answers on load, not after a quick start.
6. **Big-number color.** The number text stays `--ink`; the card's color (`--accent` or `--p-labor`) goes to the top rule, tint, sparkline and pace bars, because publisher colors are for marks only.
7. **Measure blurbs.** At 600px and wider the blurb is in the row's hover card plus visually hidden text in the row. Under 600px (no card opens on those rows) it shows as visible help text under the row.
8. **Sources dots:** household lines, average-household rows and Price check series get a family dot; "What we compare you with" and "National numbers" rows get none.
9. **Compare bars and Average rows are tab stops** (`tabIndex={0}`) so their hover cards open on keyboard focus at 600px and wider.
10. **The trend chart starts keyboard users on the latest month** through Recharts' instance API `accessibilityManager.setIndex()` (Recharts 2.15.4, `lib/chart/AccessibilityManager.js`), called in an `onFocusCapture` on the chart wrapper. The `defaultIndex` Tooltip prop would show the card at rest, so it is not used.
11. **`--live-data` runs only against the live site.** The spec removes the console-error filter for `cpi.json`, so a local `vite preview` (which 404s on `cpi.json`) must use the fixture.
12. **Price check families:** gasoline and diesel are Getting around, electricity and natural gas are Utilities, every food item is Food.
13. **Mix legend items are buttons** (≥ 44px tall) so taps pin their card and keyboard users reach the slices through them.
14. **Scrolling keeps a focused target's card open (deliberate deviation).** The spec says an unpinned card closes on scroll. Focusing an off-screen row scrolls the page, so closing then would hide every keyboard-opened card; a card whose target holds focus stays open and follows it. Recorded in the spec's Revision 4 notes.
15. **Touch never opens a card through focus.** On a touch tablet (600px and wider) tapping a dollar box focuses it; `useHover` records the last pointer and skips focus-opening within 600ms of a touch. `:focus-visible` cannot do this, because text inputs always match it.
16. **The family card's "You pay now"** counts every row, including an empty renewal line; shares, the mix bar and the family's rate count only priced rows. A share that rounds to 0% reads "under 1%".

Decisions 1, 2, 6, 7 and 11 are the owner's defaults and are written into the spec's Revision 4 notes (2026-10-17).

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/styles/tokens.css`, `src/styles/tokens.test.mjs` (modify) | family, publisher-alias and `--track` tokens; tint contrast; per-pair minimums | 1, 5 |
| `src/calculator/config.js` (modify) | `family` + `about` on every line, `FAMILIES`, `BASKET_ROWS`, `QUICK_STARTS`, export `OWNER_YARDSTICK` | 2, 3 |
| `src/calculator/cards.js` (+ `cards.test.mjs`) (create) | family cards, mix shares, slider range, hover-card text | 2 |
| `src/calculator/model.js` (modify), `src/calculator/quickstart.test.mjs` (create) | `applyQuickStart` | 3 |
| `src/calculator/visit.js` (+ `visit.test.mjs`) (create) | fold and open-card state for one visit | 3 |
| `src/components/QuickStarts.jsx` (create), `src/components/Toast.jsx` (modify) | quick-start buttons; toast message | 3 |
| `src/components/useMedia.js`, `useHover.js`, `placeCard.js` (+ `placeCard.test.mjs`), `HoverCard.jsx` (create) | media queries, hover state and target props, card placement, the card | 4 |
| `src/styles/marks.css` (create), `src/main.jsx` (modify) | `data-family`/`data-publisher` → `--c`, dots, hover card, focus rings, motion | 4, 7 |
| `src/calculator/panel.js`, `panel.test.mjs` (modify) | remove `TOP_ROWS`/`top`/`smaller`/`allCount`/`prompts`/`actionLabel`; `answerSentence` | 5 |
| `src/components/ResultStrip.jsx` (create); `ResultPanel.jsx`, `Dock.jsx` (delete) | the sticky strip, compare bars, mix bar and legend | 5 |
| `src/views/YourCosts.jsx` (modify / rewrite) | view wiring | 3, 5, 6, 7 |
| `src/styles/calculator.css` (rewrite / modify), `src/styles/controls.css` (modify) | strip, cards, sliders; remove `.dock`, `.prompts`, `.disclosure` | 5, 6 |
| `src/shell.test.mjs` (modify) | revision 4 removals stay removed | 5, 6 |
| `src/components/FamilyCards.jsx` (create); `Amounts.jsx` (delete) | family cards, tight rows, sliders, phone fold-up | 6 |
| `src/calculator/motion.js` (+ `motion.test.mjs`), `src/components/useMotion.js`, `CountUp.jsx` (create) | tween math, first view, flash, count-up | 7 |
| `src/tabs/national.js`, `national.test.mjs` (modify) | publishers, reference line, even ticks, sparkline, pace, hover text | 8 |
| `src/components/TrendChart.jsx` (rewrite), `src/components/MeasureList.jsx` (create), `src/views/NationalNumbers.jsx` (rewrite), `src/styles/tabs.css` (modify) | National numbers | 8 |
| `src/tabs/prices.js`, `prices.test.mjs`, `src/tabs/sources.js`, `sources.test.mjs` (modify) | mover families and hover text; series families | 9 |
| `src/components/BarList.jsx`, `src/views/PriceCheck.jsx` (rewrite), `src/views/Sources.jsx`, `src/styles/tabs.css` (modify) | Price check movers, fuel fix, Sources dots | 9 |
| `scripts/audit/ui-audit.py` (rewrite) | revision 4 audit | 10 |

Task order matters: Task 5 removes the panel's list and prompt rows while the old "Adjust monthly amounts" disclosure still works; Task 6 replaces that disclosure with the cards. The full audit is rewritten in Task 10 because every earlier UI task changes selectors it reads; until then each UI task runs its own smoke check.

---

### Task 1: Family, publisher and track tokens with tint contrast checks

**Files:**
- Modify: `src/styles/tokens.css` (whole file)
- Test: `src/styles/tokens.test.mjs` (whole file)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--track`; `--f-home`, `--f-around`, `--f-food`, `--f-util`, `--f-fun`, `--f-health`, `--f-kids`, `--f-rest` (light and both dark blocks); publisher aliases defined once in `:root`: `--p-labor` = `var(--f-home)`, `--p-commerce` = `var(--f-food)`, `--p-cleveland` = `var(--f-kids)`, `--p-atlanta` = `var(--f-util)`, `--p-dallas` = `var(--f-fun)`. Later tasks reach them only through `--c` (Task 4) or `var(--track)`.

- [ ] **Step 1: Confirm the baseline**

```bash
cd ~/projects/inflation-reality-phase2b
git status -sb                                   # ## redesign/phase2b, clean
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"   # tests 184, pass 184, fail 0
```

- [ ] **Step 2: Write the failing test.** Replace the whole of `src/styles/tokens.test.mjs` with:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..");
const css = readFileSync(resolve(here, "tokens.css"), "utf8");

// The text inside the first block matching `selector {`.
function block(selectorPattern) {
  const m = new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(m, `block ${selectorPattern} exists`);
  return m[1];
}

// Hex color tokens inside that block.
function tokens(selectorPattern) {
  return Object.fromEntries([...block(selectorPattern).matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].map((x) => [x[1], x[2]]));
}

// WCAG 2 relative luminance and contrast ratio.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// What `color-mix(in srgb, fg alpha, transparent)` paints over `bg`: a per-channel sRGB blend.
function over(fg, bg, alpha) {
  const ch = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
}

// Each pair is [fg, bg] or [fg, bg, minimum]; a pair without a minimum uses `min`.
function checkPairs(t, pairs, min, where = "") {
  for (const [fg, bg, floor = min] of pairs) {
    assert.ok(t[fg] && t[bg], `--${fg} and --${bg} are defined`);
    const ratio = contrast(t[fg], t[bg]);
    assert.ok(ratio >= floor, `${where}--${fg} on --${bg} is ${ratio.toFixed(2)}, needs ${floor}`);
  }
}

const FAMILIES = ["f-home", "f-around", "f-food", "f-util", "f-fun", "f-health", "f-kids", "f-rest"];
const light = tokens(":root");
const darkMedia = tokens(':root:not\\(\\[data-theme="light"\\]\\)');
const darkAttr = tokens(':root\\[data-theme="dark"\\]');

test("both dark blocks are identical and every theme defines the same tokens", () => {
  assert.deepEqual(darkMedia, darkAttr);
  assert.deepEqual(Object.keys(darkAttr).sort(), Object.keys(light).sort());
  assert.equal(Object.keys(light).length, 24);
});

test("publisher colors are aliases of family colors, set once in :root", () => {
  const alias = (text) => Object.fromEntries([...text.matchAll(/--(p-[\w-]+):\s*var\(--([\w-]+)\)/g)].map((x) => [x[1], x[2]]));
  assert.deepEqual(alias(block(":root")), {
    "p-labor": "f-home", "p-commerce": "f-food", "p-cleveland": "f-kids", "p-atlanta": "f-util", "p-dallas": "f-fun",
  });
  assert.deepEqual(alias(block(':root:not\\(\\[data-theme="light"\\]\\)')), {});
  assert.deepEqual(alias(block(':root\\[data-theme="dark"\\]')), {});
});

// Design rule 7, plus revision 4's family rule.
for (const [name, t] of [["light", light], ["dark", darkAttr]]) {
  test(`contrast (${name}): text pairs at least 4.5:1`, () => {
    checkPairs(t, [
      ["ink", "ground"], ["ink", "surface"], ["ink-2", "ground"], ["ink-2", "surface"],
      ["ink-3", "ground"], ["ink-3", "surface"], ["accent-ink", "accent"], ["dock-ink", "dock"],
    ], 4.5);
  });

  test(`contrast (${name}): non-text pairs at least 3:1`, () => {
    checkPairs(t, [
      ["control-edge", "surface"], ["accent", "surface"], ["bar-us", "surface"], ["bar-line", "surface"],
      ["accent", "ground"],
    ], 3);
  });

  test(`contrast (${name}): family marks at least 3:1 on the page and on surfaces`, () => {
    // Light Utilities (2.74:1 on --ground) and Everything else (2.93:1) are allowed down
    // to 2.7:1: every mark has a text label next to it, and the label carries the meaning.
    const floor = name === "light" ? { "f-util": 2.7, "f-rest": 2.7 } : {};
    checkPairs(t, FAMILIES.flatMap((f) => [[f, "surface", floor[f]], [f, "ground", floor[f]]]), 3);
  });

  test(`contrast (${name}): text and marks on a 13% family tint over the page`, () => {
    for (const f of FAMILIES) {
      // Light Utilities measures 2.43:1 on its own tint; the label next to it carries the meaning.
      checkPairs({ ...t, tint: over(t[f], t.ground, 0.13) }, [["ink", "tint"], ["ink-2", "tint"], [f, "tint", 2.4]], 4.5, `${f} tint: `);
    }
  });
}

// "Components never use literal colors." Scans the new UI files.
test("no literal colors outside tokens.css in the new UI", () => {
  const files = [];
  for (const dir of ["styles", "components", "tabs"]) {
    const full = join(src, dir);
    if (!existsSync(full)) continue;
    for (const f of readdirSync(full)) {
      if (/\.(css|jsx|js)$/.test(f) && f !== "tokens.css") files.push(join(full, f));
    }
  }
  for (const f of readdirSync(join(src, "views"))) {
    if (/\.(jsx|js)$/.test(f)) files.push(join(src, "views", f));
  }
  if (existsSync(join(src, "App.jsx"))) files.push(join(src, "App.jsx"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/.test(text), `literal color in ${file}`);
  }
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test src/styles/tokens.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: FAIL. `not ok 1 - both dark blocks …` (`15 !== 24`), `not ok 2 - publisher colors …`, and the four family tests (`--f-home and --surface are defined`); `pass 5`, `fail 6`.

- [ ] **Step 4: Add the tokens.** Replace the whole of `src/styles/tokens.css` with:

```css
/* Visual system tokens (spec "Visual system", revision 4 "Families"). Components never
   use literal colors: every color below is the only place it is written. Light first,
   then dark for the system setting, then dark for an explicit data-theme="dark". The two
   dark blocks must stay identical (tokens.test.mjs checks). Family colors are for marks
   only (dots, bars, slider fills, tints, slices), never for text. */
:root {
  --ground: #F3F5F4;
  --surface: #FFFFFF;
  --ink: #1F2933;
  --ink-2: #56626E;
  --ink-3: #66717D;
  --rule: #D5DCDA;
  --control-edge: #6B7682;
  --control-hover: #EAF0ED;
  --accent: #2E5E45;
  --accent-ink: #FFFFFF;
  --accent-soft: #E3EDE7;
  --bar-us: #7D8894;
  --bar-line: #87919A;
  --dock: #1F2933;
  --dock-ink: #FFFFFF;
  --track: #E4E9E7;
  --f-home: #2F6DB5;
  --f-around: #D2602E;
  --f-food: #1A9473;
  --f-util: #C48A12;
  --f-fun: #C9638C;
  --f-health: #3E7D2E;
  --f-kids: #5A4AA8;
  --f-rest: #87919A;
  /* Publishers on National numbers reuse family colors. The aliases live here only:
     a dark block that resets a family color on :root changes its alias with it. */
  --p-labor: var(--f-home);
  --p-commerce: var(--f-food);
  --p-cleveland: var(--f-kids);
  --p-atlanta: var(--f-util);
  --p-dallas: var(--f-fun);
  --shadow: 0 6px 20px rgba(20, 25, 30, 0.28);
  --font: "Libre Franklin", "Franklin Gothic Medium", "Helvetica Neue", Arial, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #161A1E;
    --surface: #1F252B;
    --ink: #E7ECEA;
    --ink-2: #AEB8C0;
    --ink-3: #9AA5AE;
    --rule: #353D44;
    --control-edge: #8B96A1;
    --control-hover: #29323A;
    --accent: #8CC9A2;
    --accent-ink: #0F2219;
    --accent-soft: #22382C;
    --bar-us: #8C97A2;
    --bar-line: #7A858F;
    --dock: #E7ECEA;
    --dock-ink: #161A1E;
    --track: #2C343B;
    --f-home: #4C8BD6;
    --f-around: #DE6A35;
    --f-food: #2AAA85;
    --f-util: #B98312;
    --f-fun: #CB668F;
    --f-health: #5C9A45;
    --f-kids: #9085E9;
    --f-rest: #7A858F;
  }
}

:root[data-theme="dark"] {
  --ground: #161A1E;
  --surface: #1F252B;
  --ink: #E7ECEA;
  --ink-2: #AEB8C0;
  --ink-3: #9AA5AE;
  --rule: #353D44;
  --control-edge: #8B96A1;
  --control-hover: #29323A;
  --accent: #8CC9A2;
  --accent-ink: #0F2219;
  --accent-soft: #22382C;
  --bar-us: #8C97A2;
  --bar-line: #7A858F;
  --dock: #E7ECEA;
  --dock-ink: #161A1E;
  --track: #2C343B;
  --f-home: #4C8BD6;
  --f-around: #DE6A35;
  --f-food: #2AAA85;
  --f-util: #B98312;
  --f-fun: #CB668F;
  --f-health: #5C9A45;
  --f-kids: #9085E9;
  --f-rest: #7A858F;
}

html {
  scroll-padding-top: 16px;
  scroll-padding-bottom: 110px; /* keeps focused controls clear of the phone dock */
}

body {
  background: var(--ground);
  color: var(--ink);
  font: 400 16px/1.55 var(--font);
}

button,
input,
select {
  font: inherit;
}
```

(The `html` block is unchanged here; Task 5 replaces it when the dock goes.)

- [ ] **Step 5: Run the tests**

Run: `node --test src/styles/tokens.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)" && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 11`, `fail 0`; then the full suite `pass 189`, `fail 0`. (Measured with the spec's values: light Utilities 3.00:1 on `--surface` and 2.74:1 on `--ground`, its tint mark 2.43:1; every `--ink`/`--ink-2` on a tint is at least 4.72:1.)

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.mjs
git commit -m "feat(tokens): family, publisher and track tokens with tint contrast checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Families in config, and the family-cards model (`cards.js`)

**Files:**
- Modify: `src/calculator/config.js` (the `LINES` block, the `OWNER_YARDSTICK` declaration; append `FAMILIES` and `BASKET_ROWS`)
- Create: `src/calculator/cards.js`
- Test: `src/calculator/cards.test.mjs` (create)

**Interfaces:**
- Consumes: `computeResult`, `defaultAmount`, `effectiveChoices` (`model.js`); `formatDollars`, `formatRate`, `signedDollars`, `monthLabel` (`format.js`); `panelModel()` output `{ main, rest, total, zero, compare: { you: { text, bar }, us: { text, bar }, usLabel } | null }`.
- Produces (`config.js`): every `LINES[id]` gains `family: string` (a `FAMILIES` id) and `about: string`; `export const FAMILIES: { id, label, token }[]` in fixed order `home, around, food, util, fun, health, kids, rest`; `export const BASKET_ROWS: Record<basketId | "rest", { family, about }>`; `export const OWNER_YARDSTICK` (was a private const).
- Produces (`cards.js`):
  - `familyOf(id: string, mode: "average"|"personal"): string` and `aboutOf(id, mode): string`.
  - `sliderMax(start: number): number` = `max(500, ceil(3 × start / 100) × 100)`; `sliderValue(monthly, max): number` = `min(max(0, monthly), max)`.
  - `mixShares(values: number[]): number[]`: whole percents summing to 100 (largest remainder); values ≤ 0 get 0; all zero gives all 0.
  - `shareText(share: number, fraction: number): string`: `"41%"`, or `"under 1%"` when the share rounds to 0 but the fraction is above 0.
  - `familyCards({ mode, rows, model, answers }): { cards: FamilyCard[], mix: MixSlice[] }` where
    - `CardRow = { id, family, label, note, monthly, rate, rateText, inResult, yearAgo, dollars: number|null, addsText, addsYearText, renewal: boolean, renewalMissing: boolean, about, max: number|null, sliderValue: number|null }`
    - `FamilyCard = { id, label, token, rows: CardRow[], monthly (every row, for "You pay now"), pricedMonthly (rows in the result, for shares), rate: number|null, rateText, dollars: number|null, dollarText, biggest: string|null, renewalMissing: boolean, share: number|null, fraction: number }`
    - `MixSlice = { id, label, share, fraction, text }` (`text` is "Home 41%").
  - Hover content shape used by every card from here on: `HoverContent = { title: string, family?: string, publisher?: string, items: [string, string][], lines: string[], note: string }`.
  - `rowHover(row: CardRow, referenceMonth: string, personal: boolean): HoverContent`; `familyHover(card: FamilyCard, personal: boolean): HoverContent`; `compareHover(model, which: "you"|"us"): HoverContent|null`.

- [ ] **Step 1: Write the failing test.** Create `src/calculator/cards.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { BASKET } from "../data/catalog.js";
import { FAMILIES, LINES, BASKET_ROWS, QUESTIONS, ALSO } from "./config.js";
import { emptyAnswers, personalRows, averageRows, effectiveChoices, activeLines } from "./model.js";
import { panelModel } from "./panel.js";
import { formatDollars } from "./format.js";
import {
  familyOf, aboutOf, sliderMax, sliderValue, mixShares, shareText, familyCards, rowHover, familyHover, compareHover,
} from "./cards.js";
import { fakeData } from "./testdata.mjs";

const answersWith = (patch) => ({ ...emptyAnswers(), ...patch });
const sum = (xs) => xs.reduce((s, x) => s + x, 0);

function personal(answers, data = fakeData()) {
  const rows = personalRows(answers, data);
  const model = panelModel({
    mode: "personal", rows, headlinePct: data.headline.yoy, exShelterPct: data.lines.exShelter?.yoy ?? null,
    referenceMonth: data.referenceMonth, answers,
  });
  return { rows, model, ...familyCards({ mode: "personal", rows, model, answers }) };
}

function average(data = fakeData()) {
  const answers = emptyAnswers();
  const rows = averageRows(data, BASKET.ceMonthlyMean);
  const model = panelModel({ mode: "average", rows, headlinePct: data.headline.yoy, referenceMonth: data.referenceMonth, answers });
  return { rows, model, ...familyCards({ mode: "average", rows, model, answers }) };
}

// Deterministic LCG so the property tests are reproducible without a new dependency.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("families: every line and basket row has one, as in the spec table", () => {
  assert.deepEqual(FAMILIES.map((f) => f.id), ["home", "around", "food", "util", "fun", "health", "kids", "rest"]);
  assert.deepEqual(FAMILIES.map((f) => f.label), [
    "Home", "Getting around", "Food", "Utilities", "Clothing and fun", "Health", "Kids and school", "Everything else",
  ]);
  for (const f of FAMILIES) assert.equal(f.token, `--f-${f.id}`);
  const byFamily = {};
  for (const [id, line] of Object.entries(LINES)) (byFamily[line.family] ??= []).push(id);
  assert.deepEqual(byFamily, {
    home: ["rent", "mortgage", "homeIns", "upkeep"],
    around: ["gasoline", "charging", "carIns", "carUpkeep", "transit"],
    food: ["groceries", "dining"],
    util: ["electric", "heatGas", "heatOil"],
    fun: ["clothing", "fun"],
    health: ["health", "doctor"],
    kids: ["daycare", "tuition"],
    rest: ["rest"],
  });
  assert.deepEqual(
    [...BASKET.visible.map((v) => v.id), "rest"].map((id) => [id, BASKET_ROWS[id]?.family]),
    [["housing", "home"], ["groceries", "food"], ["dining", "food"], ["energy", "util"], ["gasoline", "around"],
      ["health", "health"], ["clothing", "fun"], ["fun", "fun"], ["rest", "rest"]],
  );
  assert.deepEqual(Object.keys(BASKET_ROWS).sort(), [...BASKET.visible.map((v) => v.id), "rest"].sort());
});

test("rows look up their family and about text by mode, never a basket id in LINES", () => {
  assert.equal(familyOf("health", "personal"), "health");
  assert.equal(aboutOf("health", "personal"), LINES.health.about);
  assert.equal(aboutOf("health", "average"), BASKET_ROWS.health.about);
  assert.notEqual(LINES.health.about, BASKET_ROWS.health.about, "insurance and medical care are different things");
  assert.equal(familyOf("housing", "average"), "home");
  assert.equal(familyOf("housing", "personal"), "rest", "a basket id is not a line");
  for (const t of [...Object.values(LINES), ...Object.values(BASKET_ROWS)].map((x) => x.about)) {
    assert.ok(t && t.endsWith("."), `about text "${t}"`);
    for (const banned of ["—", "·", "→", "!", "CPI", "YoY", "relative importance", "/yr", "/mo"]) {
      assert.ok(!t.includes(banned), `${banned} in "${t}"`);
    }
  }
});

test("mixShares: whole percents that add to 100 by largest remainder; zero and negative stay 0", () => {
  assert.deepEqual(mixShares([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(mixShares([2030, 0, 1100]), [65, 0, 35]);
  assert.deepEqual(mixShares([5, -3, 5]), [50, 0, 50]);
  assert.deepEqual(mixShares([0, 0]), [0, 0]);
  assert.equal(shareText(41, 0.41), "41%");
  assert.equal(shareText(0, 0.004), "under 1%");
  const rand = lcg(0x5ea5);
  for (let n = 0; n < 200; n++) {
    const values = Array.from({ length: 1 + Math.floor(rand() * 8) }, () => (rand() < 0.2 ? 0 : Math.round(rand() * 3000)));
    const shares = mixShares(values);
    const total = sum(values);
    if (total === 0) continue;
    assert.equal(sum(shares), 100, `case ${n}`);
    values.forEach((v, i) => assert.ok(Math.abs(shares[i] - (v / total) * 100) < 1, `case ${n}, entry ${i}`));
  }
});

test("sliders: 0 to max(500, 3 x start rounded up to $100); bigger amounts pin the thumb at the end", () => {
  assert.equal(sliderMax(190), 600);
  assert.equal(sliderMax(100), 500);
  assert.equal(sliderMax(620), 1900);
  assert.equal(sliderMax(1650), 5000);
  assert.equal(sliderMax(0), 500);
  assert.equal(sliderValue(380, 600), 380);
  assert.equal(sliderValue(4000, 1900), 1900);
  assert.equal(sliderValue(0, 500), 0);
});

test("an amount above the slider's max keeps its number and pins the thumb", () => {
  const { cards } = personal(answersWith({ answered: { car: "gas" }, amounts: { groceries: 4000 } }));
  const g = cards.find((c) => c.id === "food").rows[0];
  assert.deepEqual([g.id, g.monthly, g.max, g.sliderValue], ["groceries", 4000, 1900, 1900]);
});

test("average cards: fixed family order, basket rows as text, headings add up to the answer", () => {
  const { model, cards, mix } = average();
  assert.equal(model.total, 2250);
  assert.deepEqual(cards.map((c) => c.id), ["home", "around", "food", "util", "fun", "health", "rest"]);
  assert.deepEqual(cards.find((c) => c.id === "food").rows.map((r) => r.id), ["groceries", "dining"]);
  assert.equal(sum(cards.map((c) => c.dollars)), model.total);
  assert.equal(sum(cards.flatMap((c) => c.rows).map((r) => r.dollars)), model.total);
  for (const c of cards) assert.match(c.dollarText, /^(\+|−)?\$[\d,]+ a year$/);
  assert.ok(cards.flatMap((c) => c.rows).every((r) => r.max == null && !r.renewal), "no sliders or boxes in Average");
  assert.equal(sum(mix.map((s) => s.share)), 100);
  assert.deepEqual(mix.map((s) => s.id), cards.map((c) => c.id));
  assert.match(mix[0].text, /^Home \d+%$/);
});

test("an empty renewal line stays out of the shares, the family rate and the totals, and says so", () => {
  const { model, cards } = personal(answersWith({ answered: { home: "mortgage" } }));
  const home = cards.find((c) => c.id === "home");
  assert.deepEqual(home.rows.map((r) => r.id), ["mortgage", "homeIns", "upkeep"]);
  const ins = home.rows.find((r) => r.id === "homeIns");
  assert.equal(ins.dollars, null);
  assert.equal(ins.addsYearText, "Add your renewal increase");
  assert.equal(ins.renewal, true);
  assert.equal(home.renewalMissing, true);
  assert.equal(home.monthly, 2170, "You pay now counts every row: mortgage 1900 + insurance 140 + repairs 130");
  assert.equal(home.pricedMonthly, 2030, "shares count priced rows only; insurance left out");
  assert.equal(home.rateText, "+0.1%");
  assert.equal(home.rows.find((r) => r.id === "mortgage").rateText, "0%");
  assert.equal(sum(cards.map((c) => c.dollars ?? 0)), model.total);
});

test("personal cards: biggest mover, row text, sliders, no card without lines", () => {
  const { cards } = personal(answersWith({ answered: { car: "gas" } }));
  const around = cards.find((c) => c.id === "around");
  assert.deepEqual(around.rows.map((r) => r.id), ["gasoline", "carIns", "carUpkeep"]);
  assert.match(around.biggest, /^Biggest mover: Gas for the car, \+\$[\d,]+ a year$/);
  const gas = around.rows[0];
  assert.equal(gas.rateText, "+27.4%");
  assert.equal(gas.addsYearText, `${gas.addsText} a year`);
  assert.equal(gas.max, 600);
  assert.match(around.rows[1].addsYearText, /^−\$[\d,]+ a year$/, "car insurance fell");
  assert.equal(cards.find((c) => c.id === "rest").biggest, null, "one line, no biggest mover");
  assert.equal(cards.some((c) => c.id === "kids"), false);
});

test("zero total: cards keep their rows and boxes, no mix, no NaN", () => {
  const base = answersWith({ answered: { home: "rent" } });
  const amounts = Object.fromEntries(activeLines(effectiveChoices(base), base.also).map((id) => [id, 0]));
  const { model, cards, mix } = personal({ ...base, amounts });
  assert.equal(model.zero, true);
  assert.ok(cards.length > 0 && cards.every((c) => c.rows.length > 0));
  assert.ok(cards.flatMap((c) => c.rows).every((r) => r.max >= 500));
  assert.deepEqual(mix, []);
  assert.ok(cards.every((c) => c.share === null && c.dollarText === ""));
  assert.doesNotMatch(JSON.stringify(cards), /NaN|Infinity|undefined/);
});

test("property: 300 random households, card headings add up to the total and shares to 100", () => {
  const rand = lcg(0xfa11);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  for (let n = 0; n < 300; n++) {
    const answers = emptyAnswers();
    for (const q of QUESTIONS) if (rand() < 0.85) answers.answered[q.id] = pick(q.options).id;
    for (const a of ALSO) answers.also[a.id] = rand() < 0.4;
    for (const id of activeLines(effectiveChoices(answers), answers.also)) {
      if (rand() < 0.4) answers.amounts[id] = rand() < 0.15 ? 0 : Math.round(rand() * 3000);
      if (LINES[id].renewal && rand() < 0.5) answers.renewals[id] = Math.round((rand() * 30 - 10) * 10) / 10;
    }
    const { model, cards, mix } = personal(answers);
    if (model.zero) continue;
    assert.equal(sum(cards.map((c) => c.dollars ?? 0)), model.total, `household ${n}: headings`);
    if (mix.length > 0) assert.equal(sum(mix.map((s) => s.share)), 100, `household ${n}: shares`);
    const order = cards.map((c) => FAMILIES.findIndex((f) => f.id === c.id));
    assert.ok(order.every((v, i) => i === 0 || order[i - 1] < v), `household ${n}: family order`);
  }
});

test("hover cards: an amount row and a family, in Personal and Average wording", () => {
  const { cards } = personal(answersWith({ answered: { car: "gas" } }));
  const around = cards.find((c) => c.id === "around");
  const gas = around.rows[0];
  const card = rowHover(gas, "2026-08", true);
  assert.equal(card.title, "Gas for the car");
  assert.equal(card.family, "around");
  assert.deepEqual(card.items, [
    ["Price change since August 2025", "+27.4%"],
    ["You pay now", "$190 a month, $2,280 a year"],
    ["Adds this year", gas.addsText],
    ["Same things a year ago", `${formatDollars(2280 - gas.dollars)} a year`],
  ]);
  assert.deepEqual(card.lines, []);
  assert.equal(card.note, LINES.gasoline.about);
  const fam = familyHover(around, true);
  assert.deepEqual(fam.items.map(([dt]) => dt), ["Share of your spending", "You pay now", "Price change", "Adds this year"]);
  assert.match(fam.items[0][1], /^\d+%$/);
  assert.deepEqual(fam.lines, [around.biggest]);
  const food = average().cards.find((c) => c.id === "food");
  assert.equal(familyHover(food, false).items[0][0], "Share of spending");
  assert.equal(rowHover(food.rows[0], "2026-08", false).items[1][0], "Average spending now");
  assert.equal(rowHover(food.rows[0], "2026-08", false).note, BASKET_ROWS.groceries.about);
  const ins = personal(answersWith({ answered: { home: "mortgage" } })).cards[0].rows[1];
  assert.deepEqual(rowHover(ins, "2026-08", true).items.at(-1), ["Adds this year", "Add your renewal increase"]);
  for (const c of [card, fam]) assert.doesNotMatch(JSON.stringify(c), /\/yr|\/mo|·|—/);
});

test("hover cards: the two bars name the yardstick", () => {
  const renter = personal(answersWith({ answered: { home: "rent" } })).model;
  const you = compareHover(renter, "you");
  assert.equal(you.title, "Your costs");
  assert.match(you.items[0][1], /^(\+|−)\d+\.\d%$/);
  assert.equal(you.note, "Each amount's price change, weighted by what you spend on it.");
  assert.deepEqual(compareHover(renter, "us").items, [["Prices overall", "+3.4%"]]);
  const owner = personal(answersWith({ answered: { home: "owned" } })).model;
  const us = compareHover(owner, "us");
  assert.equal(us.title, "Outside housing");
  assert.deepEqual(us.items, [["Prices other than housing", "+3.6%"]]);
  assert.match(us.note, /^We compare you with prices other than housing/);
  assert.equal(compareHover(average().model, "you"), null);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/calculator/cards.test.mjs 2>&1 | tail -3`
Expected: FAIL, `Cannot find module '…/src/calculator/cards.js'` (`fail 1`).

- [ ] **Step 3: Give every line a family and an about sentence.** In `src/calculator/config.js`, replace `const OWNER_YARDSTICK =` with `export const OWNER_YARDSTICK =` (the hover card for the Outside housing bar reuses it). Then replace everything from `/**\n * Personal lines.` through the closing `};` of `LINES` with:

```js
/**
 * Personal lines. `amount` = illustrative monthly default; `note` = small text under
 * the label; `hint` = help beside the amount box; `renewal` = rate comes from the
 * person's renewal notice; `because` = verdict phrase ("mainly because of …");
 * `family` = the card the line sits in (a FAMILIES id); `about` = one plain sentence on
 * what the price covers, for the row's hover card. Labels for series-backed lines
 * match CALC_LINES in src/data/catalog.js (tested).
 */
export const LINES = {
  rent:      { label: "Rent", amount: 1650, because: "rent", family: "home",
               about: "Rent for the home or apartment you live in, not counting utilities." },
  mortgage:  { label: "Mortgage payment", amount: 1900, note: "Fixed payment", because: "your fixed mortgage payment", family: "home",
               about: "A fixed-rate payment stays the same from year to year, so its price change is zero." },
  homeIns:   { label: "Home insurance", amount: 140, renewal: true, because: "home insurance", family: "home",
               about: "The premium for insuring your home, using the increase on your renewal notice." },
  upkeep:    { label: "Home repairs", amount: 130, note: "Estimate", because: "home repairs", family: "home",
               about: "Furniture, appliances and household services, the closest published prices to home repairs." },
  groceries: { label: "Groceries", amount: 620, because: "grocery prices", family: "food",
               about: "Food and drinks from stores, to eat at home." },
  dining:    { label: "Eating out", amount: 220, because: "restaurant prices", family: "food",
               about: "Meals and snacks from restaurants, cafeterias and takeout." },
  gasoline:  { label: "Gas for the car", amount: 190, hint: "Drive less or work from home? Lower this.", because: "gas prices", family: "around",
               about: "Gas at the pump, all grades." },
  charging:  { label: "Charging the car", amount: 55, because: "electricity prices", family: "around",
               about: "Home electricity prices, since most people charge at home." },
  carIns:    { label: "Car insurance", amount: 160, because: "car insurance", family: "around",
               about: "Premiums for car insurance." },
  carUpkeep: { label: "Car repairs", amount: 60, because: "car repairs", family: "around",
               about: "Repairs, maintenance and parts for your car." },
  transit:   { label: "Bus and train fares", amount: 90, because: "bus and train fares", family: "around",
               about: "Local bus, subway and train fares." },
  electric:  { label: "Electricity", amount: 110, because: "electricity prices", family: "util",
               about: "Electricity bills at home." },
  heatGas:   { label: "Natural gas bill", amount: 70, because: "natural gas prices", family: "util",
               about: "Natural gas piped to your home." },
  heatOil:   { label: "Heating oil", amount: 120, because: "heating oil prices", family: "util",
               about: "Heating oil and other fuels delivered to your home." },
  daycare:   { label: "Daycare", amount: 1100, because: "daycare costs", family: "kids",
               about: "Daycare and preschool." },
  tuition:   { label: "College tuition", amount: 900, because: "college tuition", family: "kids",
               about: "College tuition and fees." },
  health:    { label: "Health insurance", amount: 180, renewal: true, because: "health insurance", family: "health",
               about: "Your health insurance premium, using the increase on your renewal notice." },
  doctor:    { label: "Doctor and pharmacy", amount: 90, because: "doctor and pharmacy costs", family: "health",
               about: "Doctor visits and prescription drugs." },
  clothing:  { label: "Clothing", amount: 80, because: "clothing prices", family: "fun",
               about: "Clothes and shoes." },
  fun:       { label: "Entertainment", amount: 150, because: "entertainment prices", family: "fun",
               about: "Streaming and TV, pets, toys, sports gear and hobbies." },
  rest:      { label: "Everything else", amount: 250, note: "Estimated from the national rate", family: "rest",
               about: "Everything not listed above, like phone plans and personal care. Its price change is estimated from the national rate." },
};

/**
 * Kinds of spending, in the fixed order the cards and the mix bar use (never re-sorted
 * by size, so cards don't jump while someone drags a slider). `token` names the CSS
 * color token; the colors themselves live only in tokens.css.
 */
export const FAMILIES = [
  { id: "home", label: "Home", token: "--f-home" },
  { id: "around", label: "Getting around", token: "--f-around" },
  { id: "food", label: "Food", token: "--f-food" },
  { id: "util", label: "Utilities", token: "--f-util" },
  { id: "fun", label: "Clothing and fun", token: "--f-fun" },
  { id: "health", label: "Health", token: "--f-health" },
  { id: "kids", label: "Kids and school", token: "--f-kids" },
  { id: "rest", label: "Everything else", token: "--f-rest" },
];

/**
 * The average household's rows use basket ids (BASKET.visible in catalog.js, plus
 * "rest"). Some match a line id with a different meaning ("health" here is all medical
 * care; the line "health" is insurance), so basket rows get their own family and about
 * text. Never look a basket row up in LINES.
 */
export const BASKET_ROWS = {
  housing:   { family: "home", about: "Rent, plus what homeowners would pay to rent their own home." },
  groceries: { family: "food", about: "Food and drinks from stores, to eat at home." },
  dining:    { family: "food", about: "Meals and snacks from restaurants, cafeterias and takeout." },
  energy:    { family: "util", about: "Electricity, natural gas and other fuels used at home." },
  gasoline:  { family: "around", about: "Gas and other fuel at the pump." },
  health:    { family: "health", about: "Doctors, hospitals, prescription drugs and other medical care." },
  clothing:  { family: "fun", about: "Clothes and shoes." },
  fun:       { family: "fun", about: "Streaming and TV, pets, toys, sports gear and hobbies." },
  rest:      { family: "rest", about: "Everything else the average household buys, like cars, phone plans and personal care. Its price change is set so the total matches the national rate." },
};
```

- [ ] **Step 4: Write `src/calculator/cards.js`**

```js
// Family cards, the spending mix and the hover-card text for Your costs, as plain data
// (spec "Revision 4": Families, Revision 4 layout, Hover detail cards). Pure, so "cards
// add up to the total" and "shares add up to 100" are unit-tested and the components
// only lay this out.

import { FAMILIES, LINES, BASKET_ROWS, OWNER_YARDSTICK } from "./config.js";
import { computeResult, defaultAmount, effectiveChoices } from "./model.js";
import { formatDollars, formatRate, signedDollars, monthLabel } from "./format.js";

const NATIONAL_NOTE = "The government's main measure of prices for everything people buy.";

/** Family id for a row id. Average rows use basket ids, personal rows line ids. */
export function familyOf(id, mode) {
  const table = mode === "average" ? BASKET_ROWS : LINES;
  return Object.hasOwn(table, id) ? table[id].family : "rest";
}

/** The row's one plain sentence on what its price covers ("" when unknown). */
export function aboutOf(id, mode) {
  const table = mode === "average" ? BASKET_ROWS : LINES;
  return Object.hasOwn(table, id) ? table[id].about : "";
}

/** Slider range end: max(500, three times the starting amount rounded up to $100). */
export function sliderMax(start) {
  return Math.max(500, Math.ceil((3 * start) / 100) * 100);
}

/** Where the thumb sits. An amount above the max pins it at the end; the box keeps the amount. */
export function sliderValue(monthly, max) {
  return Math.min(Math.max(0, monthly), max);
}

/**
 * Whole percents that add to exactly 100 (largest remainder, ties to the earlier entry).
 * Values of 0 or less get 0; all zero gives all 0.
 */
export function mixShares(values) {
  const pos = values.map((v) => (v > 0 ? v : 0));
  const total = pos.reduce((s, v) => s + v, 0);
  if (total === 0) return values.map(() => 0);
  const raw = pos.map((v) => (v / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((s, v) => s + v, 0);
  const order = raw
    .map((_, i) => i)
    .filter((i) => pos[i] > 0)
    .sort((a, b) => (raw[b] - out[b]) - (raw[a] - out[a]) || a - b);
  for (let k = 0; left > 0; k += 1, left -= 1) out[order[k % order.length]] += 1;
  return out;
}

/** "41%", or "under 1%" when a family with spending rounds to 0. */
export function shareText(share, fraction) {
  return share === 0 && fraction > 0 ? "under 1%" : `${share}%`;
}

/**
 * The cards in FAMILIES order, each with its rows in the order personalRows() or
 * averageRows() gave them, plus the mix bar's slices.
 * - A row's dollars are its allocated, rounded dollars from the panel model, so a
 *   card's heading (the sum of its rows) adds up to the total.
 * - Rows off the total (an empty renewal box, no data) keep `dollars: null`, stay out
 *   of the family's rate and share, and an empty renewal row says so.
 * - Shares count only lines in the result, as whole percents adding to 100; a card's
 *   "You pay now" (`monthly`) counts every row, including an unpriced renewal line.
 * @param {{ mode: "average"|"personal", rows: object[]|null, model: object, answers: object }} p
 */
export function familyCards({ mode, rows, model, answers }) {
  if (rows == null) return { cards: [], mix: [] };
  const personal = mode === "personal";
  const shown = new Map([...model.main, ...(model.rest ? [model.rest] : [])].map((r) => [r.id, r]));
  const math = new Map(computeResult(rows).lines.map((l) => [l.id, l]));
  const choices = effectiveChoices(answers);

  const cardRows = rows.map((r) => {
    const s = shown.get(r.id) ?? null;
    const l = math.get(r.id) ?? null;
    const renewalMissing = r.missing === "renewal";
    const max = personal ? sliderMax(defaultAmount(r.id, choices)) : null;
    return {
      id: r.id,
      family: familyOf(r.id, mode),
      label: r.label,
      note: r.note ?? "",
      monthly: r.monthly,
      rate: r.rate,
      rateText: formatRate(r.rate, { fixed: r.id === "mortgage" }),
      inResult: l != null,
      yearAgo: l ? l.yearAgo : null,
      dollars: s ? s.dollars : null,
      addsText: s ? s.dollarText : "",
      addsYearText: renewalMissing ? "Add your renewal increase" : s ? `${s.dollarText} a year` : "",
      renewal: personal && Object.hasOwn(LINES, r.id) && LINES[r.id].renewal === true,
      renewalMissing,
      about: aboutOf(r.id, mode),
      max,
      sliderValue: max == null ? null : sliderValue(r.monthly, max),
    };
  });

  const cards = [];
  for (const f of FAMILIES) {
    const list = cardRows.filter((r) => r.family === f.id);
    if (list.length === 0) continue;
    const inResult = list.filter((r) => r.inResult);
    const counted = list.filter((r) => r.dollars != null);
    const annual = inResult.reduce((s, r) => s + 12 * r.monthly, 0);
    const yearAgo = inResult.reduce((s, r) => s + r.yearAgo, 0);
    const rate = yearAgo > 0 ? (annual / yearAgo - 1) * 100 : null;
    const dollars = counted.length > 0 ? counted.reduce((s, r) => s + r.dollars, 0) : null;
    let biggest = null;
    if (counted.length > 1) {
      const top = counted.reduce((b, r) => (Math.abs(r.dollars) > Math.abs(b.dollars) ? r : b));
      biggest = `Biggest mover: ${top.label}, ${signedDollars(top.dollars)} a year`;
    }
    cards.push({
      id: f.id,
      label: f.label,
      token: f.token,
      rows: list,
      monthly: list.reduce((s, r) => s + r.monthly, 0), // "You pay now": every row, priced or not
      pricedMonthly: inResult.reduce((s, r) => s + r.monthly, 0), // shares and the mix bar
      rate,
      rateText: formatRate(rate),
      dollars,
      dollarText: dollars == null ? "" : `${signedDollars(dollars)} a year`,
      biggest,
      renewalMissing: list.some((r) => r.renewalMissing),
      share: null,
      fraction: 0,
    });
  }

  const spend = cards.map((c) => Math.max(0, c.pricedMonthly));
  const total = spend.reduce((s, v) => s + v, 0);
  const shares = mixShares(spend);
  cards.forEach((c, i) => {
    c.share = total > 0 ? shares[i] : null;
    c.fraction = total > 0 ? spend[i] / total : 0;
  });
  const mix = cards
    .filter((c) => c.fraction > 0)
    .map((c) => ({ id: c.id, label: c.label, share: c.share, fraction: c.fraction, text: `${c.label} ${shareText(c.share, c.fraction)}` }));
  return { cards, mix };
}

/**
 * Hover card for an amount row (spec "Hover detail cards"). "Adds this year" is the
 * row's allocated dollars, matching the row; "Same things a year ago" is the yearly
 * amount minus that figure. Average rows say "Average spending now", never "You".
 */
export function rowHover(row, referenceMonth, personal) {
  const since = monthLabel(referenceMonth, -1);
  const items = [
    [since ? `Price change since ${since}` : "Price change", row.rateText || "Not available"],
    [personal ? "You pay now" : "Average spending now", `${formatDollars(row.monthly)} a month, ${formatDollars(12 * row.monthly)} a year`],
  ];
  if (row.dollars != null) {
    items.push(["Adds this year", row.addsText]);
    items.push(["Same things a year ago", `${formatDollars(12 * row.monthly - row.dollars)} a year`]);
  } else if (row.renewalMissing) {
    items.push(["Adds this year", "Add your renewal increase"]);
  }
  return { title: row.label, family: row.family, items, lines: [], note: row.about };
}

/** Hover card for a card heading, mix slice or legend item. Never says "Prices overall". */
export function familyHover(card, personal) {
  const adds = card.dollars != null ? signedDollars(card.dollars)
    : card.renewalMissing ? "Add your renewal increase" : "Not available";
  return {
    title: card.label,
    family: card.id,
    items: [
      [personal ? "Share of your spending" : "Share of spending", card.share == null ? "Not available" : shareText(card.share, card.fraction)],
      [personal ? "You pay now" : "Average spending now", `${formatDollars(card.monthly)} a month`],
      ["Price change", card.rateText || "Not available"],
      ["Adds this year", adds],
    ],
    lines: card.biggest ? [card.biggest] : [],
    note: "",
  };
}

/** Hover card for the Your costs bar ("you") or the National / Outside housing bar ("us"). */
export function compareHover(model, which) {
  if (!model.compare) return null;
  if (which === "you") {
    return {
      title: "Your costs",
      items: [["Your rate", model.compare.you.text]],
      lines: [],
      note: "Each amount's price change, weighted by what you spend on it.",
    };
  }
  const owner = model.compare.usLabel === "Outside housing";
  return {
    title: model.compare.usLabel,
    items: [[owner ? "Prices other than housing" : "Prices overall", model.compare.us.text]],
    lines: [],
    note: owner ? OWNER_YARDSTICK : NATIONAL_NOTE,
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test src/calculator/cards.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)" && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 12`, `fail 0`; then the full suite `pass 201`, `fail 0` (`model.test.mjs`'s "labels match the catalog" still passes: labels did not change).

- [ ] **Step 6: Commit**

```bash
git add src/calculator/config.js src/calculator/cards.js src/calculator/cards.test.mjs
git commit -m "feat(calculator): families, about text and the family-cards model" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Quick starts, Undo for them, and fold state for the visit

**Files:**
- Modify: `src/calculator/config.js` (append `QUICK_STARTS`), `src/calculator/model.js` (append `applyQuickStart`), `src/components/Toast.jsx`, `src/views/YourCosts.jsx`, `src/styles/calculator.css` (append)
- Create: `src/calculator/visit.js`, `src/components/QuickStarts.jsx`
- Test: `src/calculator/quickstart.test.mjs`, `src/calculator/visit.test.mjs` (create)

**Interfaces:**
- Consumes: `emptyAnswers`, `isPersonal`, `effectiveChoices`, `activeLines`, `personalRows`, `basis` (`model.js`); `serializeAnswers`, `parseSaved` (`storage.js`).
- Produces:
  - `QUICK_STARTS: { id: "renter"|"family"|"commuter"|"retiree", label, answered: { home, car, heat, health }, also: { daycare, tuition }, amounts: Record<lineId, number> }[]` in `config.js`.
  - `applyQuickStart(answers, quick): answers` in `model.js`: new `answered`, `also`, `amounts` from the quick start; `renewals` copied from `answers`; never mutates either argument.
  - `src/calculator/visit.js`: `createVisit(): { started: boolean, folded: boolean, returning: boolean, open: string[] }`; `foldOnMount(visit, personalOnLoad: boolean): boolean`; `toggleOpen(open: string[], id: string): string[]` (used in Task 6).
  - `Toast` gains prop `message: string` (default `"Answers cleared."`).
  - `QuickStarts({ onPick: (quick) => void })` renders `<section className="quick">` with one `.btn` per quick start and no `aria-pressed`.
  - In `YourCosts.jsx`: `const visit = createVisit()` at module level; the Undo state `cleared` becomes `{ answers, folded, refold: boolean, message, key }`; the answer gets focus target id `"answer"` (exists from Task 5; until then focus falls through harmlessly).

Option ids confirmed against `QUESTIONS` in `config.js` (spec: "the plan must confirm each before building"): home `rent`/`mortgage`/`owned`, car `gas`/`hybrid`/`electric`/`none`, heat `electric`/`gas`/`oil`/`included`, health `work`/`own`/`none`. Every amount edit is on a line `activeLines()` gives that household (the Retiree's hybrid keeps "Gas for the car"); the first test pins this.

- [ ] **Step 1: Write the failing tests.** Create `src/calculator/quickstart.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS, QUICK_STARTS } from "./config.js";
import { emptyAnswers, isPersonal, effectiveChoices, activeLines, personalRows, basis, applyQuickStart } from "./model.js";
import { serializeAnswers, parseSaved } from "./storage.js";
import { fakeData } from "./testdata.mjs";

test("quick starts: real options, edits on lines the household has, and every question answered", () => {
  assert.deepEqual(QUICK_STARTS.map((q) => q.label), ["Young renter", "Family with kids", "Commuter", "Retiree"]);
  for (const quick of QUICK_STARTS) {
    for (const q of QUESTIONS) {
      assert.ok(q.options.some((o) => o.id === quick.answered[q.id]), `${quick.label}: ${q.id}`);
    }
    const answers = applyQuickStart(emptyAnswers(), quick);
    const ids = activeLines(effectiveChoices(answers), answers.also);
    for (const id of Object.keys(quick.amounts)) assert.ok(ids.includes(id), `${quick.label}: ${id} is one of its lines`);
    assert.equal(isPersonal(answers), true);
    assert.equal(basis(answers), "Based on your answers.");
    const rows = personalRows(answers, fakeData());
    for (const [id, v] of Object.entries(quick.amounts)) assert.equal(rows.find((r) => r.id === id).monthly, v);
  }
  assert.deepEqual(QUICK_STARTS.find((q) => q.id === "family").also, { daycare: true, tuition: false });
  assert.equal(QUICK_STARTS.find((q) => q.id === "retiree").answered.health, "none");
});

test("applyQuickStart replaces answers, checkboxes and edits, keeps renewal rates, and leaves the old answers alone", () => {
  const before = {
    answered: { home: "mortgage" }, also: { daycare: true, tuition: true },
    amounts: { mortgage: 2400, rent: 900 }, renewals: { homeIns: 9, health: 4 },
  };
  const snapshot = JSON.parse(JSON.stringify(before));
  const commuter = QUICK_STARTS.find((q) => q.id === "commuter");
  const after = applyQuickStart(before, commuter);
  assert.deepEqual(after.answered, { home: "rent", car: "gas", heat: "electric", health: "work" });
  assert.deepEqual(after.also, { daycare: false, tuition: false });
  assert.deepEqual(after.amounts, { gasoline: 380, carUpkeep: 90 });
  assert.deepEqual(after.renewals, { homeIns: 9, health: 4 });
  assert.deepEqual(before, snapshot, "the answers Undo restores are untouched");
  after.amounts.gasoline = 1;
  after.renewals.health = 1;
  assert.equal(commuter.amounts.gasoline, 380, "edits never write back into the config");
  assert.equal(before.renewals.health, 4);
});

test("a quick start survives saving and reloading", () => {
  for (const quick of QUICK_STARTS) {
    const answers = applyQuickStart(emptyAnswers(), quick);
    assert.deepEqual(parseSaved(serializeAnswers(answers)), answers, quick.label);
  }
});
```

Create `src/calculator/visit.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createVisit, foldOnMount, toggleOpen } from "./visit.js";

test("foldOnMount: the first mount folds on saved answers; later mounts keep the visit's state", () => {
  const v = createVisit();
  assert.equal(foldOnMount(v, true), true);
  assert.equal(v.returning, true);
  assert.equal(foldOnMount(v, false), true, "a remount after a tab switch stays folded");
  v.folded = false; // Change answers
  assert.equal(foldOnMount(v, true), false, "and stays open after Change answers");
  const fresh = createVisit();
  assert.equal(foldOnMount(fresh, false), false);
  assert.equal(fresh.returning, false);
  fresh.folded = true; // a quick start folds the questions
  assert.equal(foldOnMount(fresh, false), true, "a quick start's fold survives a tab switch");
});

test("toggleOpen: which cards are open lasts for the visit, as a new list each time", () => {
  const a = toggleOpen([], "home");
  assert.deepEqual(a, ["home"]);
  const b = toggleOpen(a, "food");
  assert.deepEqual(b, ["home", "food"]);
  assert.deepEqual(toggleOpen(b, "home"), ["food"]);
  assert.deepEqual(a, ["home"], "never mutates");
  assert.deepEqual(createVisit().open, []);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test src/calculator/quickstart.test.mjs src/calculator/visit.test.mjs 2>&1 | grep -E "^not ok|SyntaxError|Cannot find|^ℹ fail"`
Expected: FAIL: `does not provide an export named 'QUICK_STARTS'` and `Cannot find module '…/visit.js'`.

- [ ] **Step 3: Add the quick starts.** Append to `src/calculator/config.js`:

```js
/**
 * Quick-start households (spec "Quick starts"). Tapping one replaces every answer,
 * checkbox and amount edit (renewal rates are kept); all four questions count as
 * answered. Lines without an edit use their normal starting amount. Plain buttons,
 * never toggles: a quick start has no selected state.
 */
export const QUICK_STARTS = [
  {
    id: "renter", label: "Young renter",
    answered: { home: "rent", car: "none", heat: "included", health: "work" },
    also: { daycare: false, tuition: false },
    amounts: { rent: 1450, groceries: 380, dining: 300, fun: 180 },
  },
  {
    id: "family", label: "Family with kids",
    answered: { home: "mortgage", car: "gas", heat: "gas", health: "work" },
    also: { daycare: true, tuition: false },
    amounts: { groceries: 1100, gasoline: 280, dining: 260 },
  },
  {
    id: "commuter", label: "Commuter",
    answered: { home: "rent", car: "gas", heat: "electric", health: "work" },
    also: { daycare: false, tuition: false },
    amounts: { gasoline: 380, carUpkeep: 90 },
  },
  {
    id: "retiree", label: "Retiree",
    answered: { home: "owned", car: "hybrid", heat: "gas", health: "none" },
    also: { daycare: false, tuition: false },
    amounts: { doctor: 220, groceries: 520, gasoline: 90 },
  },
];
```

Append to `src/calculator/model.js`:

```js
/**
 * A quick start (config QUICK_STARTS) replaces every answer, checkbox and amount edit;
 * the renewal rates the person typed are kept. Returns new objects, so the answers the
 * Undo toast holds stay exactly as they were.
 */
export function applyQuickStart(answers, quick) {
  return {
    answered: { ...quick.answered },
    also: { ...quick.also },
    amounts: { ...quick.amounts },
    renewals: { ...answers.renewals },
  };
}
```

Create `src/calculator/visit.js`:

```js
// What lasts for one visit (one page load) but is never saved (spec "Audit and test
// changes": Folding; "Revision 4 layout": which cards are open "lasts for the visit and
// is not saved"). YourCosts keeps one of these at module level, so it survives tab
// switches (App unmounts the view) and resets on reload.

/** A fresh visit: nothing folded, no card open. */
export function createVisit() {
  return { started: false, folded: false, returning: false, open: [] };
}

/**
 * Whether the questions start folded on this mount. The first mount of the visit folds
 * when saved personal answers loaded (Returning); later mounts keep whatever the visit
 * says (a quick start's fold, or Change answers' unfold).
 */
export function foldOnMount(visit, personalOnLoad) {
  if (!visit.started) {
    visit.started = true;
    visit.folded = personalOnLoad;
    visit.returning = personalOnLoad;
  }
  return visit.folded;
}

/** The open family ids after toggling one. Returns a new list. */
export function toggleOpen(open, id) {
  return open.includes(id) ? open.filter((x) => x !== id) : [...open, id];
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test src/calculator/quickstart.test.mjs src/calculator/visit.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 5`, `fail 0`.

- [ ] **Step 5: Let the toast say what it undoes.** In `src/components/Toast.jsx`, replace

```js
 * "Answers cleared. [Undo]" for 8 seconds. The timer pauses while the pointer is
```

with

```js
 * "Answers cleared. [Undo]" (or "Filled in as Commuter. [Undo]") for 8 seconds. The timer pauses while the pointer is
```

replace `export default function Toast({ onUndo, onClose, duration = 8000 }) {` with

```js
export default function Toast({ message = "Answers cleared.", onUndo, onClose, duration = 8000 }) {
```

and replace `      <span>Answers cleared.</span>` with `      <span>{message}</span>`.

- [ ] **Step 6: The quick-start buttons.** Create `src/components/QuickStarts.jsx`:

```jsx
import { QUICK_STARTS } from "../calculator/config.js";

/**
 * "Start from a household like yours" and four plain buttons (spec "Quick starts").
 * Shown in every state. Never a selected state: no aria-pressed, no checkmark.
 */
export default function QuickStarts({ onPick }) {
  return (
    <section className="quick" aria-labelledby="quick-title">
      <h2 id="quick-title">Start from a household like yours</h2>
      <div className="quick-row">
        {QUICK_STARTS.map((q) => (
          <button key={q.id} type="button" className="btn" onClick={() => onPick(q)}>{q.label}</button>
        ))}
      </div>
    </section>
  );
}
```

Append to `src/styles/calculator.css`:

```css
/* Quick starts: plain buttons that fill everything in. Never a selected state. */
.quick { display: grid; gap: 10px; }
.quick h2 { margin: 0; font-weight: 700; font-size: 18px; }
.quick-row { display: flex; flex-wrap: wrap; gap: 8px; }
```

- [ ] **Step 7: Wire them into Your costs.** In `src/views/YourCosts.jsx`:

Replace `import { emptyAnswers, isPersonal } from "../calculator/model.js";` with:

```js
import { emptyAnswers, isPersonal, applyQuickStart } from "../calculator/model.js";
import { createVisit, foldOnMount } from "../calculator/visit.js";
```

Replace `import Questions from "../components/Questions.jsx";` with:

```js
import QuickStarts from "../components/QuickStarts.jsx";
import Questions from "../components/Questions.jsx";
```

Replace

```js
// Fold on the first mount of a page load only; a later remount (tab switch, since
// App unmounts this view on route change) must not re-fold and lose an open toast.
let foldedThisLoad = false;
```

with

```js
// Lasts for the visit, never saved: once the questions fold (saved answers on load, or a
// quick start) they stay folded across tab switches (App unmounts this view on route
// change) until Change answers or Start over.
const visit = createVisit();
```

Replace

```js
  const [folded, setFolded] = useState(() => {
    if (foldedThisLoad) return false;
    foldedThisLoad = true;
    return isPersonal(answers);
  });
```

with

```js
  const [folded, setFoldedState] = useState(() => foldOnMount(visit, isPersonal(answers)));
```

Replace `  const [cleared, setCleared] = useState(null); // { answers, key } while the Undo toast is up` with:

```js
  const [cleared, setCleared] = useState(null); // { answers, folded, refold, message, key } while the Undo toast is up
```

Replace everything from `  const toQuestions = () => {` through the closing `  };` of `undo` with:

```js
  const fold = (value) => {
    visit.folded = value;
    setFoldedState(value);
  };
  // A quick start replaces everything the person entered (renewal rates are kept), so it
  // offers Undo like Start over. Undo also puts the questions back as they were.
  const onQuickStart = (quick) => {
    setCleared((c) => ({ answers, folded, refold: true, message: `Filled in as ${quick.label}.`, key: (c?.key ?? 0) + 1 }));
    setAnswers((prev) => applyQuickStart(prev, quick));
    visit.returning = false;
    fold(true);
    setPendingFocus("answer");
  };
  const toQuestions = () => {
    fold(false);
    setPendingFocus("questions");
  };
  const startOver = () => {
    setCleared((c) => ({ answers, folded: false, refold: false, message: "Answers cleared.", key: (c?.key ?? 0) + 1 }));
    setAnswers(emptyAnswers());
    visit.returning = false;
    fold(false);
    setShowAll(false);
    setPendingFocus("undo-button");
  };
  const undo = () => {
    if (cleared) {
      setAnswers(cleared.answers);
      if (cleared.refold) fold(cleared.folded);
    }
    setCleared(null);
    setPendingFocus(cleared?.refold && cleared.folded ? "answer" : "questions");
  };
```

Replace `        <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={folded} />` with:

```jsx
        <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={folded && visit.returning} />
```

Replace `        <div className="questions-area">` with:

```jsx
        <div className="questions-area">
          <QuickStarts onPick={onQuickStart} />
```

Replace `      {cleared && <Toast key={cleared.key} onUndo={undo} onClose={closeToast} />}` with:

```jsx
      {cleared && <Toast key={cleared.key} message={cleared.message} onUndo={undo} onClose={closeToast} />}
```

(The quick starts sit at the top of the questions area for now; Task 5 moves them under the strip.)

- [ ] **Step 8: Run tests, build, smoke**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built in|error"`
Expected: `pass 206`, `fail 0`, `✓ built in …`.

Start the preview (see *Preview procedure*), then:

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 900})
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4719/inflation-reality/"); pg.wait_for_selector("#page-title")
    pressed = [x.get_attribute("aria-pressed") for x in pg.locator(".quick .btn").all()]
    pg.get_by_role("button", name="Commuter", exact=True).click(); pg.wait_for_timeout(200)
    print("quick", len(pressed), set(pressed), "summary", pg.locator(".summary").count(), "toast", pg.locator(".toast span").text_content())
    pg.get_by_role("button", name="Undo").click(); pg.wait_for_timeout(200)
    print("after undo summary", pg.locator(".summary").count(), "questions", pg.locator("#questions").count(), errs)
    b.close()
EOF
kill "$(cat /tmp/ir-preview.pid)"
```

Expected: `quick 4 {None} summary 1 toast Filled in as Commuter.` then `after undo summary 0 questions 1 []`.

- [ ] **Step 9: Commit**

```bash
git add src/calculator/config.js src/calculator/model.js src/calculator/visit.js src/calculator/quickstart.test.mjs src/calculator/visit.test.mjs src/components/QuickStarts.jsx src/components/Toast.jsx src/views/YourCosts.jsx src/styles/calculator.css
git commit -m "feat(your-costs): quick-start households with Undo; questions stay folded for the visit" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The shared hover card (`useHover`, `HoverCard`, `placeCard`, `marks.css`)

**Files:**
- Create: `src/components/useMedia.js`, `src/components/useHover.js`, `src/components/placeCard.js`, `src/components/HoverCard.jsx`, `src/styles/marks.css`
- Modify: `src/main.jsx`
- Test: `src/components/placeCard.test.mjs` (create)

**Interfaces:**
- Consumes: `HoverContent` (Task 2).
- Produces:
  - `useMediaQuery(query: string): boolean` and `useReducedMotion(): boolean` (`useMedia.js`), both correct on the first render.
  - `useHover.js`: `export const CARD_ID = "hover-card"`; `isMouse(e): boolean` (mouse or pen); `useHover(): { state: { key, el, pinned, family } | null, show(key, el, { family?, pinned? }), hide(), target(key, family = null, { focus = true, tap = false, describe = true } = {}): props, wide: boolean }`. `target()` returns props to spread on a hover target: `aria-describedby` (only while its card is open, and only with `describe`; a target whose focus lands on inner controls passes `describe: false` and puts it on them), `onPointerEnter`, `onPointerMove`, `onPointerLeave` (mouse and pen only), `onFocus`/`onBlur` (opens only when `wide`, i.e. ≥ 600px, and never within 600ms of a touch, so a tapped box on a tablet opens nothing), and with `tap` an `onClick` that pins the card. Escape, a tap elsewhere and scrolling close it (scrolling keeps a pinned card, and a card whose target holds focus).
  - `placeCard(rect, w, h, vw, vh, gap = 8, margin = 16): { x, y }`.
  - `HoverCard({ anchor: Element|null, content: HoverContent|null })` (default export; renders `#hover-card.hover-card[role=tooltip]`) and `HoverCardBody({ content })` (named export, reused by the trend chart in Task 8).
  - CSS: `[data-family="<id>"]` and `[data-publisher="<id>"]` set `--c`; `.dot`; `.hover-card`, `.hc-title`, `.hc-item`, `.hc-line`, `.hc-note`; focus rings for every new target class.

- [ ] **Step 1: Write the failing test.** Create `src/components/placeCard.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { placeCard } from "./placeCard.js";

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test("placeCard: centered above the target", () => {
  assert.deepEqual(placeCard(rect(500, 400, 100, 40), 200, 120, 1280, 900), { x: 450, y: 272 });
});

test("placeCard: below when there is no room above, and never past the bottom", () => {
  assert.deepEqual(placeCard(rect(500, 60, 100, 40), 200, 120, 1280, 900), { x: 450, y: 108 });
  assert.deepEqual(placeCard(rect(500, 60, 100, 800), 200, 120, 1280, 900), { x: 450, y: 764 });
});

test("placeCard: kept 16px inside the viewport at the edges and on a phone", () => {
  assert.equal(placeCard(rect(0, 400, 40, 40), 200, 120, 390, 800).x, 16);
  assert.equal(placeCard(rect(370, 400, 20, 40), 200, 120, 390, 800).x, 174);
  assert.equal(placeCard(rect(100, 400, 40, 40), 400, 120, 390, 800).x, 16, "wider than the room: pinned to the left margin");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/components/placeCard.test.mjs 2>&1 | tail -3`
Expected: FAIL, `Cannot find module '…/src/components/placeCard.js'`.

- [ ] **Step 3: Write `src/components/placeCard.js`**

```js
/**
 * Where the hover card goes (spec "Hover detail cards"): centered above its target,
 * below it when there is no room above, and kept `margin` px inside the viewport.
 * rect is the target's getBoundingClientRect(); w and h are the card's size.
 */
export function placeCard(rect, w, h, vw, vh, gap = 8, margin = 16) {
  const x = Math.min(Math.max(margin, rect.left + rect.width / 2 - w / 2), Math.max(margin, vw - w - margin));
  let y = rect.top - h - gap;
  if (y < margin) y = rect.bottom + gap;
  y = Math.min(y, Math.max(margin, vh - h - margin));
  return { x, y };
}
```

- [ ] **Step 4: Run it**

Run: `node --test src/components/placeCard.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 3`, `fail 0`.

- [ ] **Step 5: Media-query hooks.** Create `src/components/useMedia.js`:

```js
import { useEffect, useState } from "react";

const matches = (query) => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);

/** Whether a media query matches, right from the first render, and kept current. */
export function useMediaQuery(query) {
  const [on, setOn] = useState(() => matches(query));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return on;
}

/** prefers-reduced-motion: reduce. JavaScript motion (count-ups, Recharts) checks this; CSS uses the media query. */
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
```

- [ ] **Step 6: The hover state.** Create `src/components/useHover.js`:

```js
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./useMedia.js";

export const CARD_ID = "hover-card";

/** Mouse and pen hover opens cards; touch never does (a finger on a row is moving its slider). */
export const isMouse = (e) => e.pointerType === "mouse" || e.pointerType === "pen";

/**
 * Shared hover-card state for one view (spec "Hover detail cards"). The state holds a
 * key ("row:gasoline", "fam:home", …), the element pointed at, whether a tap pinned it,
 * and the family to highlight. It never holds content: the view renders the content
 * from the key on every render, so an open card follows its slider live.
 *
 * Opens on mouse or pen hover; on keyboard focus only at 600px and wider (on phones a
 * fixed card would cover the on-screen keyboard); on tap only for targets that ask for
 * it (`tap`), which pins the card. Closes on pointer leave, focus leaving, Escape, a tap
 * elsewhere, or scrolling (except a pinned card, or one whose target holds focus: a
 * deliberate deviation from the spec, since focusing an off-screen row scrolls the page).
 * A tap that focuses a control on a touch tablet never opens a card: the last pointer is
 * recorded, and focus within 600ms of a touch is ignored (:focus-visible can't tell,
 * because text inputs always match it).
 */
export function useHover() {
  const [state, setState] = useState(null);
  const ref = useRef(null);
  ref.current = state;
  const wide = useMediaQuery("(min-width: 600px)");
  const lastPointer = useRef({ type: "", at: -Infinity });

  useEffect(() => {
    const record = (e) => { lastPointer.current = { type: e.pointerType, at: performance.now() }; };
    document.addEventListener("pointerdown", record, true);
    return () => document.removeEventListener("pointerdown", record, true);
  }, []);
  const touchedJustNow = () => lastPointer.current.type === "touch" && performance.now() - lastPointer.current.at < 600;

  const show = useCallback((key, el, { family = null, pinned = false } = {}) => {
    setState({ key, el, family, pinned });
  }, []);
  const hide = useCallback(() => setState(null), []);

  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setState(null); };
    const onScroll = () => {
      const s = ref.current;
      if (s && !s.pinned && !s.el.contains(document.activeElement)) setState(null);
    };
    const onDown = (e) => {
      const s = ref.current;
      if (s?.pinned && !s.el.contains(e.target)) setState(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [state]);

  /** Props for a hover target. A moved mouse brings back a card that scrolling closed. */
  const target = (key, family = null, { focus = true, tap = false, describe = true } = {}) => ({
    ...(describe ? { "aria-describedby": state?.key === key ? CARD_ID : undefined } : {}),
    onPointerEnter: (e) => { if (isMouse(e)) show(key, e.currentTarget, { family }); },
    onPointerMove: (e) => { if (isMouse(e) && ref.current?.key !== key) show(key, e.currentTarget, { family }); },
    onPointerLeave: (e) => {
      if (isMouse(e) && !ref.current?.pinned && !e.currentTarget.contains(document.activeElement)) hide();
    },
    ...(focus ? {
      onFocus: (e) => { if (wide && !touchedJustNow()) show(key, e.currentTarget, { family }); },
      onBlur: (e) => { if (!e.currentTarget.contains(e.relatedTarget) && ref.current?.key === key) hide(); },
    } : {}),
    ...(tap ? { onClick: (e) => show(key, e.currentTarget, { family, pinned: true }) } : {}),
  });

  return { state, show, hide, target, wide };
}
```

- [ ] **Step 7: The card.** Create `src/components/HoverCard.jsx`:

```jsx
import { useLayoutEffect, useRef } from "react";
import { CARD_ID } from "./useHover.js";
import { placeCard } from "./placeCard.js";

/**
 * Hover-card text: a heading with the family (or publisher) dot, label and value rows,
 * full-width lines, and one plain note. Shared by the fixed HoverCard and the trend
 * chart's tooltip. content: { title, family?, publisher?, items: [dt, dd][], lines: string[], note }.
 * Divs, not paragraphs, so the tabs' paragraph margins never reach inside the card.
 */
export function HoverCardBody({ content }) {
  const mark = content.family || content.publisher;
  return (
    <>
      <div className="hc-title">
        {mark && (
          <span className="dot" data-family={content.family || undefined} data-publisher={content.publisher || undefined} aria-hidden="true" />
        )}
        {content.title}
      </div>
      {content.items.length > 0 && (
        <dl>
          {content.items.map(([dt, dd]) => (
            <div className="hc-item" key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>
          ))}
        </dl>
      )}
      {(content.lines ?? []).map((line) => <div className="hc-line" key={line}>{line}</div>)}
      {content.note && <div className="hc-note">{content.note}</div>}
    </>
  );
}

/**
 * The one hover card per view: fixed, above its target (below when there is no room),
 * kept 16px inside the viewport, role="tooltip". With the toast, the only element with a
 * shadow. The view passes the anchor and fresh content on every render; placement runs
 * before paint, and again on scroll (a pinned card) and resize.
 */
export default function HoverCard({ anchor, content }) {
  const ref = useRef(null);
  const open = Boolean(anchor && anchor.isConnected && content);
  useLayoutEffect(() => {
    const card = ref.current;
    if (!open || !card) return undefined;
    const place = () => {
      const { x, y } = placeCard(anchor.getBoundingClientRect(), card.offsetWidth, card.offsetHeight, window.innerWidth, window.innerHeight);
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
    };
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  });
  if (!open) return null;
  return (
    <div ref={ref} id={CARD_ID} className="hover-card" role="tooltip">
      <HoverCardBody content={content} />
    </div>
  );
}
```

- [ ] **Step 8: Marks and card styles.** Create `src/styles/marks.css`:

```css
/* Marks (spec "Revision 4": Families, Hover detail cards). Family and publisher colors
   reach elements only through --c, set here from data attributes, and paint marks
   (dots, bars, slider fills, tints, slices), never text. Colors live in tokens.css. */

[data-family="home"] { --c: var(--f-home); }
[data-family="around"] { --c: var(--f-around); }
[data-family="food"] { --c: var(--f-food); }
[data-family="util"] { --c: var(--f-util); }
[data-family="fun"] { --c: var(--f-fun); }
[data-family="health"] { --c: var(--f-health); }
[data-family="kids"] { --c: var(--f-kids); }
[data-family="rest"] { --c: var(--f-rest); }
[data-publisher="labor"] { --c: var(--p-labor); }
[data-publisher="commerce"] { --c: var(--p-commerce); }
[data-publisher="cleveland"] { --c: var(--p-cleveland); }
[data-publisher="atlanta"] { --c: var(--p-atlanta); }
[data-publisher="dallas"] { --c: var(--p-dallas); }

.dot { display: inline-block; flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--c); }

/* The shared hover card. Text is --ink / --ink-2 on --surface. */
.hover-card {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 20;
  width: max-content;
  max-width: min(340px, calc(100vw - 32px));
  padding: 10px 12px;
  font-size: 15px;
  line-height: 1.4;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 8px;
  box-shadow: var(--shadow);
  pointer-events: none;
}
.hc-title { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-weight: 700; }
.hover-card dl { display: grid; gap: 2px; margin: 0; }
.hc-item { display: flex; justify-content: space-between; gap: 16px; }
.hc-item dt { color: var(--ink-2); white-space: nowrap; }
.hc-item dd { margin: 0; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
.hc-line { margin-top: 6px; font-weight: 600; }
.hc-note { margin-top: 8px; font-size: 13px; color: var(--ink-2); }

/* Focus rings for the revision 4 targets: the same ring as every other control. */
.lg:focus-visible,
.fam-head:focus-visible,
.slider:focus-visible,
.chip:focus-visible,
.bar-track[tabindex]:focus-visible,
.amt.avg:focus-visible,
.mrow:focus-visible,
.bar-row:focus-visible,
.stat:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
```

In `src/main.jsx`, replace `import "./styles/tabs.css";` with:

```js
import "./styles/tabs.css";
import "./styles/marks.css";
```

- [ ] **Step 9: Run tests and build**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built in|error"`
Expected: `pass 209`, `fail 0` (the literal-color scan now covers `marks.css`, `useHover.js`, `useMedia.js`, `placeCard.js`, `HoverCard.jsx`), `✓ built in …`. Nothing renders a card yet; Tasks 5, 6, 8 and 9 mount it.

- [ ] **Step 10: Commit**

```bash
git add src/components/useMedia.js src/components/useHover.js src/components/placeCard.js src/components/placeCard.test.mjs src/components/HoverCard.jsx src/styles/marks.css src/main.jsx
git commit -m "feat(ui): shared hover card, hover state hook and family marks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The sticky result strip; the panel list, prompts and phone dock go

**Files:**
- Create: `src/components/ResultStrip.jsx`
- Delete: `src/components/ResultPanel.jsx`, `src/components/Dock.jsx`
- Modify: `src/calculator/panel.js` (the `panelModel` block), `src/calculator/panel.test.mjs`, `src/shell.test.mjs` (append), `src/views/YourCosts.jsx` (whole file), `src/styles/calculator.css` (whole file), `src/styles/tokens.css` (the `html` block)

**Interfaces:**
- Consumes: `familyCards`, `familyHover`, `compareHover` (Task 2); `QuickStarts`, `applyQuickStart`, `createVisit`, `foldOnMount`, Toast `message` (Task 3); `useHover`, `HoverCard`, `useMediaQuery` (Task 4).
- Produces:
  - `panel.js`: `answerSentence(total: number): string`. `panelModel()` no longer returns `top`, `smaller`, `allCount`, `prompts` or `actionLabel`; it still returns `title, answer, ratesLine, zero, total, compare, verdict, basis, main, rest, bars`. `TOP_ROWS` is gone.
  - `ResultStrip({ model, mix, personal, wide, hover, highlight, onAnswerQuestions, stripRef })`: renders `section.strip` (`h2#result-title`, `p.answer#answer[tabindex=-1]`, `.compare` with two focusable `.bar-track`s, and at ≥ 900px `.rates`, `.verdict`, the button and `.strip-side > .mix`), plus `div.strip-more` under 900px. The mix is `div.mix` (`.dim` while a family is highlighted) holding `.mix-bar > span.slice[data-family]` and `.mix-legend > button.lg` ("Home 41%").
  - Hover keys used from here on: `"fam:<familyId>"`, `"cmp:you"`, `"cmp:us"` (Task 6 adds `"row:<rowId>"`).
  - The CSS variable `--strip-h` on `<html>` while Your costs is mounted.

- [ ] **Step 1: Update the panel tests (they fail first).** In `src/calculator/panel.test.mjs`:

Replace `import { panelModel, ledeText, summaryText, finePrint, TOP_ROWS } from "./panel.js";` with:

```js
import { panelModel, ledeText, summaryText, finePrint, answerSentence } from "./panel.js";
```

Replace

```js
// Every dollar row the panel shows, counted once: top rows + smaller items + Everything else.
function shownSum(m) {
  return m.top.reduce((s, r) => s + r.dollars, 0) + (m.smaller?.dollars ?? 0) + (m.rest?.dollars ?? 0);
}
```

with

```js
// Every dollar row the model carries, counted once: every line in main + Everything else.
function shownSum(m) {
  return m.main.reduce((s, r) => s + r.dollars, 0) + (m.rest?.dollars ?? 0);
}
```

Replace the whole first test (from `test("average panel: title, answer, national line, 6 rows + smaller items + Everything else, no bars/verdict/basis", () => {` through its closing `});`) with:

```js
test("average panel: title, answer, national line, every line + Everything else, no bars/verdict/basis", () => {
  const data = fakeData();
  const m = panelModel({
    mode: "average", rows: averageRows(data, 5750), headlinePct: 3.4, referenceMonth: "2026-08", answers: emptyAnswers(),
  });
  assert.equal(m.title, "The average U.S. household vs. August 2025");
  assert.equal(m.answer, "About $2,250 more a year");
  assert.equal(m.ratesLine, "Prices overall rose 3.4%.");
  assert.equal(m.compare, null);
  assert.equal(m.verdict, null);
  assert.equal(m.basis, null);
  assert.equal(m.bars, false);
  assert.equal(m.rest.label, "Everything else");
  assert.equal(m.rest.note, "Estimated from the national rate");
  assert.equal(m.main.length, 8);
  assert.ok(m.main.every((r, i) => i === 0 || m.main[i - 1].abs >= r.abs), "sorted by absolute dollars");
  for (const gone of ["top", "smaller", "allCount", "prompts", "actionLabel"]) assert.ok(!(gone in m), `${gone} is gone`);
  assert.equal(shownSum(m), m.total);
});
```

Replace `test("personal panel with a mortgage: 0% line, prompt for home insurance, basis, verdict", () => {` with:

```js
test("personal panel with a mortgage: 0% line, home insurance off the total, basis, verdict", () => {
```

Delete the line `  assert.equal(m.actionLabel, "Change answers");`. Replace `  assert.deepEqual(m.prompts, [{ id: "homeIns", text: "Home insurance: add your renewal increase" }]);` with:

```js
  assert.ok(!m.main.some((r) => r.id === "homeIns"), "an empty renewal line is off the rows (its card row says so)");
```

Replace every `  assert.deepEqual(m.top, []);` (three places) with `  assert.deepEqual(m.main, []);`.

Append:

```js
test("answerSentence: more, less, about the same", () => {
  assert.equal(answerSentence(1450), "About $1,450 more a year");
  assert.equal(answerSentence(-150), "About $150 less a year");
  assert.equal(answerSentence(0), "About the same as a year ago");
});
```

Append to `src/shell.test.mjs`:

```js
test("revision 4 removals stay removed: dock, result panel list, renewal prompt rows", () => {
  for (const gone of ["components/Dock.jsx", "components/ResultPanel.jsx"]) {
    assert.ok(!existsSync(resolve(here, gone)), `${gone} is deleted`);
  }
  const view = readFileSync(resolve(here, "views/YourCosts.jsx"), "utf8");
  for (const word of ["IntersectionObserver", "openRenewal", "showAll", "Dock", "ResultPanel"]) {
    assert.ok(!view.includes(word), `YourCosts.jsx still has ${word}`);
  }
  const panel = readFileSync(resolve(here, "calculator/panel.js"), "utf8");
  for (const word of ["TOP_ROWS", "smaller", "allCount", "prompts"]) {
    assert.ok(!panel.includes(word), `panel.js still has ${word}`);
  }
  const css = readdirSync(join(here, "styles")).filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(here, "styles", f), "utf8")).join("\n");
  for (const sel of [".dock", ".prompts", "scroll-padding-bottom"]) {
    assert.ok(!css.includes(sel), `CSS still has ${sel}`);
  }
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: FAIL. `panel.test.mjs` fails to load (`does not provide an export named 'answerSentence'`) and `revision 4 removals …` fails (`components/Dock.jsx is deleted`).

- [ ] **Step 3: Trim the panel model.** In `src/calculator/panel.js`, replace everything from `/** Rows shown before "N smaller items"` through the closing `}` of `panelModel` with:

```js
const UNAVAILABLE = "Average household figures are not available right now.";

/** "About $1,450 more a year", "About $120 less a year", "About the same as a year ago". total is already rounded to $50. */
export function answerSentence(total) {
  if (total > 0) return `About ${formatDollars(total)} more a year`;
  if (total < 0) return `About ${formatDollars(total)} less a year`;
  return "About the same as a year ago";
}

/**
 * Everything the result strip says, plus every line as rounded dollars. `main` holds the
 * lines other than Everything else, largest dollars first, and `rest` holds Everything
 * else; the family cards regroup them (cards.js) and the .xlsx personal sheet reads them
 * as they are (src/tabs/workbook.js).
 * @param {object} p
 * @param {"average"|"personal"} p.mode
 * @param {object[]|null} p.rows  personalRows() or averageRows() output; null = basket unusable
 * @param {number|null} p.headlinePct  data.headline.yoy
 * @param {number|null} [p.exShelterPct]  data.lines.exShelter.yoy, the owners' yardstick
 * @param {string|null} p.referenceMonth  "YYYY-MM"
 * @param {object} p.answers
 */
export function panelModel({ mode, rows, headlinePct, exShelterPct = null, referenceMonth, answers }) {
  const personal = mode === "personal";
  const title = `${personal ? "Your costs" : "The average U.S. household"} vs. ${monthLabel(referenceMonth, -1)}`;
  const nationalLine = headlinePct == null ? "" : `Prices overall ${movePhrase(headlinePct)}.`;
  const empty = { title, compare: null, verdict: null, basis: null, main: [], rest: null, bars: personal };

  if (rows == null) return { ...empty, answer: UNAVAILABLE, ratesLine: nationalLine, zero: false };

  const result = computeResult(rows);
  const basisText = personal ? basis(answers) : null;

  if (result.totalAnnual === 0) {
    const dataMissing = result.lines.length === 0 && result.excluded.some((r) => r.missing === "data");
    return {
      ...empty, basis: basisText, zero: true,
      answer: dataMissing ? "Price data is not available right now." : "Enter your monthly amounts to see your estimate.",
      ratesLine: nationalLine,
    };
  }

  const total = roundToStep(result.totalExtra, 50);
  const answer = answerSentence(total);
  // The national rate counts what owners would pay to rent their own home, a cost
  // owners never pay in cash, so owners are measured against prices other than housing.
  const home = personal ? effectiveChoices(answers).home : null;
  const owner = (home === "owned" || home === "mortgage") && exShelterPct != null;
  const yard = owner
    ? { pct: exShelterPct, line: `Prices other than housing ${movePhrase(exShelterPct)}.`, name: "prices other than housing", label: "Outside housing" }
    : { pct: headlinePct, line: nationalLine, name: "the national rate", label: "National" };
  const ratesLine = personal && result.rate != null
    ? `Your costs ${movePhrase(result.rate)}. ${yard.line}`.trim()
    : nationalLine;

  const dollars = allocateRounded(result.lines.map((l) => l.extra), total);
  const bars = barGeometry(result.lines.map((l) => l.extra));
  const display = result.lines.map((l, i) => ({
    id: l.id,
    label: l.label,
    note: l.note,
    quiet: l.id === "rest",
    rateText: formatRate(l.rate, { fixed: l.id === "mortgage" }),
    dollars: dollars[i],
    dollarText: l.extra !== 0 && Math.abs(l.extra) < 5 ? "under $10" : signedDollars(dollars[i]),
    bar: bars[i],
    abs: Math.abs(l.extra),
    order: i,
  }));
  const main = display
    .filter((r) => !r.quiet)
    .sort((a, b) => b.abs - a.abs || a.order - b.order);
  const rest = display.find((r) => r.quiet) ?? null;

  let compare = null;
  if (personal && result.rate != null && yard.pct != null) {
    const [you, us] = barGeometry([result.rate, yard.pct]);
    compare = {
      you: { text: formatRate(result.rate), bar: you },
      us: { text: formatRate(yard.pct), bar: us },
      usLabel: yard.label,
    };
  }

  return {
    ...empty,
    answer,
    ratesLine,
    zero: false,
    total,
    compare,
    verdict: personal ? verdict(result, yard.pct, yard.name) : null,
    basis: basisText,
    main,
    rest,
  };
}
```

Also change the file's first comment line from `// Everything the result panel, lede, summary and fine print display, as plain data.` to `// Everything the result strip, lede, summary and fine print display, as plain data.`

- [ ] **Step 4: Write `src/components/ResultStrip.jsx`**

```jsx
/** A bar from zero: right for increases, left for decreases (spec "Numbers"). */
function Bar({ bar, kind }) {
  return <span className={`bar ${kind}`} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />;
}

/** Your costs vs. the yardstick. Each bar is a hover target and, for keyboard users, a tab stop. */
function Compare({ compare, hover }) {
  return (
    <div className="compare">
      <span>Your costs</span>
      <span className="bar-track" tabIndex={0} role="img" aria-label={`Your costs ${compare.you.text}`} {...hover.target("cmp:you")}>
        <Bar bar={compare.you.bar} kind="you" />
      </span>
      <span className="cmp-val">{compare.you.text}</span>
      <span>{compare.usLabel}</span>
      <span className="bar-track" tabIndex={0} role="img" aria-label={`${compare.usLabel} ${compare.us.text}`} {...hover.target("cmp:us")}>
        <Bar bar={compare.us.bar} kind="us" />
      </span>
      <span className="cmp-val">{compare.us.text}</span>
    </div>
  );
}

/**
 * The spending mix (spec "Revision 4 layout"): one slice per family with spending, in
 * family order, sized by its share, and a legend ("Home 41%"). Slices open a card on
 * hover or tap; keyboard users reach the same cards through the legend buttons.
 */
function MixBar({ mix, hover, highlight }) {
  return (
    <div className={highlight ? "mix dim" : "mix"}>
      <div className="mix-bar" aria-hidden="true">
        {mix.map((s) => (
          <span
            key={s.id}
            className={highlight === s.id ? "slice hl" : "slice"}
            data-family={s.id}
            style={{ flexGrow: s.fraction }}
            {...hover.target(`fam:${s.id}`, s.id, { focus: false, tap: true })}
          />
        ))}
      </div>
      <div className="mix-legend" role="group" aria-label="Spending by kind">
        {mix.map((s) => (
          <button
            key={s.id}
            type="button"
            className={highlight === s.id ? "lg hl" : "lg"}
            data-family={s.id}
            {...hover.target(`fam:${s.id}`, s.id, { tap: true })}
          >
            <span className="dot" aria-hidden="true" />
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The sticky result strip, the view's one bordered raised surface. At 900px and wider it
 * has two columns: title, answer, rates line, bars and verdict on the left, the spending
 * mix on the right. Narrower, only the title, answer and bars stick; the rates line,
 * verdict, mix and the Average state's button go in .strip-more right after it, because
 * a sticky element only sticks inside its parent and these must scroll away.
 */
export default function ResultStrip({ model, mix, personal, wide, hover, highlight, onAnswerQuestions, stripRef }) {
  const rates = model.ratesLine ? <p className="rates">{model.ratesLine}</p> : null;
  const verdict = model.verdict ? <p className="verdict">{model.verdict}</p> : null;
  const action = personal ? null : (
    <button type="button" className="btn" onClick={onAnswerQuestions}>Answer the questions</button>
  );
  const mixBar = mix.length > 0 ? <MixBar mix={mix} hover={hover} highlight={highlight} /> : null;
  return (
    <>
      <section className="strip" ref={stripRef} aria-labelledby="result-title">
        <div className="strip-main">
          <h2 id="result-title">{model.title}</h2>
          <p className="answer" id="answer" tabIndex={-1}>{model.answer}</p>
          {wide && rates}
          {model.compare && <Compare compare={model.compare} hover={hover} />}
          {wide && verdict}
          {wide && action}
        </div>
        {wide && mixBar && <div className="strip-side">{mixBar}</div>}
      </section>
      {!wide && (rates || verdict || mixBar || action) && (
        <div className="strip-more">{rates}{verdict}{mixBar}{action}</div>
      )}
    </>
  );
}
```

- [ ] **Step 5: Rewrite the view.** Replace the whole of `src/views/YourCosts.jsx` with:

```jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASKET } from "../data/catalog.js";
import { emptyAnswers, isPersonal, applyQuickStart } from "../calculator/model.js";
import { summaryText, finePrint } from "../calculator/panel.js";
import { familyCards, familyHover, compareHover } from "../calculator/cards.js";
import { createVisit, foldOnMount } from "../calculator/visit.js";
import { estimateFor } from "../tabs/estimate.js";
import { getStorage, storageAvailable, loadAnswers, saveAnswers } from "../calculator/storage.js";
import YourCostsIntro from "./YourCostsIntro.jsx";
import ResultStrip from "../components/ResultStrip.jsx";
import QuickStarts from "../components/QuickStarts.jsx";
import Questions from "../components/Questions.jsx";
import Summary from "../components/Summary.jsx";
import Amounts from "../components/Amounts.jsx";
import Toast from "../components/Toast.jsx";
import LiveRegion from "../components/LiveRegion.jsx";
import HoverCard from "../components/HoverCard.jsx";
import { useHover } from "../components/useHover.js";
import { useMediaQuery } from "../components/useMedia.js";

const withPeriod = (s) => (s.endsWith(".") ? s : `${s}.`);
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Lasts for the visit, never saved: once the questions fold (saved answers on load, or a
// quick start) they stay folded across tab switches (App unmounts this view on route
// change) until Change answers or Start over.
const visit = createVisit();

/**
 * The Your costs tab (spec "Revision 4 layout"): headline, the sticky result strip,
 * basis, quick starts, the questions (or the Summary), the monthly amounts, fine print.
 * States (spec "States"): Average until any answer or checkbox, then Personal; a load
 * with saved personal answers starts folded (Returning).
 */
export default function YourCosts({ data, base, onNavigate }) {
  const storage = useMemo(getStorage, []);
  const canSave = useMemo(() => storageAvailable(storage), [storage]);
  const [answers, setAnswers] = useState(() => loadAnswers(storage) ?? emptyAnswers());
  const [folded, setFoldedState] = useState(() => foldOnMount(visit, isPersonal(answers)));
  const [amountsOpen, setAmountsOpen] = useState(false);
  const [cleared, setCleared] = useState(null); // { answers, folded, refold, message, key } while the Undo toast is up
  const [pendingFocus, setPendingFocus] = useState(null);
  const stripRef = useRef(null);
  const wide = useMediaQuery("(min-width: 900px)");
  const hover = useHover();

  // One source for the strip's numbers, shared with the spreadsheet download.
  const { mode, rows, model } = useMemo(() => estimateFor(answers, data), [answers, data]);
  const personal = mode === "personal";
  const fine = useMemo(() => finePrint({ mode, rows, data }), [mode, rows, data]);
  const { cards, mix } = useMemo(() => familyCards({ mode, rows, model, answers }), [mode, rows, model, answers]);

  useEffect(() => {
    if (canSave) saveAnswers(storage, answers);
  }, [answers, canSave, storage]);

  // Focused controls and in-page jumps must land below the sticky strip, whose height
  // changes with its content: keep it in a CSS variable that scroll-padding-top reads.
  useEffect(() => {
    const el = stripRef.current;
    const root = document.documentElement;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      root.style.setProperty("--strip-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--strip-h");
    };
  }, []);

  // Move focus after the render that makes the target exist (unfolded questions, the
  // answer after a quick start, the Undo toast). The toast and the answer skip
  // scrollIntoView: the toast so Start over on a phone doesn't jump the page, the answer
  // because it sits in the sticky strip, which is always on screen.
  useEffect(() => {
    if (!pendingFocus) return;
    const el = document.getElementById(pendingFocus);
    if (el) {
      el.focus({ preventScroll: true });
      if (pendingFocus !== "undo-button" && pendingFocus !== "answer") {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  // Any real change to the answers closes a pending Undo toast, so Undo can never
  // silently overwrite newer answers with the earlier ones.
  const update = (fn) => {
    setAnswers((prev) => fn(prev));
    setCleared(null);
  };
  const onAnswer = (qid, option) => update((a) => ({ ...a, answered: { ...a.answered, [qid]: option } }));
  const onAlso = (id, checked) => update((a) => ({ ...a, also: { ...a.also, [id]: checked } }));
  const onAmount = (id, value) => update((a) => ({ ...a, amounts: { ...a.amounts, [id]: value } }));
  const onRenewal = (id, value) => update((a) => ({ ...a, renewals: { ...a.renewals, [id]: value } }));

  const fold = (value) => {
    visit.folded = value;
    setFoldedState(value);
  };
  // A quick start replaces everything the person entered (renewal rates are kept), so it
  // offers Undo like Start over. Undo also puts the questions back as they were.
  const onQuickStart = (quick) => {
    setCleared((c) => ({ answers, folded, refold: true, message: `Filled in as ${quick.label}.`, key: (c?.key ?? 0) + 1 }));
    setAnswers((prev) => applyQuickStart(prev, quick));
    visit.returning = false;
    fold(true);
    setPendingFocus("answer");
  };
  const toQuestions = () => {
    fold(false);
    setPendingFocus("questions");
  };
  const startOver = () => {
    setCleared((c) => ({ answers, folded: false, refold: false, message: "Answers cleared.", key: (c?.key ?? 0) + 1 }));
    setAnswers(emptyAnswers());
    visit.returning = false;
    fold(false);
    setPendingFocus("undo-button");
  };
  const undo = () => {
    if (cleared) {
      setAnswers(cleared.answers);
      if (cleared.refold) fold(cleared.folded);
    }
    setCleared(null);
    setPendingFocus(cleared?.refold && cleared.folded ? "answer" : "questions");
  };
  // Also covers the toast closing on its own (its timer never runs while focus is
  // inside it, but this stays correct if that ever changes): don't strand focus on
  // a node that's about to unmount.
  const closeToast = useCallback(() => {
    const insideToast = document.activeElement?.closest?.(".toast");
    setCleared(null);
    if (insideToast) setPendingFocus("questions");
  }, []);

  const highlight = hover.state?.family ?? null;
  // Card content comes from the latest numbers on every render, so an open card
  // follows its slider live (spec "Hover detail cards").
  const hoverContent = (key) => {
    if (!key) return null;
    const [kind, id] = key.split(":");
    if (kind === "fam") {
      const card = cards.find((c) => c.id === id);
      return card ? familyHover(card, personal) : null;
    }
    if (kind === "cmp") return compareHover(model, id);
    return null;
  };

  const liveText = [model.title, model.answer, model.verdict].filter(Boolean).map(withPeriod).join(" ");

  return (
    <>
      <section className="calc" aria-label="Your costs">
        <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={folded && visit.returning} />
        <ResultStrip
          model={model}
          mix={mix}
          personal={personal}
          wide={wide}
          hover={hover}
          highlight={highlight}
          onAnswerQuestions={toQuestions}
          stripRef={stripRef}
        />
        {model.basis && <p className="basis">{model.basis}</p>}
        <QuickStarts onPick={onQuickStart} />
        <div className="questions-area">
          {folded ? (
            <Summary
              text={summaryText(answers, rows)}
              canSave={canSave}
              onChangeAnswers={toQuestions}
              onStartOver={startOver}
            />
          ) : (
            <>
              <Questions answers={answers} personal={personal} onAnswer={onAnswer} onAlso={onAlso} />
              {personal && (
                <p className="saved">
                  {canSave && "Saved in this browser only. "}
                  <button type="button" className="text-btn" onClick={startOver}>Start over</button>
                </p>
              )}
            </>
          )}
        </div>
        <Amounts
          rows={rows}
          personal={personal}
          monthlyMean={BASKET.ceMonthlyMean}
          open={amountsOpen}
          onToggle={() => setAmountsOpen((v) => !v)}
          onAmount={onAmount}
          onRenewal={onRenewal}
        />
        <div className="fine">
          {fine.map((text) => <p key={text}>{text}</p>)}
        </div>
      </section>
      <LiveRegion text={liveText} />
      {cleared && <Toast key={cleared.key} message={cleared.message} onUndo={undo} onClose={closeToast} />}
      <HoverCard anchor={hover.state?.el ?? null} content={hoverContent(hover.state?.key)} />
    </>
  );
}
```

Then delete the panel and the dock:

```bash
git rm -q src/components/ResultPanel.jsx src/components/Dock.jsx
```

- [ ] **Step 6: Restyle.** Replace the whole of `src/styles/calculator.css` with:

```css
/* Page shell and Your costs layout. Colors come only from tokens.css. */

.wrap { max-width: 1080px; margin: 0 auto; padding-inline: 16px; padding-block: 0 48px; }

.site {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 24px;
  padding-block: 18px 12px;
  border-bottom: 1px solid var(--rule);
}
.brand { font-weight: 800; font-size: 20px; letter-spacing: -0.01em; color: var(--ink); text-decoration: none; }

/* Your costs, top to bottom (spec "Revision 4 layout"). A flex column, not a grid: a
   sticky element only sticks inside its containing block, and a grid item's containing
   block is its own grid area, so the strip would stop sticking after one row. */
.calc { display: flex; flex-direction: column; gap: 12px; padding-block: 24px 0; }
.intro { display: grid; gap: 10px; }
.questions-area { display: grid; gap: 22px; }

h1 {
  margin: 0;
  max-width: 17em;
  font-weight: 800;
  font-size: clamp(30px, 7.6vw, 44px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.lede { margin: 0; max-width: 40em; font-size: 18px; color: var(--ink-2); }

.questions { display: grid; gap: 22px; }
.questions:focus { outline: none; }
@media (min-width: 900px) {
  .questions { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 32px; }
}
fieldset.q { min-width: 0; margin: 0; padding: 0; border: 0; }
fieldset.q legend { margin-bottom: 10px; padding: 0; font-weight: 700; font-size: 18px; }
.opts,
.checks { display: flex; flex-wrap: wrap; gap: 8px; }
.help { margin: 10px 0 0; max-width: 36em; font-size: 15px; color: var(--ink-2); }
.saved { margin: 0; font-size: 15px; color: var(--ink-2); }

/* Returning summary: NOT a raised surface, just a section under a rule. */
.summary { display: grid; gap: 8px; padding-top: 12px; border-top: 1px solid var(--rule); }
.summary h2 { margin: 0; font-weight: 700; font-size: 18px; }
.summary p { margin: 0; }
.summary .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; }

/* Quick starts: plain buttons that fill everything in. Never a selected state. */
.quick { display: grid; gap: 10px; }
.quick h2 { margin: 0; font-weight: 700; font-size: 18px; }
.quick-row { display: flex; flex-wrap: wrap; gap: 8px; }
@media (min-width: 900px) {
  /* One row each on desktop, so the amounts start higher (Rev 4 success criterion:
     with the Commuter quick start the amounts end within 1,500px at 1280px). */
  .quick { grid-template-columns: max-content minmax(0, 1fr); align-items: center; column-gap: 16px; }
  .summary { grid-template-columns: minmax(0, 1fr) max-content; column-gap: 24px; align-items: center; }
  .summary h2,
  .summary p { grid-column: 1; }
  .summary .row { grid-column: 2; grid-row: 1 / span 3; }
}

/* The result strip: the view's one bordered raised surface, sticky at every width. */
.strip {
  position: sticky;
  top: env(safe-area-inset-top, 0px);
  z-index: 4;
  padding: 14px 16px 16px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 10px;
}
.strip h2 { margin: 0; font-weight: 700; font-size: 15px; }
.answer, .compare, .money, .amt-value, .amt-adds, .fam-total { font-variant-numeric: tabular-nums; }
.answer {
  margin: 4px 0 0;
  font-weight: 800;
  font-size: clamp(34px, 9.4vw, 46px);
  line-height: 1.04;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.rates { margin: 8px 0 0; color: var(--ink-2); }
.compare {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 6px 12px;
  margin-top: 12px;
  font-size: 15px;
}
.bar-track { position: relative; height: 12px; }
.bar { position: absolute; top: 0; height: 100%; border-radius: 3px; }
.bar.you { background: var(--accent); }
.bar.us { background: var(--bar-us); }
.cmp-val { text-align: right; font-weight: 700; }
.verdict { margin: 12px 0 0; font-weight: 600; font-size: 17px; line-height: 1.4; }
.strip .btn { margin-top: 12px; }
.strip-more { display: grid; gap: 10px; }
.strip-more > * { margin: 0; }
.strip-more .btn { justify-self: start; }

/* The spending mix: one slice per family, in family order; the legend is the keyboard path. */
.mix-bar { display: flex; gap: 2px; height: 22px; }
.slice { flex: 0 1 0; min-width: 0; height: 100%; border-radius: 3px; background: var(--c); transition: opacity 150ms ease, transform 150ms ease; }
.mix.dim .slice:not(.hl) { opacity: 0.3; }
.slice.hl { transform: scaleY(1.3); }
.mix-legend { display: flex; flex-wrap: wrap; column-gap: 14px; margin-top: 4px; }
.lg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 2px;
  font-size: 15px;
  color: var(--ink-2);
  background: none;
  border: 0;
  cursor: pointer;
  transition: opacity 150ms ease;
}
.mix.dim .lg:not(.hl) { opacity: 0.45; }
.lg.hl { color: var(--ink); font-weight: 700; }
@media (min-width: 900px) {
  .strip {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); /* room for the answer on one line */
    column-gap: 32px;
    align-items: center;
    padding: 16px 20px;
  }
}

.basis { margin: 0; font-size: 15px; color: var(--ink-2); }
.fine { font-size: 13px; color: var(--ink-3); }
.fine p { margin: 0 0 6px; }

/* Monthly amounts: the disclosure list. */
.amounts-body { margin-top: 12px; }
.amounts-body > p { margin: 0 0 12px; max-width: 36em; color: var(--ink-2); }
.amt-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding-block: 12px;
  border-top: 1px solid var(--rule);
}
.amt-label { display: grid; min-width: 0; font-weight: 600; }
.amt-hint { font-weight: 400; font-size: 15px; color: var(--ink-2); }
.per { font-size: 15px; color: var(--ink-2); }
.amt-value { font-weight: 600; }
.amt-sub { flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 15px; color: var(--ink-2); }

/* Undo toast: with the hover card, the only shadows; motion only in response to actions. */
.toast {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 6;
  max-width: 460px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 16px;
  color: var(--dock-ink);
  background: var(--dock);
  border-radius: 8px;
  box-shadow: var(--shadow);
}
@media (min-width: 900px) { .toast { bottom: 24px; } }
.toast .text-btn { color: var(--dock-ink); }
.toast .text-btn:focus-visible { outline: 3px solid var(--dock-ink); outline-offset: 2px; }
```

In `src/styles/tokens.css`, replace

```css
html {
  scroll-padding-top: 16px;
  scroll-padding-bottom: 110px; /* keeps focused controls clear of the phone dock */
}
```

with

```css
/* Focused controls and in-page jumps land below the sticky result strip. YourCosts
   writes the strip's height to --strip-h; other tabs leave it unset. */
html {
  scroll-padding-top: calc(var(--strip-h, 0px) + 16px);
}
```

- [ ] **Step 7: Run tests and build**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built in|error"`
Expected: `pass 211`, `fail 0`, `✓ built in …`.

- [ ] **Step 8: Smoke check.** Start the preview, then:

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (390, 1280):
        pg = b.new_page(viewport={"width": w, "height": 900}, reduced_motion="reduce")
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://localhost:4719/inflation-reality/"); pg.wait_for_selector("#page-title")
        sticky = pg.evaluate("getComputedStyle(document.querySelector('.strip')).position")
        print(w, sticky, "dock", pg.locator(".dock").count(), "more", pg.locator(".strip-more").count(), "legend", pg.locator(".mix-legend .lg").count())
        if w == 1280:
            pg.locator(".lg").first.hover(); pg.wait_for_timeout(150)
            print("legend card", pg.locator("#hover-card .hc-title").text_content(), pg.locator(".mix.dim").count())
            pg.get_by_role("button", name="Commuter", exact=True).click(); pg.wait_for_timeout(200)
            pg.locator(".compare .bar-track").first.hover(); pg.wait_for_timeout(150)
            print("bar card", pg.locator("#hover-card .hc-title").text_content(), "focus", pg.evaluate("document.activeElement.id"))
        print("errors", errs)
    b.close()
EOF
kill "$(cat /tmp/ir-preview.pid)"
```

Expected: `390 sticky dock 0 more 1 legend 7`, then `1280 sticky dock 0 more 0 legend 7`, `legend card Home 1`, `bar card Your costs focus answer` (focus may read `""` if the hover moved it; the quick start set it first), and `errors []` both times.

- [ ] **Step 9: Commit**

```bash
git add -A src/calculator/panel.js src/calculator/panel.test.mjs src/shell.test.mjs src/components/ResultStrip.jsx src/views/YourCosts.jsx src/styles/calculator.css src/styles/tokens.css
git commit -m "feat(your-costs): sticky result strip with the spending mix; drop the dock, panel list and prompt rows" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git add -A` on those paths also stages the two deletions from Step 5.)

---

### Task 6: Family cards with tight rows, sliders, renewal boxes and the phone fold-up

**Files:**
- Create: `src/components/FamilyCards.jsx`
- Delete: `src/components/Amounts.jsx`
- Modify: `src/views/YourCosts.jsx`, `src/styles/calculator.css` (the amounts block), `src/styles/controls.css` (drop `.disclosure`), `src/shell.test.mjs`

**Interfaces:**
- Consumes: `FamilyCard`, `CardRow`, `rowHover` (Task 2); `toggleOpen`, `visit.open` (Task 3); `useHover().target`, `.wide`, `isMouse` (Task 4); `onAmount(id, value)`, `onRenewal(id, value)` (YourCosts); `NumberField`, `parseAmountInput`, `parseRenewalInput`, `clampAmount`, `formatDollars`.
- Produces:
  - `FamilyCards({ cards, personal, narrow, open: string[], onToggle(id), highlight: string|null, onHighlight(id|null), hover, onAmount, onRenewal })`. DOM: `section.amounts` with `h2#amounts-title` "Your monthly amounts"; `.fam-cols`; per family `section.fam[data-family]` (`.hl` when highlighted) with `h3.fam-h` holding either `button.fam-head[aria-expanded][aria-controls="fam-<id>"]` (< 600px) or `span.fam-head[tabindex=0]` (≥ 600px), `.fam-name`, `.fam-total`, an SVG `.chev`, `span.fam-prompt` as a second line inside `button.fam-head` (folded with an empty renewal line, so it is part of the button's name), and `div.fam-body#fam-<id>`. While a row's card is open, `aria-describedby` on its dollar box (merged with `hint-<id>`) and slider points at `#hover-card`; `div.amt` carries none.
  - Personal rows: `div.amt[data-family]` with `label.amt-label[for=amount-<id>]`, `.amt-rate`, `.amt-note`, `span.amt-adds` (`.prompt` for an empty renewal), `.amt-boxes` holding `input#amount-<id>` and (renewal lines) `input#renewal-<id>.pct`, and `input#slider-<id>.slider[type=range]` (`aria-label` "{label}, dollars a month", `aria-valuetext` "$380 a month"). Average rows: `div.amt.avg` with `.amt-label`, `.amt-rate`, `.amt-adds`, `.amt-value` ("$2,030 a month"). `p.amounts-note` in Average.
  - Hover key `"row:<rowId>"`.

- [ ] **Step 1: Write the failing test.** In `src/shell.test.mjs`, replace

```js
test("revision 4 removals stay removed: dock, result panel list, renewal prompt rows", () => {
  for (const gone of ["components/Dock.jsx", "components/ResultPanel.jsx"]) {
```

with

```js
test("revision 4 removals stay removed: dock, result panel list, renewal prompt rows, amounts disclosure", () => {
  for (const gone of ["components/Dock.jsx", "components/ResultPanel.jsx", "components/Amounts.jsx"]) {
```

replace `  for (const word of ["IntersectionObserver", "openRenewal", "showAll", "Dock", "ResultPanel"]) {` with

```js
  for (const word of ["IntersectionObserver", "openRenewal", "showAll", "Dock", "ResultPanel", "amountsOpen", "Amounts"]) {
```

and replace `  for (const sel of [".dock", ".prompts", "scroll-padding-bottom"]) {` with

```js
  for (const sel of [".dock", ".prompts", "scroll-padding-bottom", ".disclosure", ".amt-row", ".amounts-body"]) {
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/shell.test.mjs 2>&1 | grep -E "^not ok|components/Amounts"`
Expected: FAIL, `components/Amounts.jsx is deleted`.

- [ ] **Step 3: Write `src/components/FamilyCards.jsx`**

```jsx
import { LINES } from "../calculator/config.js";
import { formatDollars, parseAmountInput, parseRenewalInput, clampAmount } from "../calculator/format.js";
import NumberField from "./NumberField.jsx";
import { isMouse, CARD_ID } from "./useHover.js";

/** The fold chevron: an SVG icon, never a text glyph (the banned-string scan reads text). */
function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One editable amount on one tight row: label and rate, what it adds this year (its
 * allocated dollars), the dollar box (renewal lines add their percent box beside it),
 * and a slider in the family color under it. The slider updates live on input; the box
 * keeps its commit-per-keystroke behavior and clamps at 100,000.
 */
function AmountRow({ row, hover, onAmount, onRenewal }) {
  const hint = Object.hasOwn(LINES, row.id) ? LINES[row.id].hint : null;
  const hintId = hint ? `hint-${row.id}` : undefined;
  // Focus lands on the box or the slider, so they (not the row) point at the open card.
  const cardOpen = hover.state?.key === `row:${row.id}`;
  const boxDescribedBy = [hintId, cardOpen ? CARD_ID : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="amt" data-family={row.family} {...hover.target(`row:${row.id}`, row.family, { describe: false })}>
      <label className="amt-label" htmlFor={`amount-${row.id}`}>
        {row.label}
        {row.rateText && <span className="amt-rate">{row.rateText}</span>}
        {row.note && <span className="amt-note">{row.note}</span>}
        {hint && <span className="amt-note" id={hintId}>{hint}</span>}
      </label>
      <span className={row.renewalMissing ? "amt-adds prompt" : "amt-adds"}>{row.addsYearText}</span>
      <span className="amt-boxes">
        <span className="money">
          $
          <NumberField
            id={`amount-${row.id}`}
            value={row.monthly}
            parse={parseAmountInput}
            onCommit={(v) => onAmount(row.id, v)}
            inputMode="numeric"
            describedBy={boxDescribedBy}
          />
        </span>
        {row.renewal && (
          <span className="money">
            <label className="sr" htmlFor={`renewal-${row.id}`}>Increase on your renewal notice</label>
            <NumberField
              id={`renewal-${row.id}`}
              className="pct"
              value={row.rate}
              parse={parseRenewalInput}
              onCommit={(v) => onRenewal(row.id, v)}
              inputMode="decimal"
            />
            %
          </span>
        )}
      </span>
      <input
        type="range"
        id={`slider-${row.id}`}
        className="slider"
        min="0"
        max={row.max}
        step="10"
        value={row.sliderValue}
        aria-label={`${row.label}, dollars a month`}
        aria-valuetext={`${formatDollars(row.monthly)} a month`}
        aria-describedby={cardOpen ? CARD_ID : undefined}
        style={{ "--p": `${(row.sliderValue / row.max) * 100}%` }}
        onChange={(e) => onAmount(row.id, clampAmount(Number(e.target.value)))}
      />
    </div>
  );
}

/** The average household's row: label, rate, what it adds and the monthly amount, as text. */
function AverageRow({ row, hover, wide }) {
  return (
    <div className="amt avg" data-family={row.family} tabIndex={wide ? 0 : undefined} {...hover.target(`row:${row.id}`, row.family)}>
      <span className="amt-label">
        {row.label}
        {row.rateText && <span className="amt-rate">{row.rateText}</span>}
        {row.note && <span className="amt-note">{row.note}</span>}
      </span>
      <span className="amt-adds">{row.addsYearText}</span>
      <span className="amt-value">{formatDollars(row.monthly)} a month</span>
    </div>
  );
}

/**
 * One family card, tinted 6% in its color and borderless (not a raised surface).
 * Under 600px the heading is a fold button (cards start folded; which are open lasts
 * for the visit). At 600px and wider it is a focusable label that opens the family's
 * hover card. Folding only happens through this card's own button, so a focused input
 * inside a card always keeps it open. Pointing at the card highlights its slice and
 * legend item.
 */
function FamilyCard({ card, personal, narrow, open, onToggle, highlighted, onHighlight, hover, onAmount, onRenewal }) {
  const bodyId = `fam-${card.id}`;
  const headId = `${bodyId}-head`;
  const folded = narrow && !open;
  const head = (
    <>
      <span className="dot" aria-hidden="true" />
      <span className="fam-name">{card.label}</span>
      <span className="fam-total">{card.dollarText}</span>
      {narrow && <Chevron />}
      {folded && card.renewalMissing && <span className="fam-prompt">Add your renewal increase</span>}
    </>
  );
  return (
    <section
      className={highlighted ? "fam hl" : "fam"}
      data-family={card.id}
      aria-labelledby={headId}
      onPointerEnter={(e) => { if (isMouse(e)) onHighlight(card.id); }}
      onPointerLeave={(e) => { if (isMouse(e)) onHighlight(null); }}
    >
      <h3 className="fam-h">
        {narrow ? (
          <button
            type="button"
            id={headId}
            className="fam-head"
            aria-expanded={open ? "true" : "false"}
            aria-controls={bodyId}
            onClick={() => onToggle(card.id)}
            {...hover.target(`fam:${card.id}`, card.id, { focus: false })}
          >
            {head}
          </button>
        ) : (
          <span id={headId} className="fam-head" tabIndex={0} {...hover.target(`fam:${card.id}`, card.id)}>{head}</span>
        )}
      </h3>
      <div id={bodyId} className="fam-body" hidden={folded}>
        {card.rows.map((r) => (personal
          ? <AmountRow key={r.id} row={r} hover={hover} onAmount={onAmount} onRenewal={onRenewal} />
          : <AverageRow key={r.id} row={r} hover={hover} wide={!narrow} />))}
      </div>
    </section>
  );
}

/**
 * "Your monthly amounts" (spec "Revision 4 layout"): one card per family in FAMILIES
 * order, two CSS columns on wide screens. Average shows the basket rows as text and
 * points to the questions and quick starts; editing starts in Personal.
 */
export default function FamilyCards({ cards, personal, narrow, open, onToggle, highlight, onHighlight, hover, onAmount, onRenewal }) {
  return (
    <section className="amounts" aria-labelledby="amounts-title">
      <h2 id="amounts-title">Your monthly amounts</h2>
      {cards.length === 0 ? (
        <p>Average household figures are not available right now.</p>
      ) : (
        <div className="fam-cols">
          {cards.map((c) => (
            <FamilyCard
              key={c.id}
              card={c}
              personal={personal}
              narrow={narrow}
              open={open.includes(c.id)}
              onToggle={onToggle}
              highlighted={highlight === c.id}
              onHighlight={onHighlight}
              hover={hover}
              onAmount={onAmount}
              onRenewal={onRenewal}
            />
          ))}
        </div>
      )}
      {!personal && cards.length > 0 && (
        <p className="amounts-note">Answer the questions or pick a household to change these.</p>
      )}
    </section>
  );
}
```

```bash
git rm -q src/components/Amounts.jsx
```

- [ ] **Step 4: Wire the cards in.** In `src/views/YourCosts.jsx`:

Replace

```js
import { BASKET } from "../data/catalog.js";
import { emptyAnswers, isPersonal, applyQuickStart } from "../calculator/model.js";
```

with

```js
import { emptyAnswers, isPersonal, applyQuickStart } from "../calculator/model.js";
```

Replace

```js
import { familyCards, familyHover, compareHover } from "../calculator/cards.js";
import { createVisit, foldOnMount } from "../calculator/visit.js";
```

with

```js
import { familyCards, familyHover, compareHover, rowHover } from "../calculator/cards.js";
import { createVisit, foldOnMount, toggleOpen } from "../calculator/visit.js";
```

Replace `import Amounts from "../components/Amounts.jsx";` with `import FamilyCards from "../components/FamilyCards.jsx";`.

Replace `  const [amountsOpen, setAmountsOpen] = useState(false);` with:

```js
  const [open, setOpen] = useState(() => visit.open); // family cards open on a phone, for the visit
  const [hl, setHl] = useState(null); // the family card the pointer is over, for linked highlights
```

Replace `  const highlight = hover.state?.family ?? null;` with:

```js
  const toggleCard = (id) => {
    const next = toggleOpen(open, id);
    visit.open = next;
    setOpen(next);
  };
  // Linked highlights: the card under the pointer, else the family whose card is open.
  const highlight = hl ?? hover.state?.family ?? null;
```

Replace `    if (kind === "cmp") return compareHover(model, id);` with:

```js
    if (kind === "row") {
      const row = cards.flatMap((c) => c.rows).find((r) => r.id === id);
      return row ? rowHover(row, data.referenceMonth, personal) : null;
    }
    if (kind === "cmp") return compareHover(model, id);
```

Replace

```jsx
        <Amounts
          rows={rows}
          personal={personal}
          monthlyMean={BASKET.ceMonthlyMean}
          open={amountsOpen}
          onToggle={() => setAmountsOpen((v) => !v)}
          onAmount={onAmount}
          onRenewal={onRenewal}
        />
```

with

```jsx
        <FamilyCards
          cards={cards}
          personal={personal}
          narrow={!hover.wide}
          open={open}
          onToggle={toggleCard}
          highlight={highlight}
          onHighlight={setHl}
          hover={hover}
          onAmount={onAmount}
          onRenewal={onRenewal}
        />
```

- [ ] **Step 5: Card and slider styles.** In `src/styles/calculator.css`, replace everything from `/* Monthly amounts: the disclosure list. */` through the `.amt-sub { … }` line with:

```css
/* Your monthly amounts: one tinted card per family (6% tint, no border: not a raised
   surface), two CSS columns when there is room. Text inside uses --ink and --ink-2 only. */
.amounts { display: grid; gap: 8px; }
.amounts h2 { margin: 0; font-weight: 700; font-size: 20px; }
.amounts-note { margin: 0; color: var(--ink-2); }
.fam-cols { columns: 2 380px; column-gap: 16px; }
.fam {
  break-inside: avoid;
  margin: 0 0 6px;
  padding: 2px 12px 6px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--c) 6%, transparent);
  transition: background-color 150ms ease, box-shadow 150ms ease;
}
.fam.hl {
  background: color-mix(in srgb, var(--c) 11%, transparent);
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--c) 55%, transparent);
}
.fam-h { margin: 0; font-weight: 700; font-size: 16px; }
.fam-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: var(--ink);
  text-align: left;
  background: none;
  border: 0;
  border-radius: 6px;
}
button.fam-head { flex-wrap: wrap; min-height: 44px; cursor: pointer; } /* a fold button: a 44px target */
span.fam-head { min-height: 32px; }
.fam-name { flex: 1 1 auto; min-width: 0; }
.chev { flex: none; color: var(--ink-2); transition: transform 150ms ease; }
.fam-head[aria-expanded="true"] .chev { transform: rotate(180deg); }
/* The empty-renewal prompt: a second line inside the fold button, part of its name. */
.fam-prompt { flex-basis: 100%; margin: -8px 0 8px 18px; font-weight: 500; font-size: 13px; color: var(--ink-2); }

.amt {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-areas: "label adds boxes" "slider slider slider";
  align-items: center;
  column-gap: 10px;
  margin-inline: -6px;
  padding: 4px 6px 2px;
  border-radius: 6px;
  transition: background-color 120ms ease;
}
.amt:hover,
.amt:focus-within { background: color-mix(in srgb, var(--c) 13%, transparent); }
.amt.avg { grid-template-areas: "label adds boxes"; padding-block: 8px; }
/* Above the slider's overlapping hit area, so their clicks never land on the slider. */
.amt-label { position: relative; z-index: 1; grid-area: label; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.amt-rate { margin-left: 6px; font-weight: 400; font-size: 13px; color: var(--ink-2); }
.amt-note { display: block; font-weight: 400; font-size: 13px; color: var(--ink-2); }
.amt-adds { grid-area: adds; font-weight: 600; font-size: 15px; text-align: right; white-space: nowrap; }
.amt-adds.prompt { max-width: 8em; font-weight: 500; font-size: 13px; color: var(--ink-2); white-space: normal; }
.amt-boxes { position: relative; z-index: 1; grid-area: boxes; display: inline-flex; align-items: center; gap: 8px; }
.amt-value { grid-area: boxes; font-weight: 600; text-align: right; white-space: nowrap; }
.amt .money input { width: 5.4em; min-height: 36px; padding: 5px 8px; font-size: 16px; }
.amt .money input.pct { width: 3.6em; }
@media (max-width: 599px) {
  .amt-boxes { flex-direction: column; align-items: flex-end; gap: 4px; }
}

/* Dollar sliders: 32px hit area, 22px thumb, 10px track filled in the family color. The
   hit area overlaps 6px of the row's spacing above and below, which keeps rows tight. */
.slider {
  grid-area: slider;
  width: 100%;
  height: 32px;
  margin: -6px 0;
  background: transparent;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}
.slider::-webkit-slider-runnable-track {
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(to right, var(--c) var(--p), var(--track) var(--p));
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  margin-top: -6px;
  border-radius: 50%;
  background: var(--surface);
  border: 3px solid var(--c);
}
.slider::-moz-range-track { height: 10px; border-radius: 5px; background: var(--track); }
.slider::-moz-range-progress { height: 10px; border-radius: 5px; background: var(--c); }
.slider::-moz-range-thumb { box-sizing: border-box; width: 22px; height: 22px; border-radius: 50%; background: var(--surface); border: 3px solid var(--c); }
```

In `src/styles/controls.css`: replace `.btn,\n.opt,\n.check,\n.disclosure {` with `.btn,\n.opt,\n.check {`; replace `.btn:hover,\n.opt:hover,\n.check:hover,\n.disclosure:hover {` with `.btn:hover,\n.opt:hover,\n.check:hover {`; delete the line `.disclosure:focus-visible,`; and delete this whole block (and the blank line after it):

```css
.disclosure {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 50px;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 18px;
  text-align: left;
}
.disclosure::after { content: "+"; font-size: 24px; font-weight: 500; line-height: 1; }
.disclosure[aria-expanded="true"]::after { content: "\2212"; }
```

- [ ] **Step 6: Run tests and build**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built in|error" && grep -rn "disclosure" src/styles src/components src/views || echo "no disclosure left"`
Expected: `pass 211`, `fail 0`, `✓ built in …`, `no disclosure left`.

- [ ] **Step 7: Smoke check.** Start the preview, then:

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
SET = """([sel, v]) => { const el = document.querySelector(sel);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
  el.dispatchEvent(new Event("input", { bubbles: true })); }"""
END = "() => document.querySelector('.amounts').getBoundingClientRect().bottom + window.scrollY"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 900}, reduced_motion="reduce")
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4719/inflation-reality/"); pg.wait_for_selector("#page-title")
    heads = pg.locator("button.fam-head")
    print("390 average", heads.count(), "open", pg.locator("button.fam-head[aria-expanded='true']").count(), "inputs", pg.locator(".fam input").count())
    pg.get_by_role("button", name="Commuter", exact=True).click(); pg.wait_for_timeout(200)
    print("390 commuter end", round(pg.evaluate(END)))
    pg.locator(".fam[data-family='around'] button.fam-head").click(); pg.wait_for_timeout(100)
    pg.evaluate(SET, ["#slider-gasoline", 480]); pg.wait_for_timeout(100)
    print("slider", pg.locator("#amount-gasoline").input_value(), pg.locator(".fam[data-family='around'] .amt-adds").first.text_content())
    pg.set_viewport_size({"width": 1280, "height": 900}); pg.wait_for_timeout(200)
    print("1280 heads focusable", pg.locator(".fam-head[tabindex='0']").count(), "border", pg.evaluate("getComputedStyle(document.querySelector('.fam')).borderTopWidth"), "end", round(pg.evaluate(END)))
    pg.locator(".amt", has_text="Gas for the car").hover(); pg.wait_for_timeout(150)
    print("row card", pg.locator("#hover-card .hc-title").text_content(), "highlight", pg.locator(".fam.hl").get_attribute("data-family"), errs)
    b.close()
EOF
kill "$(cat /tmp/ir-preview.pid)"
```

Expected (fallback data, so dollar figures vary): `390 average 7 open 0 inputs 0`; `390 commuter end` at most `2000` (measured 1,793 with the fallback fonts); `slider 480 +$… a year`; `1280 heads focusable 7 border 0px end …` at most `1500`, aiming for about `1420` with the fallback fonts (measured 1,423) so the real-font run (Task 11) keeps its margin; `row card Gas for the car highlight around []`. If either height is over its limit, tighten `.amt` padding, `.fam` margins or `.quick` gaps in `calculator.css` (spacing only, never target sizes) until both pass; Task 10's audit enforces the same limits.

- [ ] **Step 8: Commit**

```bash
git add -A src/components/FamilyCards.jsx src/components/Amounts.jsx src/views/YourCosts.jsx src/styles/calculator.css src/styles/controls.css src/shell.test.mjs
git commit -m "feat(your-costs): family cards with dollar sliders, renewal boxes and phone fold-up" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Motion: bars grow, the answer counts, changed rows flash; all off under reduced motion

**Files:**
- Create: `src/calculator/motion.js`, `src/components/useMotion.js`, `src/components/CountUp.jsx`
- Modify: `src/styles/marks.css` (append), `src/components/ResultStrip.jsx`, `src/components/FamilyCards.jsx`, `src/views/YourCosts.jsx`
- Test: `src/calculator/motion.test.mjs` (create)

**Interfaces:**
- Consumes: `useReducedMotion` (Task 4); `answerSentence` (Task 5); `roundToStep` (`format.js`).
- Produces:
  - `motion.js`: `easeOutCubic(k: number): number` (clamped to 0..1) and `tweenAt(from, to, elapsed, duration): number` (exactly `to` once `elapsed >= duration`, and for `duration <= 0`).
  - `useMotion.js`: `useFirstView(tab: string): boolean` (true only on the tab's first view this visit) and `useFlashKey(value): number` (goes up when `value` changes after mount; stays 0 under reduced motion).
  - `CountUp({ value: number, format: (n) => string, duration: number, from?: number|null })`: renders `format(shown)`; the last frame is always `format(value)`.
  - CSS: a view root with class `play` makes every `.grow` bar grow from zero (`scaleX`, 400ms, `--i` × 45ms stagger; `.grow.neg` grows from the right); `.flash` flashes `--c` for 350ms; `.hover-card` fades in over 120ms. All of it is off under `prefers-reduced-motion: reduce`.

- [ ] **Step 1: Write the failing test.** Create `src/calculator/motion.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { easeOutCubic, tweenAt } from "./motion.js";

test("easeOutCubic: 0 to 1, fast start, never overshoots", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(0.5), 0.875);
  assert.equal(easeOutCubic(-1), 0);
  assert.equal(easeOutCubic(2), 1);
  let last = -1;
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const v = easeOutCubic(k);
    assert.ok(v >= last && v <= 1, `k=${k}`);
    last = v;
  }
});

test("tweenAt: starts at from, ends exactly at to, also for falls and bad durations", () => {
  assert.equal(tweenAt(0, 100, 0, 900), 0);
  assert.equal(tweenAt(0, 100, -16, 900), 0);
  assert.equal(tweenAt(0, 100, 900, 900), 100);
  assert.equal(tweenAt(0, 100, 5000, 900), 100);
  const mid = tweenAt(1800, -150, 175, 350);
  assert.ok(mid < 1800 && mid > -150, `mid ${mid}`);
  assert.equal(tweenAt(1800, -150, 350, 350), -150);
  assert.equal(tweenAt(5, 7, 10, 0), 7);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/calculator/motion.test.mjs 2>&1 | tail -3`
Expected: FAIL, `Cannot find module '…/src/calculator/motion.js'`.

- [ ] **Step 3: Write `src/calculator/motion.js`**

```js
// Tween math for count-ups (spec "Revision 4: Motion"). Pure. The page is complete at
// rest: a tween always ends exactly on its final value.

/** Ease-out cubic on 0..1 (inputs outside are clamped): fast start, gentle stop. */
export function easeOutCubic(k) {
  const t = Math.min(1, Math.max(0, k));
  return 1 - (1 - t) ** 3;
}

/** The value shown `elapsed` ms into a count from `from` to `to` over `duration` ms. */
export function tweenAt(from, to, elapsed, duration) {
  if (!(duration > 0) || elapsed >= duration) return to;
  return from + (to - from) * easeOutCubic(elapsed / duration);
}
```

- [ ] **Step 4: Run it**

Run: `node --test src/calculator/motion.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 2`, `fail 0`.

- [ ] **Step 5: Motion hooks and the count-up.** Create `src/components/useMotion.js`:

```js
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useMedia.js";

// Tabs already shown this visit. Module state: survives tab switches, resets on reload.
const seen = new Set();

/**
 * True on a tab's first view this visit, so its bars grow and numbers count up once
 * (spec: "Motion only plays on first view of a tab and in response to the person's
 * actions"). The tab is marked seen after the first commit, so StrictMode's double
 * render still sees a first view.
 */
export function useFirstView(tab) {
  const [first] = useState(() => !seen.has(tab));
  useEffect(() => { seen.add(tab); }, [tab]);
  return first;
}

/**
 * A counter that goes up each time `value` changes after mount (never on mount) unless
 * motion is reduced. Use it as a React key so the flash animation replays.
 */
export function useFlashKey(value) {
  const reduced = useReducedMotion();
  const prev = useRef(value);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    if (!reduced) setKey((k) => k + 1);
  }, [value, reduced]);
  return key;
}
```

Create `src/components/CountUp.jsx`:

```jsx
import { useEffect, useRef, useState } from "react";
import { tweenAt } from "../calculator/motion.js";
import { useReducedMotion } from "./useMedia.js";

/**
 * Shows format(value). When value changes it counts there from what is on screen over
 * `duration` ms; with `from`, the first render counts up from it too (a tab's first
 * view). Under reduced motion the final value shows at once. The last frame is always
 * format(value), so the page is complete at rest.
 */
export default function CountUp({ value, format, duration, from = null }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(() => (reduced || from == null ? value : from));
  const shownRef = useRef(shown);
  useEffect(() => {
    const start = shownRef.current;
    const set = (v) => {
      shownRef.current = v;
      setShown(v);
    };
    if (reduced || start === value) {
      set(value);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t) => {
      const v = tweenAt(start, value, t - t0, duration);
      set(v);
      if (v !== value) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, duration]);
  return <>{format(shown)}</>;
}
```

- [ ] **Step 6: The CSS motion.** Append to `src/styles/marks.css`:

```css
/* Motion (spec "Revision 4: Motion"): only on a tab's first view (.play on the view's
   root) and in response to the person's actions; nothing loops. Every animation runs
   from a start state to the final one, so the page is complete at rest, and reduced
   motion turns all of it off. */
@keyframes grow { from { transform: scaleX(0); } }
.play .grow {
  transform-origin: left center;
  animation: grow 400ms ease-out both;
  animation-delay: calc(var(--i, 0) * 45ms);
}
.play .grow.neg { transform-origin: right center; }
@keyframes flash { 40% { color: var(--c); } }
.flash { animation: flash 350ms ease; }
@keyframes card-in { from { opacity: 0; } }
.hover-card { animation: card-in 120ms ease-out; }

@media (prefers-reduced-motion: reduce) {
  .play .grow,
  .flash,
  .hover-card { animation: none; }
  .fam,
  .amt,
  .chev,
  .slice,
  .lg,
  .mrow { transition: none; }
  .slice.hl { transform: none; }
}
```

- [ ] **Step 7: Use it on Your costs.** In `src/components/ResultStrip.jsx`, replace `/** A bar from zero: right for increases, left for decreases (spec "Numbers"). */` and the `Bar` function under it with:

```jsx
import CountUp from "./CountUp.jsx";
import { answerSentence } from "../calculator/panel.js";
import { roundToStep } from "../calculator/format.js";

const MINUS = "−";

/** A bar from zero: right for increases, left for decreases (spec "Numbers"). Grows in on a first view. */
function Bar({ bar, kind, i, neg }) {
  return (
    <span
      className={`bar ${kind} grow${neg ? " neg" : ""}`}
      style={{ left: `${bar.left}%`, width: `${bar.width}%`, "--i": i }}
    />
  );
}
```

Replace `        <Bar bar={compare.you.bar} kind="you" />` with `        <Bar bar={compare.you.bar} kind="you" i={0} neg={compare.you.text.startsWith(MINUS)} />` and `        <Bar bar={compare.us.bar} kind="us" />` with `        <Bar bar={compare.us.bar} kind="us" i={1} neg={compare.us.text.startsWith(MINUS)} />`.

Replace `          <p className="answer" id="answer" tabIndex={-1}>{model.answer}</p>` with:

```jsx
          <p className="answer" id="answer" tabIndex={-1}>
            {model.total != null
              ? <CountUp value={model.total} duration={350} format={(v) => answerSentence(roundToStep(v, 50))} />
              : model.answer}
          </p>
```

In `src/components/FamilyCards.jsx`, add `import { useFlashKey } from "./useMotion.js";` under the `isMouse` import. In `AmountRow`, directly after the line that declares `hintId`, add:

```js
  const flash = useFlashKey(row.monthly); // only the row whose amount changed flashes its dollar figure
```

and replace `      <span className={row.renewalMissing ? "amt-adds prompt" : "amt-adds"}>{row.addsYearText}</span>` with:

```jsx
      <span key={flash} className={["amt-adds", row.renewalMissing && "prompt", flash > 0 && "flash"].filter(Boolean).join(" ")}>
        {row.addsYearText}
      </span>
```

In `src/views/YourCosts.jsx`, add `import { useFirstView } from "../components/useMotion.js";` under the `useMediaQuery` import; after `  const hover = useHover();` add `  const play = useFirstView("your-costs");`; and replace `      <section className="calc" aria-label="Your costs">` with `      <section className={play ? "calc play" : "calc"} aria-label="Your costs">`.

- [ ] **Step 8: Run tests and build**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built in|error"`
Expected: `pass 213`, `fail 0`, `✓ built in …`.

- [ ] **Step 9: Smoke check (complete at rest, off when reduced).** Start the preview, then:

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
FULL = """(sel) => [...document.querySelectorAll(sel)].filter((b) => b.offsetWidth > 0)
  .every((b) => Math.abs(b.getBoundingClientRect().width - b.offsetWidth) < 0.5)"""
with sync_playwright() as p:
    b = p.chromium.launch()
    out = {}
    for motion in ("reduce", "no-preference"):
        pg = b.new_page(viewport={"width": 1280, "height": 900}, reduced_motion=motion)
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://localhost:4719/inflation-reality/"); pg.wait_for_selector("#page-title")
        pg.get_by_role("button", name="Commuter", exact=True).click()
        pg.wait_for_timeout(30)
        early = pg.locator(".answer").text_content(); bars_early = pg.evaluate(FULL, ".compare .bar")
        pg.wait_for_timeout(800)
        out[motion] = pg.locator(".answer").text_content()
        print(motion, "early", early, bars_early, "settled", out[motion], pg.evaluate(FULL, ".compare .bar"), errs)
    print("same final answer", out["reduce"] == out["no-preference"])
    b.close()
EOF
kill "$(cat /tmp/ir-preview.pid)"
```

Expected: the `reduce` line shows the final answer already at `early` and `True` for both bar checks; the `no-preference` line may show a mid-count answer and `False` early, then `True` settled; `same final answer True`; no errors.

- [ ] **Step 10: Commit**

```bash
git add src/calculator/motion.js src/calculator/motion.test.mjs src/components/useMotion.js src/components/CountUp.jsx src/styles/marks.css src/components/ResultStrip.jsx src/components/FamilyCards.jsx src/views/YourCosts.jsx
git commit -m "feat(motion): bars grow, the answer counts, changed rows flash; off under reduced motion" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: National numbers: trend crosshair, big-number cards, publisher-colored measures

**Files:**
- Modify: `src/tabs/national.js` (the `card`, `measureRows` and `nationalModel` functions; new exports), `src/tabs/national.test.mjs` (import line; append), `src/styles/tabs.css` (append), `package.json` and `package-lock.json` (pin Recharts)
- Rewrite: `src/components/TrendChart.jsx`, `src/views/NationalNumbers.jsx`
- Create: `src/components/MeasureList.jsx`

**Interfaces:**
- Consumes: `HoverCard`, `HoverCardBody`, `useHover` (Task 4); `CountUp`, `useFirstView`, `useReducedMotion` (Tasks 4, 7); `barGeometry`, `round1`, `formatRate` (`format.js`).
- Produces (`national.js`):
  - `PUBLISHERS: { id: "labor"|"commerce"|"cleveland"|"atlanta"|"dallas", label, token }[]`; `MEASURE_PUBLISHER: Record<measureKey, publisherId>`.
  - `measureRows()` rows gain `publisher`, `publisherLabel`, `vsText` ("0.5 points above prices overall", "" for the headline row).
  - `pointsVsHeadline(value, headline): string`; `measureRef(rows): { left: number, text: string } | null`; `evenTicks(values): { domain: [lo, hi], ticks: number[] }`; `sparkPaths(values, width, height, pad = 3): { line, area } | null`.
  - `card()` output gains `value: number|null`, `pace: { year, month } | null` (each `{ label, text, bar, neg }`) and `spark: (number|null)[] | null` (set on the headline card only).
  - `nationalModel()` gains `trendTicks`, `measureRef`, `publishers`.
  - `statHover(card)`, `measureHover(row)`, `trendHover(point)`: `HoverContent`.
- Produces (components): `TrendChart({ points, ticks, animate })`; `MeasureList({ rows, publishers, refLine, hover })` rendering `.chips > button.chip[aria-pressed][data-publisher]`, `p.ref-key`, `ul.measures(.focusing) > li.mrow(.on)[data-publisher][tabindex=0]`, each with `span.help.mrow-blurb` under 600px.

- [ ] **Step 1: Write the failing tests.** In `src/tabs/national.test.mjs`, replace `import { monthName, trendMonth, measureRows, nationalModel } from "./national.js";` with:

```js
import {
  monthName, trendMonth, measureRows, nationalModel, CARDS, MEASURES, PUBLISHERS, MEASURE_PUBLISHER,
  pointsVsHeadline, evenTicks, sparkPaths, statHover, measureHover, trendHover,
} from "./national.js";
```

and append:

```js
test("measures: each row names its publisher and how far it is from prices overall", () => {
  const rows = measureRows(viewData());
  assert.deepEqual(rows.map((r) => r.publisher), ["labor", "labor", "commerce", "cleveland", "labor", "cleveland"]);
  assert.equal(rows[0].publisherLabel, "Bureau of Labor Statistics");
  assert.equal(rows.find((r) => r.key === "corePce").publisherLabel, "Commerce Department");
  assert.deepEqual(rows.map((r) => r.vsText), [
    "0.2 points above prices overall", "", "0.1 points below prices overall", "0.8 points below prices overall",
    "1.0 points below prices overall", "3.8 points below prices overall",
  ]);
  assert.equal(pointsVsHeadline(3.4, 3.4), "Same as prices overall");
  assert.equal(pointsVsHeadline(null, 3.4), "");
  assert.equal(pointsVsHeadline(3.0, null), "");
  assert.deepEqual(MEASURE_PUBLISHER, {
    headline: "labor", core: "labor", exShelter: "labor", corePce: "commerce",
    medianCpi: "cleveland", trimmedCpi: "cleveland", stickyCpi: "atlanta", trimmedPce: "dallas",
  });
  assert.deepEqual(PUBLISHERS.map((p) => p.token), ["--p-labor", "--p-commerce", "--p-cleveland", "--p-atlanta", "--p-dallas"]);
});

test("measureRef: a dashed line where prices overall sits, none without it; chips for publishers present", () => {
  const m = nationalModel(viewData());
  assert.ok(Math.abs(m.measureRef.left - 95) < 1e-9, `${m.measureRef.left}`); // zero at 10%, +3.4 of a 4.0 span
  assert.equal(m.measureRef.text, "Prices overall +3.4%");
  assert.deepEqual(m.publishers.map((p) => p.id), ["labor", "commerce", "cleveland"]);
  assert.equal(nationalModel(viewData({ headline: { yoy: null, mom: null, momAnnualized: null } })).measureRef, null);
});

test("evenTicks: evenly spaced, includes zero, handles negatives and gaps", () => {
  assert.deepEqual(evenTicks([3.0, null, null, 2.7, 3.1]), { domain: [0, 4], ticks: [0, 1, 2, 3, 4] });
  assert.deepEqual(evenTicks([-1.2, 3]), { domain: [-2, 3], ticks: [-2, -1, 0, 1, 2, 3] });
  assert.deepEqual(evenTicks([0.3, 0.8]), { domain: [0, 1], ticks: [0, 0.5, 1] });
  assert.deepEqual(evenTicks([null]), { domain: [0, 0.5], ticks: [0, 0.5] });
  assert.deepEqual(nationalModel(viewData()).trendTicks, evenTicks([3.0, null, null, 2.7, 3.1]));
});

test("sparkPaths: a line that breaks at gaps and a filled area down to zero", () => {
  assert.deepEqual(sparkPaths([1, null, 2, 3], 100, 20, 0), {
    line: "M0.0 13.3 M66.7 6.7 L100.0 0.0",
    area: "M66.7 20.0 L66.7 6.7 L100.0 0.0 L100.0 20.0 Z",
  });
  assert.equal(sparkPaths([null, 2], 100, 20), null);
  assert.equal(sparkPaths([2], 100, 20), null);
});

test("cards: the past year next to this month's pace, and the overall card's sparkline", () => {
  const m = nationalModel(viewData());
  assert.equal(m.headline.value, 3.4);
  assert.deepEqual(
    [m.headline.pace.year.label, m.headline.pace.year.text, m.headline.pace.month.label, m.headline.pace.month.text],
    ["Past 12 months", "+3.4%", "This month's pace", "+4.9%"],
  );
  assert.equal(m.headline.pace.month.bar.width, 100);
  assert.ok(Math.abs(m.headline.pace.year.bar.width - (3.4 / 4.9) * 100) < 1e-9);
  assert.equal(m.core.pace.month.neg, true);
  assert.equal(m.core.pace.month.bar.left, 0);
  assert.deepEqual(m.headline.spark, [3.0, null, null, 2.7, 3.1]);
  assert.equal(m.core.spark, null);
  const missing = nationalModel(viewData({ headline: { yoy: null, mom: null, momAnnualized: null } }));
  assert.equal(missing.headline.pace, null);
  assert.equal(missing.headline.value, null);
});

test("hover cards: big numbers, measures and chart points", () => {
  const m = nationalModel(viewData());
  assert.deepEqual(statHover(m.headline), {
    title: "Prices overall", items: [["Change over 12 months", "+3.4%"]], lines: [], note: CARDS.headline.help,
  });
  const ex = m.measures.find((r) => r.key === "exShelter");
  assert.deepEqual(measureHover(ex), {
    title: "Prices other than housing", publisher: "labor",
    items: [["Published by", "Bureau of Labor Statistics"], ["Change over 12 months", "+3.6%"]],
    lines: ["0.2 points above prices overall"], note: MEASURES.exShelter.blurb,
  });
  assert.deepEqual(measureHover(m.measures.find((r) => r.key === "headline")).lines, []);
  assert.deepEqual(trendHover(m.trend[1]), {
    title: "October 2025", items: [["Change over 12 months", "Not published"]], lines: [], note: "",
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test src/tabs/national.test.mjs 2>&1 | grep -E "SyntaxError|does not provide|^ℹ fail"`
Expected: FAIL, `does not provide an export named 'PUBLISHERS'`.

- [ ] **Step 3: Extend `src/tabs/national.js`.** Insert after the closing `};` of `MEASURES`:

```js
/** Who publishes each measure (spec "Families": publisher alias tokens). */
export const PUBLISHERS = [
  { id: "labor", label: "Bureau of Labor Statistics", token: "--p-labor" },
  { id: "commerce", label: "Commerce Department", token: "--p-commerce" },
  { id: "cleveland", label: "Cleveland Fed", token: "--p-cleveland" },
  { id: "atlanta", label: "Atlanta Fed", token: "--p-atlanta" },
  { id: "dallas", label: "Dallas Fed", token: "--p-dallas" },
];
const PUBLISHER_LABEL = Object.fromEntries(PUBLISHERS.map((p) => [p.id, p.label]));

export const MEASURE_PUBLISHER = {
  headline: "labor", core: "labor", exShelter: "labor", corePce: "commerce",
  medianCpi: "cleveland", trimmedCpi: "cleveland", stickyCpi: "atlanta", trimmedPce: "dallas",
};

/** "0.5 points above prices overall" / "below" / "Same as prices overall", at display precision. "" without both numbers. */
export function pointsVsHeadline(value, headline) {
  if (value == null || headline == null) return "";
  const d = round1(round1(value) - round1(headline));
  if (d === 0) return "Same as prices overall";
  return `${Math.abs(d).toFixed(1)} points ${d > 0 ? "above" : "below"} prices overall`;
}
```

Replace the whole `card` function with:

```js
function card(node, { title, help }, referenceMonth) {
  const month = monthLabel(referenceMonth);
  const has = node.yoy != null;
  let monthSentence = null;
  if (node.mom != null && month) {
    monthSentence = `From ${monthName(referenceMonth, -1)} to ${monthName(referenceMonth)}, prices ${movePhrase(node.mom)}.`;
    if (node.momAnnualized != null) {
      monthSentence += ` At that pace for a full year, they would ${wouldPhrase(node.momAnnualized)}.`;
    }
  }
  // Pace bars: the past 12 months next to this month's change at a yearly pace, from zero.
  let pace = null;
  if (has && node.momAnnualized != null) {
    const [year, now] = barGeometry([node.yoy, node.momAnnualized]);
    pace = {
      year: { label: "Past 12 months", text: formatRate(node.yoy), bar: year, neg: node.yoy < 0 },
      month: { label: "This month's pace", text: formatRate(node.momAnnualized), bar: now, neg: node.momAnnualized < 0 },
    };
  }
  return {
    title,
    value: has ? node.yoy : null,
    yearText: has ? formatRate(node.yoy) : "Not available",
    yearSentence: !has
      ? "This figure is not available right now."
      : month ? `Change over the 12 months to ${month}.` : "Change over the last 12 months.",
    monthSentence,
    help,
    pace,
    spark: null,
  };
}
```

In `measureRows`, replace the doc comment

```js
/**
 * Other official measures, highest first, with bar geometry from zero. Measures
 * with no number are left out, never drawn as 0. Rows: { key, name, note, value,
 * valueText, bar, stale } - the shape BarList lays out.
 */
```

with

```js
/**
 * Other official measures, highest first, with bar geometry from zero. Measures
 * with no number are left out, never drawn as 0. Rows: { key, name, note, value,
 * valueText, bar, stale, publisher, publisherLabel, vsText }, the shape MeasureList lays out.
 */
```

and replace its final `return list.map(…);` statement with:

```js
  return list.map((r, i) => {
    const publisher = MEASURE_PUBLISHER[r.key] ?? "labor";
    return {
      key: r.key, name: r.name, note: r.blurb, value: r.value, valueText: formatRate(r.value), bar: bars[i], stale: r.stale,
      publisher,
      publisherLabel: PUBLISHER_LABEL[publisher],
      vsText: r.key === "headline" ? "" : pointsVsHeadline(r.value, data.headline.yoy),
    };
  });
```

Replace the whole `nationalModel` function with:

```js
/** Everything the National numbers view shows. */
export function nationalModel(data) {
  const month = monthLabel(data.referenceMonth);
  const lede = data.headline.yoy != null && month
    ? `Prices overall ${movePhrase(data.headline.yoy)} in the year to ${month}. These are the official numbers for the whole country.`
    : "These are the official inflation numbers for the whole country.";

  const trend = (data.trend ?? []).map((d) => {
    const value = d.headline ?? null;
    return { ...trendMonth(d.month), value, valueText: value == null ? "Not published" : formatRate(value) };
  });
  const gaps = trend.filter((p) => p.value == null).map((p) => p.long);
  const trendNote = gaps.length === 0 ? null : `No figures were published for ${joinAnd(gaps)}, so the line breaks there.`;
  const values = trend.map((p) => p.value);

  const measures = measureRows(data);
  // Headline and core are named here even if they have no number (then they are not in measures).
  const staleNames = [
    ...(data.headline.stale ? [MEASURES.headline.name] : []),
    ...(data.core.stale ? [MEASURES.core.name] : []),
    ...measures.filter((m) => m.stale && m.key !== "headline" && m.key !== "core").map((m) => m.name),
  ];

  const headline = card(data.headline, CARDS.headline, data.referenceMonth);
  // A filled sparkline of the same months on the overall card; it needs two points.
  headline.spark = values.filter((v) => v != null).length >= 2 ? values : null;

  return {
    lede,
    headline,
    core: card(data.core, CARDS.core, data.referenceMonth),
    trend,
    trendNote,
    trendTicks: evenTicks(values),
    measures,
    measureRef: measureRef(measures),
    publishers: PUBLISHERS.filter((p) => measures.some((r) => r.publisher === p.id)),
    notes: [staleNote(staleNames), gapNote(data)].filter(Boolean),
  };
}
```

Append to the end of the file:

```js
/** Where the dashed "Prices overall" line sits on the measures' bars (percent of the track), or null. */
export function measureRef(rows) {
  const h = rows.find((r) => r.key === "headline");
  if (!h) return null;
  return { left: h.value >= 0 ? h.bar.left + h.bar.width : h.bar.left, text: `Prices overall ${h.valueText}` };
}

const TICK_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];

/**
 * Evenly spaced y-axis ticks that include zero, at most six (spec: "Fix the uneven
 * y-axis ticks (0/2/5%) to evenly spaced ones"). Gap months (null) are ignored.
 */
export function evenTicks(values) {
  const nums = values.filter((v) => v != null && Number.isFinite(v));
  const lo0 = Math.min(0, ...nums);
  const hi0 = Math.max(0, ...nums);
  const step = TICK_STEPS.find((s) => Math.ceil(hi0 / s) - Math.floor(lo0 / s) <= 5) ?? TICK_STEPS.at(-1);
  const lo = Math.floor(lo0 / step) * step;
  let hi = Math.ceil(hi0 / step) * step;
  if (hi === lo) hi = lo + step;
  const ticks = [];
  for (let i = 0; lo + i * step <= hi + 1e-9; i += 1) ticks.push(Math.round((lo + i * step) * 100) / 100);
  return { domain: [lo, hi], ticks };
}

/**
 * SVG paths for a small sparkline in a width × height box: the line breaks at gaps
 * (null) instead of drawing through them, and each run of two or more points gets a
 * filled area down to zero. null with fewer than two numbers.
 */
export function sparkPaths(values, width, height, pad = 3) {
  const n = values.length;
  const nums = values.filter((v) => v != null);
  if (n < 2 || nums.length < 2) return null;
  const lo = Math.min(0, ...nums);
  const hi = Math.max(0, ...nums);
  const span = hi - lo || 1;
  const x = (i) => pad + (i / (n - 1)) * (width - 2 * pad);
  const y = (v) => pad + (1 - (v - lo) / span) * (height - 2 * pad);
  const f = (v) => v.toFixed(1);
  const segments = [];
  let cur = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else {
      cur.push([x(i), y(v)]);
    }
  });
  if (cur.length) segments.push(cur);
  const line = segments.map((s) => s.map(([px, py], k) => `${k ? "L" : "M"}${f(px)} ${f(py)}`).join(" ")).join(" ");
  const base = f(y(0));
  const area = segments
    .filter((s) => s.length > 1)
    .map((s) => `M${f(s[0][0])} ${base} ${s.map(([px, py]) => `L${f(px)} ${f(py)}`).join(" ")} L${f(s.at(-1)[0])} ${base} Z`)
    .join(" ");
  return { line, area };
}

/** Hover card for a big number: how it is measured (the card's help sentences). */
export function statHover(card) {
  return { title: card.title, items: [["Change over 12 months", card.yearText]], lines: [], note: card.help };
}

/** Hover card for an Other official measures row: publisher, value, distance from prices overall, blurb. */
export function measureHover(row) {
  return {
    title: row.name,
    publisher: row.publisher,
    items: [["Published by", row.publisherLabel], ["Change over 12 months", row.valueText]],
    lines: row.vsText ? [row.vsText] : [],
    note: row.note,
  };
}

/** Hover card for a trend point. A gap month says "Not published". */
export function trendHover(point) {
  return { title: point.long, items: [["Change over 12 months", point.valueText]], lines: [], note: "" };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test src/tabs/national.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: `pass 15`, `fail 0` (the 9 existing tests, including the exact `trend[0]` shape, plus 6 new).

- [ ] **Step 5: The trend chart.** Replace the whole of `src/components/TrendChart.jsx` with:

```jsx
import { useRef } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList,
} from "recharts";
import { HoverCardBody } from "./HoverCard.jsx";
import { trendHover } from "../tabs/national.js";
import { useReducedMotion } from "./useMedia.js";

const TICK = { fill: "var(--ink-2)", fontSize: 13 };
const MINUS = "−";

/** The crosshair's card: the shared hover-card body inside Recharts' tooltip. */
function TrendTip({ active, payload }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="hover-card chart-card"><HoverCardBody content={trendHover(point)} /></div>;
}

/** A label on the latest point only. */
function EndLabel({ x, y, index, value, last }) {
  if (index !== last || value == null || value === "Not published") return null;
  return <text x={x + 8} y={y} dy={4} fill="var(--ink)" fontSize={13} fontWeight={700}>{value}</text>;
}

/**
 * The 12-month change in prices overall (spec "Charts and the other tabs"): a line in
 * --accent with a 12% shaded area under it, evenly spaced ticks, an end label, and a
 * crosshair with a dot. The chart is one tab stop (Recharts' accessibilityLayer):
 * focus shows the latest month and ArrowLeft / ArrowRight step month by month. Gap
 * months are null, so the line breaks there. The line draws in over 900ms on a first
 * view, never under reduced motion (Recharts ignores the media query). The visually
 * hidden table carries the same numbers as text.
 * points: nationalModel().trend; ticks: nationalModel().trendTicks; animate: first view.
 */
export default function TrendChart({ points, ticks, animate }) {
  const chart = useRef(null);
  const reduced = useReducedMotion();
  const last = points.length - 1;
  const drawIn = animate && !reduced;
  // Recharts starts its keyboard index at the oldest point. Its onFocus moves the
  // crosshair to accessibilityManager's index, so set that to the latest month first
  // (capture runs before Recharts' own handler). Recharts 2.15 instance API.
  const toLatest = () => chart.current?.accessibilityManager?.setIndex(last);
  return (
    <>
      <div className="trend-chart" onFocusCapture={toLatest}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            ref={chart}
            data={points}
            accessibilityLayer
            title="Change over 12 months in prices overall, by month"
            margin={{ top: 8, right: 48, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="short" tick={TICK} tickLine={false} axisLine={{ stroke: "var(--rule)" }}
              interval="preserveStartEnd" minTickGap={24}
              padding={{ left: 8, right: 16 }} tickMargin={8}
            />
            <YAxis
              width={44} tick={TICK} tickLine={false} axisLine={false} tickMargin={8}
              domain={ticks.domain} ticks={ticks.ticks} interval={0}
              tickFormatter={(v) => (v < 0 ? `${MINUS}${Math.abs(v)}%` : `${v}%`)}
            />
            <ReferenceLine y={0} stroke="var(--control-edge)" />
            <Tooltip
              content={<TrendTip />}
              filterNull={false}
              cursor={{ stroke: "var(--ink-2)", strokeWidth: 1 }}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", zIndex: 5 }}
            />
            <Area
              type="linear" dataKey="value" stroke="none" fill="var(--accent)" fillOpacity={0.12}
              connectNulls={false} activeDot={false}
              isAnimationActive={drawIn} animationDuration={900}
            />
            <Line
              type="linear" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={false}
              activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls={false} isAnimationActive={drawIn} animationDuration={900}
            >
              <LabelList dataKey="valueText" content={<EndLabel last={last} />} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className="sr">
        <caption>Change over 12 months in prices overall, by month</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Change</th></tr></thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.long}><th scope="row">{p.long}</th><td>{p.valueText}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
```

(The wrapper no longer has `aria-hidden="true"`: a focusable chart cannot sit inside it.)

- [ ] **Step 6: The measures list.** Create `src/components/MeasureList.jsx`:

```jsx
import { useState } from "react";

/**
 * Other official measures (spec "Charts and the other tabs"): rows tinted in their
 * publisher's color with 12px bars from zero, a dashed line at prices overall, and
 * publisher chips that toggle (aria-pressed) a highlight on one publisher's rows,
 * fading the others to 35%. Each row is a hover target. At 600px and wider the blurb
 * lives in its card plus visually hidden text; narrower, no card opens on these rows,
 * so the blurb shows as help text under the row (spec note, 2026-10-17).
 */
export default function MeasureList({ rows, publishers, refLine, hover }) {
  const [pub, setPub] = useState(null);
  return (
    <>
      <div className="chips" role="group" aria-label="Highlight one publisher's measures">
        {publishers.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            data-publisher={p.id}
            aria-pressed={pub === p.id ? "true" : "false"}
            onClick={() => setPub(pub === p.id ? null : p.id)}
          >
            <span className="dot" aria-hidden="true" />
            {p.label}
          </button>
        ))}
      </div>
      {refLine && (
        <p className="ref-key"><span className="ref-swatch" aria-hidden="true" />{refLine.text}</p>
      )}
      <ul className={pub ? "measures focusing" : "measures"} aria-label="Official measures, highest first">
        {rows.map((r, i) => (
          <li
            key={r.key}
            className={pub === r.publisher ? "mrow on" : "mrow"}
            data-publisher={r.publisher}
            tabIndex={0}
            {...hover.target(`m:${r.key}`)}
          >
            <span className="bar-name">
              <span className="dot" aria-hidden="true" />
              {r.name}
              <span className="sr">{hover.wide ? `, ${r.publisherLabel}. ${r.note}` : `, ${r.publisherLabel}.`}</span>
            </span>
            <span className="bar-val">{r.valueText}</span>
            <span className="bar-track" aria-hidden="true">
              <span
                className={r.value < 0 ? "bar grow neg" : "bar grow"}
                style={{ left: `${r.bar.left}%`, width: `${r.bar.width}%`, "--i": i }}
              />
              {refLine && <span className="ref-line" style={{ left: `${refLine.left}%` }} />}
            </span>
            {!hover.wide && <span className="help mrow-blurb">{r.note}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 7: The view.** Replace the whole of `src/views/NationalNumbers.jsx` with:

```jsx
import { useMemo } from "react";
import { nationalModel, statHover, measureHover, sparkPaths } from "../tabs/national.js";
import { formatRate } from "../calculator/format.js";
import TrendChart from "../components/TrendChart.jsx";
import MeasureList from "../components/MeasureList.jsx";
import CountUp from "../components/CountUp.jsx";
import HoverCard from "../components/HoverCard.jsx";
import { useHover } from "../components/useHover.js";
import { useFirstView } from "../components/useMotion.js";

/** A filled 12-month sparkline in the card's color (decorative: the chart below has the numbers). */
function Spark({ values }) {
  const p = sparkPaths(values, 300, 44);
  if (!p) return null;
  return (
    <svg className="spark" viewBox="0 0 300 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className="spark-area" d={p.area} />
      <path className="spark-line" d={p.line} />
    </svg>
  );
}

/** The past year next to this month's pace; the pace bar is a dashed outline. */
function Pace({ pace }) {
  return (
    <div className="pace">
      {[pace.year, pace.month].map((b, i) => (
        <div className="pace-row" key={b.label}>
          <span>{b.label}</span>
          <span className="bar-track pace-track" aria-hidden="true">
            <span
              className={`pace-bar grow${i === 1 ? " ghost" : ""}${b.neg ? " neg" : ""}`}
              style={{ left: `${b.bar.left}%`, width: `${b.bar.width}%`, "--i": i }}
            />
          </span>
          <span className="pace-val">{b.text}</span>
        </div>
      ))}
    </div>
  );
}

/** A big number on a 6% tinted card; it counts up over 900ms on the tab's first view. */
function Stat({ card, kind, hover, play }) {
  return (
    <div className={`stat ${kind}`} tabIndex={0} {...hover.target(`stat:${kind}`)}>
      <h2>{card.title}</h2>
      <p className="stat-value">
        {card.value == null
          ? card.yearText
          : <CountUp value={card.value} from={play ? 0 : null} duration={900} format={formatRate} />}
      </p>
      <p>{card.yearSentence}</p>
      {card.spark && <Spark values={card.spark} />}
      {card.pace && <Pace pace={card.pace} />}
      {card.monthSentence && <p className="stat-sub">{card.monthSentence}</p>}
      <p className="help">{card.help}</p>
    </div>
  );
}

/** The National numbers tab (spec "Other tabs", revision 4 "Charts"). Lays out nationalModel(); computes nothing. */
export default function NationalNumbers({ data }) {
  const m = useMemo(() => nationalModel(data), [data]);
  const hover = useHover();
  const play = useFirstView("national-numbers");
  const content = (key) => {
    if (!key) return null;
    const [kind, id] = key.split(":");
    if (kind === "stat") return statHover(id === "core" ? m.core : m.headline);
    if (kind === "m") {
      const row = m.measures.find((r) => r.key === id);
      return row ? measureHover(row) : null;
    }
    return null;
  };
  return (
    <article className={play ? "tab play" : "tab"} aria-labelledby="page-title">
      <header className="tab-intro">
        <h1 id="page-title" tabIndex={-1}>National numbers</h1>
        <p className="lede">{m.lede}</p>
      </header>

      <section className="stats" aria-label="The latest rates">
        <Stat card={m.headline} kind="overall" hover={hover} play={play} />
        <Stat card={m.core} kind="core" hover={hover} play={play} />
      </section>

      <section aria-labelledby="trend-title">
        <h2 id="trend-title">The last 12 months</h2>
        <p>The change in prices overall over 12 months, as of each month.</p>
        {m.trend.length > 0
          ? <TrendChart points={m.trend} ticks={m.trendTicks} animate={play} />
          : <p>These figures are not available right now.</p>}
        {m.trendNote && <p className="help">{m.trendNote}</p>}
      </section>

      <section aria-labelledby="measures-title">
        <h2 id="measures-title">Other official measures</h2>
        <p>Government agencies and the Federal Reserve measure inflation in several ways. Each number is the change over 12 months.</p>
        {m.measures.length > 0
          ? <MeasureList rows={m.measures} publishers={m.publishers} refLine={m.measureRef} hover={hover} />
          : <p>These figures are not available right now.</p>}
      </section>

      {/* Reserved: the comparison with other countries (a separate spec) goes here. */}

      {m.notes.length > 0 && (
        <div className="fine">
          {m.notes.map((text) => <p key={text}>{text}</p>)}
        </div>
      )}
      <HoverCard anchor={hover.state?.el ?? null} content={content(hover.state?.key)} />
    </article>
  );
}
```

- [ ] **Step 8: Styles.** Append to `src/styles/tabs.css`:

```css
/* Revision 4, National numbers. Big numbers sit on 6% tinted cards (8px radius on all
   corners, a 3px top rule in their color); the number itself stays --ink, because
   publisher colors are for marks. Measure rows are tinted in their publisher color. */
.stat {
  --c: var(--accent);
  padding: 14px 16px 16px;
  border-top: 3px solid var(--c);
  border-radius: 8px;
  background: color-mix(in srgb, var(--c) 6%, transparent);
}
.stat.core { --c: var(--p-labor); }
.spark { display: block; width: 100%; height: 44px; margin: 6px 0; }
.spark-line { fill: none; stroke: var(--c); stroke-width: 2; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.spark-area { fill: var(--c); opacity: 0.14; }
.pace { display: grid; gap: 4px; margin: 6px 0 8px; font-size: 13px; color: var(--ink-2); }
.pace-row { display: grid; grid-template-columns: 9.5em minmax(0, 1fr) 4.2em; align-items: center; gap: 10px; }
.pace-track { position: relative; height: 8px; }
.pace-bar { position: absolute; top: 0; height: 100%; border-radius: 3px; background: var(--c); }
.pace-bar.ghost { box-sizing: border-box; background: transparent; border: 1.5px dashed var(--c); }
.pace-val { text-align: right; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }

.trend-chart svg:focus { outline: none; }
.trend-chart svg:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.hover-card.chart-card { position: static; max-width: 260px; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 10px; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  font-weight: 600;
  font-size: 15px;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--control-edge);
  border-radius: 6px;
  cursor: pointer;
}
.chip:hover { background: var(--control-hover); border-color: var(--ink); }
.chip[aria-pressed="true"] { color: var(--accent-ink); background: var(--accent); border-color: var(--accent); }
.chip[aria-pressed="true"]::before { content: "\2713\00a0"; }
.ref-key { display: flex; align-items: center; gap: 8px; font-size: 15px; color: var(--ink-2); }
.ref-swatch { display: inline-block; width: 0; height: 16px; border-left: 1.5px dashed var(--ink-2); }
.measures { margin: 0; padding: 0; list-style: none; }
.mrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5em;
  column-gap: 12px;
  align-items: baseline;
  margin-top: 4px;
  padding: 8px 8px 10px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--c) 6%, transparent);
  transition: opacity 150ms ease, background-color 150ms ease;
}
.mrow:hover,
.mrow:focus-visible,
.mrow.on { background: color-mix(in srgb, var(--c) 13%, transparent); }
.measures.focusing .mrow:not(.on) { opacity: 0.35; }
.mrow .bar-name { display: flex; align-items: center; gap: 8px; font-weight: 500; overflow-wrap: anywhere; }
.mrow .bar-val { text-align: right; font-weight: 700; }
.mrow .bar-track { grid-column: 1 / -1; height: 12px; margin-top: 8px; }
.mrow .bar { background: var(--c); }
.ref-line { position: absolute; top: -4px; bottom: -4px; width: 0; border-left: 1.5px dashed var(--ink-2); }
.mrow-blurb { display: block; grid-column: 1 / -1; margin: 6px 0 0; }
```

- [ ] **Step 9: Run tests and build**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built in|error"`
Expected: `pass 219`, `fail 0`, `✓ built in …`.

- [ ] **Step 10: Smoke check.** Start the preview, then:

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4719/inflation-reality/#national-numbers"); pg.wait_for_selector("#page-title")
    pg.wait_for_timeout(300)
    print("stats", pg.locator(".stat-value").all_text_contents(), "aria-hidden", pg.locator(".trend-chart[aria-hidden]").count())
    print("ticks", pg.locator(".trend-chart .recharts-yAxis .recharts-cartesian-axis-tick-value").all_text_contents())
    months = pg.locator(".trend-chart + table tbody th").all_text_contents()
    chart = pg.locator(".trend-chart [tabindex='0']").first
    chart.scroll_into_view_if_needed(); chart.focus(); pg.wait_for_timeout(200)
    tip = pg.locator(".chart-card .hc-title")
    first = tip.text_content() if tip.count() else None
    pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(150)
    print("focus shows", first, "== latest", months[-1], "| ArrowLeft", tip.text_content() if tip.count() else None, "== ", months[-2])
    chip = pg.locator(".chip").first; chip.click(); pg.wait_for_timeout(100)
    print("chip", chip.get_attribute("aria-pressed"), pg.locator(".measures.focusing").count())
    row = pg.locator(".mrow").nth(2); row.scroll_into_view_if_needed(); pg.wait_for_timeout(100); row.hover(); pg.wait_for_timeout(150)
    print("row card", pg.locator("#hover-card").inner_text().replace("\n", " | ") if pg.locator("#hover-card").count() else None)
    pg.mouse.move(0, 0); pg.keyboard.press("Escape")  # close the open card before narrowing the window
    pg.set_viewport_size({"width": 390, "height": 900}); pg.reload(); pg.wait_for_selector("#page-title"); pg.wait_for_timeout(300)
    print("390 hscroll", pg.evaluate("document.documentElement.scrollWidth > window.innerWidth"), errs)
    b.close()
EOF
kill "$(cat /tmp/ir-preview.pid)"
```

Expected: two rates in `stats` (final values, since motion is reduced), `aria-hidden 0`; `ticks` evenly spaced (for example `['0%', '1%', '2%', '3%', '4%']`); the focus month equals the latest month and ArrowLeft gives the one before; `chip true 1`; a row card naming a publisher and a "points … prices overall" line; `390 hscroll False []`.

- [ ] **Step 11: Pin Recharts.** The latest-month focus calls Recharts' instance API (`accessibilityManager.setIndex`, kept behind optional chaining; Task 10's arrow-key check guards it), so pin the installed version exactly. In `package.json` replace `    "recharts": "^2.13.3",` with `    "recharts": "2.15.4",`, and make the same replacement in `package-lock.json` (the root `packages[""]` entry, the only line with `"recharts": "^2.13.3"`). Do not run `npm install`.

Run: `npm ls recharts 2>&1 | grep recharts@ && grep -n '"recharts": "2.15.4"' package.json package-lock.json`
Expected: `recharts@2.15.4`, and one matching line in each file.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json src/tabs/national.js src/tabs/national.test.mjs src/components/TrendChart.jsx src/components/MeasureList.jsx src/views/NationalNumbers.jsx src/styles/tabs.css
git commit -m "feat(national): trend crosshair with keyboard steps, tinted big numbers, publisher-colored measures" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Price check movers in family colors, the fuel paragraphs, Sources family dots

**Files:**
- Modify: `src/tabs/prices.js`, `src/tabs/prices.test.mjs`, `src/tabs/sources.js`, `src/tabs/sources.test.mjs`, `src/views/Sources.jsx`, `src/styles/tabs.css`
- Rewrite: `src/components/BarList.jsx`, `src/views/PriceCheck.jsx`

**Interfaces:**
- Consumes: `FAMILIES`, `BASKET_ROWS`, `LINES` (Task 2); `useHover`, `HoverCard` (Task 4); `useFirstView` (Task 7).
- Produces:
  - `prices.js`: `PRICE_FAMILY: Record<seriesId, familyId>`, `priceFamily(seriesId): familyId` (default `"food"`); `movers()` rows gain `family`, `familyLabel`, `nowText`, `yearAgoText` (with units, "$2.27 a dozen"); `moverHover(row): HoverContent`.
  - `sources.js`: every `seriesGroups()` row gains `family: familyId | null`.
  - `BarList({ rows, label, hover = null })`: rows with a `family` get `data-family`, a dot and a bar in that color; with `hover`, each row is a tab stop and a hover target (key `"bar:<key>"`); a zero line is drawn in each track.

- [ ] **Step 1: Write the failing tests.** In `src/tabs/prices.test.mjs`, replace `import { unitWords, pctChange, formatPrice, avgPriceGroups, movers, fuelRows, priceNotes } from "./prices.js";` with:

```js
import {
  unitWords, pctChange, formatPrice, avgPriceGroups, movers, fuelRows, priceNotes, priceFamily, moverHover,
} from "./prices.js";
```

and append:

```js
test("movers: each item has a kind of spending, prices with units, and a hover card", () => {
  const by = Object.fromEntries(movers(viewData()).map((r) => [r.key, r]));
  assert.equal(by.APU0000708111.family, "food");
  assert.equal(by.APU000074714.family, "around");
  assert.equal(by.APU000072610.family, "util");
  assert.equal(priceFamily("APU000074717"), "around");
  assert.equal(priceFamily("APU000072620"), "util");
  assert.equal(priceFamily("APU0000709112"), "food");
  assert.deepEqual(moverHover(by.APU0000708111), {
    title: "Eggs, Grade A Large", family: "food",
    items: [["Kind of spending", "Food"], ["Price now", "$2.27 a dozen"], ["A year ago", "$3.59 a dozen"], ["Change", "−36.7%"]],
    lines: [], note: "",
  });
});
```

In `src/tabs/sources.test.mjs`, add under the existing imports:

```js
import { FAMILIES } from "../calculator/config.js";
```

and append:

```js
test("series rows carry a family dot where the series is a kind of spending", () => {
  const ids = new Set(FAMILIES.map((f) => f.id));
  for (const r of byId.household.rows) assert.ok(ids.has(r.family), `${r.name} has a family`);
  assert.equal(byId.household.rows.find((r) => r.seriesId === "CUUR0000SETB01").family, "around");
  assert.equal(byId.household.rows.find((r) => r.name.startsWith("Doctor and pharmacy: ")).family, "health");
  assert.equal(byId.average.rows.find((r) => r.seriesId === "CPIMEDNS").family, "health");
  assert.equal(byId.average.rows.find((r) => r.seriesId === "CUUR0000SAH1").family, "home");
  assert.equal(byId.prices.rows.find((r) => r.seriesId === "APU000072610").family, "util");
  assert.equal(byId.prices.rows.find((r) => r.seriesId === "GASREGW").family, "around");
  for (const g of [byId.yardstick, byId.national]) for (const r of g.rows) assert.equal(r.family, null, r.name);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test src/tabs/prices.test.mjs src/tabs/sources.test.mjs 2>&1 | grep -E "^not ok|does not provide|^ℹ fail"`
Expected: FAIL: `does not provide an export named 'priceFamily'` and `not ok … series rows carry a family dot …`.

- [ ] **Step 3: Families for prices.** In `src/tabs/prices.js`, replace `import { formatRate, barGeometry } from "../calculator/format.js";` with:

```js
import { formatRate, barGeometry } from "../calculator/format.js";
import { FAMILIES } from "../calculator/config.js";
```

Insert after the `UNIT_WORDS` block:

```js
/** Which kind of spending each average-price item belongs to; anything not listed is Food. */
export const PRICE_FAMILY = {
  APU000074714: "around", // gasoline
  APU000074717: "around", // diesel
  APU000072610: "util", // electricity
  APU000072620: "util", // natural gas
};
const FAMILY_LABEL = Object.fromEntries(FAMILIES.map((f) => [f.id, f.label]));

export function priceFamily(seriesId) {
  return PRICE_FAMILY[seriesId] ?? "food";
}
```

Replace the whole `movers` function (and its doc comment) with:

```js
/**
 * The `count` items whose prices moved the most over the year, up or down, largest
 * first. Items without both prices are left out. Rows have the BarList shape plus the
 * item's family and both prices with units, for its hover card.
 */
export function movers(data, count = 10) {
  const list = data.avgPrices
    .map((p) => ({ p, key: p.seriesId, name: p.item, value: pctChange(p.current, p.yearAgo) }))
    .filter((r) => r.value != null)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.name.localeCompare(b.name))
    .slice(0, count);
  const bars = barGeometry(list.map((r) => r.value));
  return list.map(({ p, ...r }, i) => {
    const family = priceFamily(p.seriesId);
    return {
      ...r,
      note: "",
      valueText: formatRate(r.value),
      bar: bars[i],
      family,
      familyLabel: FAMILY_LABEL[family],
      nowText: `${formatPrice(p.current, p.unit)} ${unitWords(p.unit)}`,
      yearAgoText: `${formatPrice(p.yearAgo, p.unit)} ${unitWords(p.unit)}`,
    };
  });
}

/** Hover card for a Biggest price changes row: item, family, both prices with units, the change. */
export function moverHover(row) {
  return {
    title: row.name,
    family: row.family,
    items: [["Kind of spending", row.familyLabel], ["Price now", row.nowText], ["A year ago", row.yearAgoText], ["Change", row.valueText]],
    lines: [],
    note: "",
  };
}
```

- [ ] **Step 4: Families for Sources.** In `src/tabs/sources.js`:

Replace `import { LINES, EMPLOYER_HEALTH_DEFAULT } from "../calculator/config.js";` with `import { LINES, BASKET_ROWS, EMPLOYER_HEALTH_DEFAULT } from "../calculator/config.js";` and `import { pctChange } from "./prices.js";` with `import { pctChange, priceFamily } from "./prices.js";`.

Replace

```js
const row = (name, seriesId, source, yoy = null) => ({
  name, seriesId, source: source === "bls" ? "BLS" : "FRED", url: sourceUrl(seriesId, source), yoy,
});
```

with

```js
// family: the kind of spending the series stands for (a FAMILIES id, shown as a dot), or null.
const row = (name, seriesId, source, yoy = null, family = null) => ({
  name, seriesId, source: source === "bls" ? "BLS" : "FRED", url: sourceUrl(seriesId, source), yoy, family,
});
```

Then make these one-line replacements inside `seriesGroups` (each old line, then its new line):

```js
// old
        ...household.map((l) => row(l.label, l.seriesId, l.source, lineYoy(l.id))),
// new
        ...household.map((l) => row(l.label, l.seriesId, l.source, lineYoy(l.id), LINES[l.id]?.family ?? null)),

// old
        ...CALC_COMBOS.flatMap((c) => c.parts.map((p) => row(`${c.label}: ${p.label.toLowerCase()}`, p.seriesId, c.source))),
// new
        ...CALC_COMBOS.flatMap((c) => c.parts.map((p) => row(`${c.label}: ${p.label.toLowerCase()}`, p.seriesId, c.source, null, LINES[c.id]?.family ?? null))),

// old
      rows: BASKET.visible.map((v) => row(v.label, v.seriesId, "fred", basketRate(v.id))),
// new
      rows: BASKET.visible.map((v) => row(v.label, v.seriesId, "fred", basketRate(v.id), BASKET_ROWS[v.id]?.family ?? null)),

// old
          return row(p.item, p.seriesId, "fred", pctChange(a?.current ?? null, a?.yearAgo ?? null));
// new
          return row(p.item, p.seriesId, "fred", pctChange(a?.current ?? null, a?.yearAgo ?? null), priceFamily(p.seriesId));

// old
          return row(`${w.label}, weekly`, w.seriesId, "fred", pctChange(x?.current ?? null, x?.yearAgo ?? null));
// new
          return row(`${w.label}, weekly`, w.seriesId, "fred", pctChange(x?.current ?? null, x?.yearAgo ?? null), "around");
```

- [ ] **Step 5: Run the tests**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 221`, `fail 0` (the spreadsheet tests still pass: `workbook.js` reads named fields only).

- [ ] **Step 6: The bar list.** Replace the whole of `src/components/BarList.jsx` with:

```jsx
/**
 * Rows of name, value and a bar from a zero line, with direct value labels. Rows come
 * from movers(): { key, name, note, value, valueText, bar: { left, width }, family? }.
 * With a family, the row's dot and bar take its color (spec "Charts and the other
 * tabs"); with `hover`, each row is a tab stop and a hover target. Falls extend left of
 * the zero line and grow from it.
 */
export default function BarList({ rows, label, hover = null }) {
  const first = rows[0];
  const zero = first ? (first.value < 0 ? first.bar.left + first.bar.width : first.bar.left) : 0;
  return (
    <ul className="bar-list" aria-label={label}>
      {rows.map((r, i) => (
        <li
          className="bar-row"
          key={r.key}
          data-family={r.family}
          tabIndex={hover ? 0 : undefined}
          {...(hover ? hover.target(`bar:${r.key}`, r.family ?? null) : {})}
        >
          <span className="bar-name">
            {r.family && <span className="dot" aria-hidden="true" />}
            {r.name}
            {r.note && <span className="line-note">{r.note}</span>}
          </span>
          <span className="bar-val">{r.valueText}</span>
          <span className="bar-track" aria-hidden="true">
            <span className="zero-line" style={{ left: `${zero}%` }} />
            <span
              className={r.value < 0 ? "bar grow neg" : "bar grow"}
              style={{ left: `${r.bar.left}%`, width: `${r.bar.width}%`, "--i": i }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 7: The Price check view.** Replace the whole of `src/views/PriceCheck.jsx` with:

```jsx
import { useMemo } from "react";
import { avgPriceGroups, movers, fuelRows, priceNotes, moverHover } from "../tabs/prices.js";
import BarList from "../components/BarList.jsx";
import HoverCard from "../components/HoverCard.jsx";
import { useHover } from "../components/useHover.js";
import { useFirstView } from "../components/useMotion.js";

/** The Price check tab (spec "Other tabs", revision 4 "Charts"). Lays out prices.js output; computes nothing. */
export default function PriceCheck({ data }) {
  const groups = useMemo(() => avgPriceGroups(data), [data]);
  const fuel = useMemo(() => fuelRows(data), [data]);
  const moved = useMemo(() => movers(data), [data]);
  const notes = useMemo(() => priceNotes(data), [data]);
  const hover = useHover();
  const play = useFirstView("price-check");
  const month = data.referenceMonthLabel;
  const content = (key) => {
    const row = key ? moved.find((r) => `bar:${r.key}` === key) : null;
    return row ? moverHover(row) : null;
  };

  return (
    <article className={play ? "tab play" : "tab"} aria-labelledby="page-title">
      <header className="tab-intro">
        <h1 id="page-title" tabIndex={-1}>Price check</h1>
        <p className="lede">
          {month ? `Average prices for everyday items in ${month}, next to what they cost a year earlier.` : "Average prices for everyday items, next to what they cost a year earlier."}
          {" "}Government workers collect these prices in stores across the country.
        </p>
      </header>

      <section aria-labelledby="avg-title">
        <h2 id="avg-title">Average prices</h2>
        <table className="data-table">
          <caption className="sr">Average prices now and a year earlier</caption>
          <colgroup>
            <col style={{ width: "40%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="num">Now</th>
              <th scope="col" className="num">A year ago</th>
              <th scope="col" className="num">Change</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.category}>
              <tr><th scope="rowgroup" colSpan={4} className="group">{g.category}</th></tr>
              {g.items.map((i) => (
                <tr key={i.seriesId}>
                  <th scope="row">{i.item}<span className="line-note">{i.unitText}</span></th>
                  <td className="num">{i.nowText}</td>
                  <td className="num">{i.yearAgoText}</td>
                  <td className="num">{i.changeText}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <p className="help">
          Average prices show what things cost. To measure how fast prices rise, the government uses its price index instead. Your costs uses the price index.
        </p>
      </section>

      <section aria-labelledby="fuel-title">
        <h2 id="fuel-title">Gas and diesel this week</h2>
        <p>The Energy Information Administration checks fuel prices every week, so these are newer than the monthly averages above.</p>
        {fuel.map((f) => (
          <div className="fuel" key={f.key}>
            <h3>{f.label}</h3>
            <p className="fuel-price">{f.nowText}</p>
            {f.weekText && <p>{f.weekText}</p>}
            {f.yearAgoText && <p>{f.yearAgoText}</p>}
            {f.monthlyText && <p className="help">{f.monthlyText}</p>}
            <p className="help">{f.blurb}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="movers-title">
        <h2 id="movers-title">Biggest price changes</h2>
        <p>The items above whose prices changed the most over the year, up or down.</p>
        {moved.length > 0
          ? <BarList rows={moved} label="Biggest price changes, largest first" hover={hover} />
          : <p>These figures are not available right now.</p>}
      </section>

      {notes.length > 0 && (
        <div className="fine">
          {notes.map((text) => <p key={text}>{text}</p>)}
        </div>
      )}
      <HoverCard anchor={hover.state?.el ?? null} content={content(hover.state?.key)} />
    </article>
  );
}
```

- [ ] **Step 8: Sources dots and the styles.** In `src/views/Sources.jsx`, replace `                    <th scope="row">{r.name}</th>` with:

```jsx
                    <th scope="row">
                      {r.family && <span className="dot" data-family={r.family} aria-hidden="true" />}
                      {r.name}
                    </th>
```

In `src/styles/tabs.css`: replace `.bar-row .bar-track { grid-column: 1 / -1; height: 6px; margin-top: 8px; }` with `.bar-row .bar-track { grid-column: 1 / -1; height: 10px; margin-top: 8px; }`; replace `.bar-row .bar { background: var(--bar-line); }` with:

```css
.bar-row .bar { background: var(--c, var(--bar-line)); }
.bar-row:hover,
.bar-row:focus-visible { background: color-mix(in srgb, var(--c, var(--bar-line)) 13%, transparent); }
.bar-row .bar-name { display: flex; align-items: center; gap: 8px; }
.zero-line { position: absolute; top: -3px; bottom: -3px; width: 0; border-left: 1px solid var(--control-edge); }
```

replace `.fuel p { margin: 0; }` with:

```css
.fuel p { margin: 0; }
/* Each fuel note is its own paragraph, not one run of text. */
.fuel .help { margin-top: 6px; }
```

and append:

```css
.series-table th .dot { margin-right: 8px; }
```

- [ ] **Step 9: Build and smoke**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built in|error"`
Expected: `pass 221`, `fail 0`, `✓ built in …`.

Start the preview, then:

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
GAP = """() => [...document.querySelectorAll('.fuel')].map((f) => { const h = [...f.querySelectorAll('.help')];
  return h.length < 2 ? null : h[1].getBoundingClientRect().top - h[0].getBoundingClientRect().bottom; })"""
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4719/inflation-reality/#price-check"); pg.wait_for_selector("#page-title")
    print("rows", pg.locator(".bar-list .bar-row").count(), "dots", pg.locator(".bar-list .bar-row .dot").count(), "fuel gaps", pg.evaluate(GAP))
    row = pg.locator(".bar-list .bar-row").first; row.scroll_into_view_if_needed(); pg.wait_for_timeout(100); row.hover(); pg.wait_for_timeout(150)
    print("card", pg.locator("#hover-card").inner_text().replace("\n", " | ") if pg.locator("#hover-card").count() else None)
    pg.goto("http://localhost:4719/inflation-reality/#sources"); pg.wait_for_selector("#page-title")
    print("source dots", pg.locator("table[aria-labelledby='series-household'] .dot").count(), errs)
    b.close()
EOF
kill "$(cat /tmp/ir-preview.pid)"
```

Expected: `rows 10 dots 10`, every non-null fuel gap at least `4`; a card with "Kind of spending", "Price now" and "A year ago"; `source dots` at least `17`; no errors.

- [ ] **Step 10: Commit**

```bash
git add src/tabs/prices.js src/tabs/prices.test.mjs src/tabs/sources.js src/tabs/sources.test.mjs src/components/BarList.jsx src/views/PriceCheck.jsx src/views/Sources.jsx src/styles/tabs.css
git commit -m "feat(price-check): movers in family colors with hover cards; separate fuel notes; family dots on Sources" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The revision 4 audit (`scripts/audit/ui-audit.py`)

**Files:**
- Rewrite: `scripts/audit/ui-audit.py`

**Interfaces:**
- Consumes: the DOM contract from Tasks 3 to 9: `.strip`, `.strip-more`, `#answer`/`.answer`, `.rates`, `.verdict`, `.compare`, `.mix`, `.slice[data-family]`, `.lg`, `.basis`, `.quick .btn`, `.summary`, `#questions`, `.amounts`, `.fam[data-family]`, `button.fam-head[aria-expanded][aria-controls]`, `.fam-head[tabindex='0']`, `.fam-total`, `.fam-prompt`, `.amt`, `.amt-rate`, `.amt-adds`, `#amount-<id>`, `#renewal-<id>`, `#slider-<id>`, `.amounts-note`, `#hover-card`, `.hover-card`, `.chart-card .hc-title`, `.stat.overall`, `.stat-value`, `.trend-chart`, `.chip`, `.measures(.focusing)`, `.mrow[data-publisher]`, `.bar-list .bar-row`, `.fuel .help`, `.toast`.
- Produces: `python3 scripts/audit/ui-audit.py [--base-url URL] [--live-data] [--real-fonts] [--seed N] [--rounds N]`, exit 0 only when every check passes.

What changes, per the spec's *Audit and test changes*:
- Design rule 5: one **bordered** raised surface per view (the strip); fixed elements and `.hover-card` are exempt; tinted `.fam` and `.mrow` must have no border. Radii allowed: 0, 3px (bars), 5px (slider tracks), 6px (controls, chips, tinted rows), 8px (cards, toast, hover card), 10px (strip), 50% (dots, thumbs).
- The dark-mode light-background check allows `[data-family]` and `[data-publisher]` marks and sliders; the `.dock` exemption is gone.
- Numbers are read with **reduced motion emulated**; one separate pass with motion on checks that values settle to the same numbers with no console errors.
- `panel_sum_ok` and every `.line` selector re-point to the card rows (`card_sums_ok`, Average included); the Show all and renewal-prompt-row flows are gone, replaced by "empty renewal box shows Add your renewal increase in its row and on the folded heading"; the sticky check moves from `.result-col` at 1280 to `.strip` at every width; at 390px the random-amounts fill opens the cards first.
- New flows: a quick start folds the questions, and the Commuter page height meets the success criterion (≤ 1,500px at 1280; ≤ 2,000px at 390 with every card folded); hovering a row shows a card with its dollar figures; arrow keys move the trend crosshair; at 390px a card heading toggles `aria-expanded` and reveals its sliders; with reduced motion, bars are at full width on first paint.
- Plan review additions (2026-10-17): a touch pass (390px phone and an 820px touch tablet: rows, sliders and fold buttons open no card, a legend tap pins one, a tap elsewhere closes it); a keyboard-focus loop over every card target at 1280 and the same targets opening nothing at 390; the strip still at the top after scrolling 1,500px; `aria-describedby` on the focused dollar box; `--real-fonts` for the page-height gates; a guard that stops `--live-data` against localhost.
- Phase 2b review gaps: the Personal state in dark mode at 1280; banned strings scanned in the whole page (`body`), not only `main`; the dead `cpi.json` console filter removed (so `--live-data` only runs against the live site).

- [ ] **Step 1: Replace the whole of `scripts/audit/ui-audit.py` with:**

```python
#!/usr/bin/env python3
"""UI audit for Inflation Reality (spec "Testing", and "Revision 4: Audit and test changes").

Runs the user flows and the automatable Design rules (1, 2, 4, 5, 8) on every tab, in light and
dark themes, at 390px and 1280px, plus a random-amounts probe of the Your costs cards (amounts
include 0 and tiny values, which default amounts never hit). Numbers are read with reduced motion
emulated, since count-ups would otherwise be read mid-count against the fake clock; one separate
pass with motion on checks that values settle to the same numbers.

Local, against the built site (the default base URL):
    npm run build && node node_modules/vite/bin/vite.js preview --port 4719 --strictPort   # in another shell
    python3 scripts/audit/ui-audit.py
Live site, with the real cpi.json (the merge gate's "production data live" run):
    python3 scripts/audit/ui-audit.py --base-url https://derektm17.github.io/inflation-reality/ --live-data
--live-data is for the live site only: vite preview has no cpi.json, and every console error counts
(the audit stops if --live-data is given a localhost URL). --real-fonts loads Libre Franklin from Google
Fonts instead of stubbing it (needs the network), for the page-height gates with the real type.

By default cpi.json is answered with scripts/audit/fixture-cpi.json, so results don't move with each
month's data. Google Fonts requests are stubbed either way. The page runs on Playwright's fake clock
so the Undo toast's 8-second timer can be tested. Uses its own browser: the Playwright MCP browser is
shared with other sessions. A failed check is reported and the run continues; the exit code is 1 if
any failed. A missing element stops the run at once with exit code 1.
"""
import argparse
import random
import re
import sys
import tempfile
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
FIXTURE = HERE / "fixture-cpi.json"
ROUTES = [("your-costs", "", "Your costs"), ("national-numbers", "#national-numbers", "National numbers"),
          ("price-check", "#price-check", "Price check"), ("sources", "#sources", "Sources")]
BANNED = ["—", "·", "→", "!", "Welcome back", "Here's", "Let's", "simply", "repriced", "reimagined", "/yr", "/mo"]
BANNED_YOUR_COSTS = ["CPI", "YoY", "relative importance"]
SHEETS = ["Your estimate", "Price changes", "Average prices", "Monthly trend", "How it works"]
MINUS = "−"
RENEWAL = "Add your renewal increase"

failures = []


def check(cond, msg):
    print(("ok:   " if cond else "FAIL: ") + msg)
    if not cond:
        failures.append(msg)


# Design rules 1, 2, 4 (emoji, code), 5 (revision 4 wording), radius by role, dark-mode surfaces.
# Returns a list of problems; empty means the view passes.
RULES_JS = r"""
(dark) => {
  const problems = [];
  const seen = new Set();
  const note = (msg) => { if (!seen.has(msg) && seen.size < 40) { seen.add(msg); problems.push(msg); } };
  const visible = (el, cs) => cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0;
  const name = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "");
  const families = new Set();
  // Roles: 3px bars, 5px slider tracks, 6px controls, chips and tinted rows, 8px tinted cards,
  // the hover card and the toast, 10px the result strip, 50% dots and slider thumbs.
  const radii = new Set(["0px", "3px", "5px", "6px", "8px", "10px", "50%"]);
  const lum = (rgb) => {
    const m = rgb.match(/[\d.]+/g); if (!m) return 0;
    const [r, g, b] = m.slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const transparent = (c) => c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
  const sides = ["Top", "Right", "Bottom", "Left"];
  let raised = 0;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    families.add(cs.fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase());
    if (/mono/i.test(cs.fontFamily)) note(`rule 1: monospace font on ${name(el)}`);
    if (cs.textTransform === "uppercase") note(`rule 2: uppercase on ${name(el)}`);
    const ls = parseFloat(cs.letterSpacing);
    if (ownText && ls > 0 && parseFloat(cs.fontSize) < 20) note(`rule 2: letter-spacing ${cs.letterSpacing} on ${name(el)}`);
    for (const k of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"]) {
      if (!radii.has(cs[k])) note(`rule 5: radius ${cs[k]} on ${name(el)}`);
    }
    const bordered = sides.every((s) => parseFloat(cs[`border${s}Width`]) > 0);
    // One bordered raised surface per view; fixed elements (toast, hover card) are exempt.
    const exempt = cs.position === "fixed" || el.closest(".hover-card");
    if (!exempt && bordered && !transparent(cs.backgroundColor) && parseFloat(cs.borderTopLeftRadius) >= 8) raised += 1;
    if (el.matches(".fam, .mrow") && sides.some((s) => parseFloat(cs[`border${s}Width`]) > 0)) {
      note(`rule 5: tinted ${name(el)} has a border`);
    }
    if (dark && !transparent(cs.backgroundColor) && lum(cs.backgroundColor) > 0.4
        && !el.closest(".bar-track, .toast, [aria-pressed='true'], .check, [data-family], [data-publisher], .slider")) {
      note(`dark: light background ${cs.backgroundColor} on ${name(el)}`);
    }
  }
  if (families.size > 2) note(`rule 1: ${families.size} font families: ${[...families].join(", ")}`);
  if (raised > 1) note(`rule 5: ${raised} bordered raised surfaces`);
  if (document.querySelector("code, pre, kbd, samp")) note("rule 1: a code element is rendered");
  const text = document.body.innerText;
  if (/\p{Extended_Pictographic}|️/u.test(text)) note("rule 4: emoji in rendered text");
  if (/NaN|Infinity|undefined|\[object Object\]/.test(text)) note("broken value (NaN, Infinity, undefined) in rendered text");
  if (document.documentElement.scrollWidth > window.innerWidth) note("horizontal scroll");
  return problems;
}
"""

# True when no bar is mid-animation: a scaleX transform makes the drawn width differ from the layout width.
FULL_BARS_JS = r"""
(sel) => [...document.querySelectorAll(sel)].filter((b) => b.offsetWidth > 0)
  .every((b) => Math.abs(b.getBoundingClientRect().width - b.offsetWidth) < 0.5)
"""

# Sets a range input the way a drag does, so React's onChange runs.
SET_SLIDER_JS = r"""
([sel, value]) => {
  const el = document.querySelector(sel);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(value));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
"""

AMOUNTS_END_JS = "() => document.querySelector('.amounts').getBoundingClientRect().bottom + window.scrollY"

FUEL_GAPS_JS = r"""
() => [...document.querySelectorAll(".fuel")].map((f) => {
  const h = [...f.querySelectorAll(".help")];
  return h.length < 2 ? null : h[1].getBoundingClientRect().top - h[0].getBoundingClientRect().bottom;
})
"""


def dollars(text):
    """'+$980 a year' -> 980, '−$40' -> -40, 'under $10 a year' -> 0, 'Add your renewal increase' -> 0."""
    t = text.strip().removesuffix(" a year")
    if t in ("", "under $10", "$0") or t.startswith("Add your renewal"):
        return 0
    return (-1 if t.startswith(MINUS) else 1) * int(re.sub(r"[^\d]", "", t))


def answer_total(text):
    if text.startswith("About the same"):
        return 0
    m = re.fullmatch(r"About \$([\d,]+) (more|less) a year", text)
    if not m:
        return None
    v = int(m.group(1).replace(",", ""))
    return v if m.group(2) == "more" else -v


def new_page(browser, args, width, theme, reduced=True, touch=False):
    context = browser.new_context(viewport={"width": width, "height": 900}, color_scheme=theme, has_touch=touch,
                                  reduced_motion="reduce" if reduced else "no-preference", accept_downloads=True)
    page = context.new_page()
    page.clock.install()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    if not args.real_fonts:
        page.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
        page.route("https://fonts.gstatic.com/**", lambda r: r.abort())
    if not args.live_data:
        page.route("**/cpi.json", lambda r: r.fulfill(path=str(FIXTURE), content_type="application/json"))
    return context, page, errors


def go(page, base, hash_=""):
    page.goto(base + hash_)
    page.wait_for_selector("#page-title")
    page.wait_for_timeout(400)


def rules(page, where, dark, your_costs):
    problems = page.evaluate(RULES_JS, dark)
    check(problems == [], f"{where}: design rules {problems}")
    text = page.locator("body").inner_text()
    banned = BANNED + (BANNED_YOUR_COSTS if your_costs else [])
    found = [b for b in banned if b in text]
    check(found == [], f"{where}: voice guide banned strings {found}")


def hover(page, locator):
    """Scroll first (scrolling closes an open card), then point at the target."""
    locator.scroll_into_view_if_needed()
    page.wait_for_timeout(100)
    locator.hover()
    page.wait_for_timeout(150)


def focus_opens(page, locator):
    """Focus a target and report whether a card opened. The mouse moves to the page margin first, so a card
    opened by the resting pointer (Chrome re-sends pointer events after a scroll) never counts."""
    page.mouse.move(0, 0)
    page.locator("#page-title").focus()
    page.keyboard.press("Escape")
    page.wait_for_timeout(50)
    locator.focus()
    page.wait_for_timeout(150)
    return page.locator("#hover-card").count() == 1


def card_text(page):
    card = page.locator("#hover-card")
    return card.inner_text() if card.count() else ""


def quick_start(page, label):
    page.get_by_role("button", name=label, exact=True).click()
    page.wait_for_timeout(200)


def set_cards(page, expanded):
    """Phones: open (or fold) every family card. A no-op at 600px and wider, where cards never fold."""
    heads = page.locator(f"button.fam-head[aria-expanded='{'false' if expanded else 'true'}']")
    for _ in range(12):
        if heads.count() == 0:
            break
        heads.first.click()
        page.wait_for_timeout(50)


def card_sums_ok(page, where):
    """Card rows, and separately card headings, add up to the answer; no row shows the opposite sign of its rate."""
    answer = page.locator(".answer").text_content()
    total = answer_total(answer)
    if total is None:
        check(answer.startswith("Enter your monthly amounts") or answer.startswith("Price data"), f"{where}: zero-total message")
        return
    rows = [dollars(t) for t in page.locator(".fam .amt-adds").all_text_contents()]
    heads = [dollars(t) for t in page.locator(".fam .fam-total").all_text_contents()]
    check(len(rows) > 0 and sum(rows) == total, f"{where}: rows add up ({sum(rows)} vs {total})")
    check(sum(heads) == total, f"{where}: card headings add up ({sum(heads)} vs {total})")
    flips = []
    for row in page.locator(".fam .amt").all():
        rate = row.locator(".amt-rate").text_content() if row.locator(".amt-rate").count() else ""
        amt = row.locator(".amt-adds").text_content()
        if (rate.startswith("+") and amt.startswith(MINUS)) or (rate.startswith(MINUS) and amt.startswith("+")):
            flips.append(f"{rate} {amt}")
    check(flips == [], f"{where}: no row shows the opposite sign of its rate {flips}")


def flows(browser, args, base):
    """Phone flows at 390px, light, reduced motion."""
    context, page, errors = new_page(browser, args, 390, "light")
    text = lambda sel: page.locator(sel).first.text_content()

    # Average first screen: the strip, folded cards holding basket rows as text.
    go(page, base)
    check(page.title() == "Inflation Reality", "Your costs title")
    check(text(".strip h2").startswith("The average U.S. household vs. "), "Average title")
    check(answer_total(text(".answer")) is not None, "Average answer")
    check(page.locator(".verdict").count() == 0 and page.locator(".compare").count() == 0, "Average has no verdict or bars")
    check(page.locator(".strip-more .btn", has_text="Answer the questions").count() == 1, "390: Answer the questions sits under the strip")
    check(page.locator(".mix-legend .lg").count() == 7, "Average spending mix has one legend item per family")
    check(page.locator("button.fam-head").count() == 7
          and page.locator("button.fam-head[aria-expanded='true']").count() == 0, "390: every card starts folded")
    check(page.locator(".fam input").count() == 0, "Average rows are text, not inputs")
    check(text(".amounts-note") == "Answer the questions or pick a household to change these.", "Average note under the cards")
    card_sums_ok(page, "Average")
    rules(page, "Your costs, Average, 390 light", False, True)

    # Mortgage: 0% line, explanation, guesses, basis, owners' yardstick.
    page.get_by_role("button", name=re.compile("^Mortgage")).click()
    page.wait_for_timeout(200)
    check(page.locator(".opt.guess").count() == 3, "three guessed answers")
    check(text(".basis").startswith("Based on 1 answer and 3 guesses."), "basis wording")
    check(page.locator(".help").first.text_content().startswith("A fixed-rate payment"), "mortgage explanation")
    check("Prices other than housing" in text(".rates"), "owners compared with prices other than housing")
    verdict = text(".verdict")
    check("prices other than housing" in verdict or verdict.startswith("About the same as prices other than housing"),
          "owner verdict names the yardstick")
    check(page.locator(".amt", has_text="Mortgage payment").locator(".amt-rate").text_content() == "0%", "mortgage line is 0%")

    # Empty renewal box: the row and the folded heading both say so; a phone heading opens its sliders.
    home = page.locator(".fam[data-family='home']")
    head = home.locator("button.fam-head")
    insurance = home.locator(".amt", has_text="Home insurance").locator(".amt-adds")
    check(insurance.text_content() == RENEWAL, "empty renewal box shows the prompt in its row")
    check(home.locator("button.fam-head .fam-prompt").count() == 1 and home.locator(".fam-prompt").text_content() == RENEWAL,
          "empty renewal box shows the prompt inside the folded heading's button")
    check(home.locator(".slider").first.is_hidden(), "390: a folded card hides its sliders")
    head.click()
    page.wait_for_timeout(100)
    check(head.get_attribute("aria-expanded") == "true" and home.locator(".slider").first.is_visible()
          and page.locator("#" + head.get_attribute("aria-controls")).count() == 1,
          "390: a card heading toggles aria-expanded and reveals its sliders")
    page.locator("#renewal-homeIns").fill("8")
    page.wait_for_timeout(200)
    check(insurance.text_content() != RENEWAL, "the row's prompt leaves once a rate is typed")

    # Daycare checkbox adds a line.
    page.get_by_role("checkbox", name="Daycare").check()
    page.wait_for_timeout(200)
    check(page.locator(".amt", has_text="Daycare").count() == 1, "daycare line appears")

    # A falling price renders as −$ (bus and train fares fall in the fixture).
    page.get_by_role("button", name=re.compile("^No car")).click()
    page.wait_for_timeout(200)
    if not args.live_data:
        fares = page.locator(".amt", has_text="Bus and train fares").locator(".amt-adds").text_content()
        check(fares.startswith(MINUS + "$"), f"a falling price shows {MINUS}$ ({fares})")
    card_sums_ok(page, "Personal, defaults")
    set_cards(page, True)
    rules(page, "Your costs, Personal, 390 light, cards open", False, True)
    for sel in (".lg", ".compare .bar-track", "#amount-groceries"):
        check(not focus_opens(page, page.locator(sel).first), f"390: focus on {sel} opens no card")

    # Sliders: live, and an amount above the slider's range pins the thumb.
    before = text(".answer")
    page.evaluate(SET_SLIDER_JS, ["#slider-groceries", 1200])
    page.wait_for_timeout(150)
    check(page.locator("#amount-groceries").input_value() == "1200", "the slider fills its dollar box")
    check(text(".answer") != before, "the slider changes the answer live")
    check(page.locator("#slider-groceries").get_attribute("aria-valuetext") == "$1,200 a month", "slider aria-valuetext")
    page.locator("#amount-groceries").fill("4000")
    page.wait_for_timeout(150)
    check(page.locator("#slider-groceries").input_value() == "1900" and page.locator("#amount-groceries").input_value() == "4000",
          "an amount above the slider's max pins the thumb at the end")

    # Random amounts, including 0 and tiny values: totals add up, no sign flips, no NaN.
    rng = random.Random(args.seed)
    print(f"random amounts seed {args.seed}")
    choices = [0, 0, 1, 4, 5, 6, 9, 14, 15, 37, 120, 999, 2500]
    inputs = page.locator("input[id^='amount-']")
    for round_ in range(args.rounds):
        for i in range(inputs.count()):
            inputs.nth(i).fill(str(rng.choice(choices + [rng.randint(0, 6000)])))
        page.wait_for_timeout(200)
        card_sums_ok(page, f"random amounts round {round_ + 1}")
        check("NaN" not in page.locator(".calc").inner_text(), f"random amounts round {round_ + 1}: no NaN")
    for i in range(inputs.count()):
        inputs.nth(i).fill("0")
    page.wait_for_timeout(200)
    check(text(".answer") == "Enter your monthly amounts to see your estimate.", "all amounts 0: zero-total message")
    check(page.locator(".fam .slider").count() > 0 and page.locator(".mix").count() == 0, "all amounts 0: cards stay, no mix bar")
    for i in range(inputs.count()):
        inputs.nth(i).fill("")
        inputs.nth(i).fill(str(rng.randint(50, 900)))
    page.wait_for_timeout(200)

    # Saved answers: reload folds to the summary; Start over, toast timer, Undo.
    saved = page.evaluate("localStorage.getItem('inflation-reality:answers:v1')")
    check(bool(saved) and '"version":1' in saved, "answers saved")
    page.reload()
    page.wait_for_selector("#page-title")
    page.wait_for_timeout(400)
    check(text(".lede").startswith("Updated with "), "returning lede")
    check(text(".summary p").startswith("Fixed-rate mortgage, no car"), "returning summary")
    page.get_by_role("button", name="Start over").click()
    page.wait_for_timeout(200)
    check(text(".toast").startswith("Answers cleared."), "Undo toast")
    check(text(".strip h2").startswith("The average U.S. household"), "Start over returns to Average")
    page.clock.fast_forward(9000)
    page.wait_for_timeout(200)
    check(page.locator(".toast").count() == 1, "toast stays while Undo has focus")
    page.locator("#page-title").focus()
    page.clock.fast_forward(9000)
    page.wait_for_timeout(200)
    check(page.locator(".toast").count() == 0, "toast closes 8 seconds after focus leaves")
    page.get_by_role("button", name=re.compile("^Mortgage")).click()
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Start over").click()
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Undo").click()
    page.wait_for_timeout(200)
    check(text(".strip h2").startswith("Your costs vs. "), "Undo restores answers")

    # Quick starts: plain buttons; a tap fills everything in, folds the questions and offers Undo.
    quick = page.locator(".quick .btn")
    check(quick.count() == 4 and all(b.get_attribute("aria-pressed") is None for b in quick.all()),
          "four quick starts, never toggles")
    quick_start(page, "Commuter")
    check(page.locator(".summary").count() == 1 and page.locator("#questions").count() == 0, "a quick start folds the questions")
    check(text(".summary p").startswith("Rent, gas car, electric heat, health insurance through work."), "Commuter summary")
    check(text(".basis") == "Based on your answers.", "a quick start counts as answered")
    check(text(".toast").startswith("Filled in as Commuter."), "quick start Undo toast")
    check(page.evaluate("document.activeElement.id") == "answer", "focus moves to the answer")
    check(page.locator("#amount-gasoline").input_value() == "380", "Commuter gas amount")
    set_cards(page, False)
    end = page.evaluate(AMOUNTS_END_JS)
    check(end <= 2000, f"390: Commuter amounts end within 2,000px with every card folded ({end:.0f})")
    page.get_by_role("button", name="Undo").click()
    page.wait_for_timeout(200)
    check(page.locator(".summary").count() == 0 and page.locator("#questions").count() == 1, "Undo unfolds the questions it folded")
    check(page.locator(".amt", has_text="Mortgage payment").count() == 1, "Undo restores the answers from before the tap")

    # Folded questions stay folded across tab switches.
    quick_start(page, "Retiree")
    page.get_by_role("link", name="Sources", exact=True).click()
    page.wait_for_timeout(300)
    page.get_by_role("link", name="Your costs", exact=True).click()
    page.wait_for_timeout(300)
    check(page.locator(".summary").count() == 1, "folded questions stay folded after switching tabs")

    # Section links: hash, aria-current, title, focus on the new heading, Back.
    for rid, hash_, label in ROUTES[1:]:
        page.get_by_role("link", name=label, exact=True).click()
        page.wait_for_timeout(400)
        check(page.url.endswith(hash_), f"{label}: link sets the hash")
        check(page.locator("[aria-current=page]").inner_text() == label, f"{label}: aria-current")
        check(page.title() == f"{label} | Inflation Reality", f"{label}: document title")
        check(page.evaluate("document.activeElement.id") == "page-title", f"{label}: focus moves to the heading")
        check(text("h1") == label, f"{label}: heading")
    page.go_back()
    page.wait_for_timeout(400)
    check(page.locator("[aria-current=page]").inner_text() == "Price check", "Back returns to the previous tab")
    page.goto(base + "#unknown")
    page.wait_for_timeout(400)
    check(page.locator("[aria-current=page]").inner_text() == "Your costs", "unknown hash renders Your costs")

    # Tab contents.
    go(page, base, "#national-numbers")
    check(page.locator(".stat").count() == 2, "National: headline and core")
    check(page.locator(".trend-chart svg").count() >= 1, "National: trend chart drawn")
    check(page.locator(".trend-chart[aria-hidden]").count() == 0, "National: the chart is not aria-hidden")
    check(page.locator(".measures .mrow").count() >= 3, "National: other measures listed")
    check(page.locator(".mrow .mrow-blurb").count() == page.locator(".mrow").count(), "390: each measure's blurb shows under its row")
    check(not focus_opens(page, page.locator(".mrow").first), "390: focus on a measure row opens no card")
    chip = page.locator(".chip").first
    chip.click()
    page.wait_for_timeout(100)
    check(chip.get_attribute("aria-pressed") == "true" and page.locator(".measures.focusing").count() == 1,
          "National: a publisher chip highlights its rows")
    chip.click()
    page.wait_for_timeout(100)
    check(chip.get_attribute("aria-pressed") == "false" and page.locator(".measures.focusing").count() == 0,
          "National: the chip toggles off")
    ticks = page.locator(".trend-chart .recharts-yAxis .recharts-cartesian-axis-tick-value").all_text_contents()
    nums = [float(t.replace("%", "").replace(MINUS, "-")) for t in ticks]
    steps = {round(b - a, 4) for a, b in zip(nums, nums[1:])}
    check(len(nums) >= 3 and len(steps) == 1 and 0 in nums, f"National: evenly spaced y-axis ticks {ticks}")
    if not args.live_data:
        check("Using the last known value for Median CPI." in page.locator("main").inner_text(), "National: stale note")
    go(page, base, "#price-check")
    check(page.locator(".data-table tbody tr th[scope=row]").count() == 21, "Price check: 21 average prices")
    check(page.locator(".bar-list .bar-row").count() == 10 and page.locator(".bar-list .bar-row .dot").count() == 10,
          "Price check: 10 biggest changes, each with a family dot")
    check(page.locator(".fuel").count() == 2, "Price check: gas and diesel")
    gaps = page.evaluate(FUEL_GAPS_JS)
    check(any(g is not None for g in gaps) and all(g is None or g >= 4 for g in gaps), f"Price check: fuel notes are separate paragraphs {gaps}")
    go(page, base, "#sources")
    yard = page.locator("table[aria-labelledby='series-yardstick']").inner_text()
    lines = page.locator("table[aria-labelledby='series-household']").inner_text()
    check("CUUR0000SA0L2" in yard and "CUUR0000SA0L2" not in lines, "Sources: the yardstick is a source series, not a line")
    bls = page.locator("a", has_text="CUUR0000SETE").first.get_attribute("href")
    check(bls == "https://data.bls.gov/timeseries/CUUR0000SETE", "Sources: BLS series link to BLS")
    check(page.locator("table[aria-labelledby='series-household'] .dot").count() == 17, "Sources: a family dot on each household series")

    # Download: five sheets, and the estimate sheet is the saved (Retiree) household.
    with page.expect_download() as dl:
        page.get_by_role("button", name="Download the spreadsheet (.xlsx)").click()
    download = dl.value
    check(re.fullmatch(r"inflation-reality-(\d{4}-\d{2}|data)\.xlsx", download.suggested_filename) is not None,
          f"download name {download.suggested_filename}")
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "book.xlsx"
        download.save_as(path)
        with zipfile.ZipFile(path) as z:
            names = re.findall(r'<sheet name="([^"]+)"', z.read("xl/workbook.xml").decode())
            check(names == SHEETS, f"spreadsheet sheets {names}")
            sheet1 = z.read("xl/worksheets/sheet1.xml").decode()
            check("Home repairs" in sheet1 and "Your costs vs." in sheet1, "spreadsheet has the saved estimate")
    page.wait_for_timeout(200)
    check(page.locator(".status").inner_text() == "Spreadsheet downloaded.", "download status")

    check(errors == [], f"no console errors in the phone flows {errors}")
    context.close()


def desktop_flows(browser, args, base, seen):
    """Hover cards, keyboard focus and page height at 1280px, light, reduced motion."""
    context, page, errors = new_page(browser, args, 1280, "light")
    go(page, base)
    check(page.locator(".strip .mix").count() == 1 and page.locator(".strip-more").count() == 0,
          "1280: the mix bar sits inside the strip")
    check(page.locator(".fam-head[tabindex='0']").count() == page.locator(".fam").count() > 0,
          "1280: card headings are focusable labels, not fold buttons")
    check(focus_opens(page, page.locator(".amt.avg").first), "1280: keyboard focus on an Average row opens its card")
    page.locator("#page-title").focus()
    quick_start(page, "Commuter")
    seen["commuter"] = page.locator(".answer").text_content()
    end = page.evaluate(AMOUNTS_END_JS)
    check(end <= 1500, f"1280: Commuter amounts end within 1,500px ({end:.0f})")
    card_sums_ok(page, "Commuter, 1280")

    # Hovering a row shows a card with its dollar figures, and the highlights link up.
    row = page.locator(".amt", has_text="Gas for the car")
    hover(page, row)
    body = card_text(page)
    adds = row.locator(".amt-adds").text_content().removesuffix(" a year")
    check("You pay now" in body and "$380 a month, $4,560 a year" in body and "Adds this year" in body and adds in body,
          f"hovering a row shows its dollar figures ({body!r})")
    described = page.locator("#amount-gasoline").get_attribute("aria-describedby") or ""
    check("hover-card" in described.split() and "hint-gasoline" in described.split() and row.get_attribute("aria-describedby") is None,
          f"the row's dollar box points at its card and its hint, the row itself at nothing ({described!r})")
    check(page.locator(".fam.hl[data-family='around']").count() == 1, "the row's card is highlighted")
    check(page.locator(".mix.dim .slice.hl[data-family='around']").count() == 1, "its mix slice stands out")
    check(page.locator(".mix-legend .lg.hl[data-family='around']").count() == 1, "its legend item stands out")
    page.mouse.move(2, 2)
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 0, "the card closes when the pointer leaves")
    hover(page, page.locator(".lg", has_text="Food"))
    check(page.locator(".fam.hl[data-family='food']").count() == 1 and "Share of your spending" in card_text(page),
          "pointing at a legend item shows its card and highlights its family card")
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    check(page.locator("#hover-card").count() == 0, "Escape closes the card")
    page.mouse.move(2, 2)
    page.locator(".fam-head[tabindex='0']").first.focus()
    page.wait_for_timeout(150)
    check("Share of your spending" in card_text(page), "keyboard focus on a card heading opens its card")
    page.locator("#amount-gasoline").focus()
    page.wait_for_timeout(150)
    page.evaluate(SET_SLIDER_JS, ["#slider-gasoline", 480])
    page.wait_for_timeout(150)
    check("$480 a month" in card_text(page), "an open row card updates while its slider moves")
    for sel in (".lg", ".compare .bar-track", "#amount-gasoline"):
        check(focus_opens(page, page.locator(sel).first), f"1280: keyboard focus on {sel} opens its card")
    page.locator("#page-title").focus()
    hover(page, page.locator(".compare .bar-track").first)
    check("weighted by what you spend" in card_text(page), "the Your costs bar has a card")

    # National numbers: the crosshair's keyboard steps, measure and big-number cards.
    go(page, base, "#national-numbers")
    seen["stats"] = page.locator(".stat-value").all_text_contents()
    months = page.locator(".trend-chart + table tbody th").all_text_contents()
    chart = page.locator(".trend-chart [tabindex='0']").first
    chart.scroll_into_view_if_needed()
    chart.focus()
    page.wait_for_timeout(200)
    tip = page.locator(".chart-card .hc-title")
    shown = lambda: tip.text_content() if tip.count() else None
    check(shown() == months[-1], f"trend: focus shows the latest month ({shown()})")
    page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(150)
    check(shown() == months[-2], f"trend: ArrowLeft steps back a month ({shown()})")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(150)
    check(shown() == months[-1], "trend: ArrowRight steps forward again")
    page.locator("#page-title").focus()
    hover(page, page.locator(".mrow[data-publisher='commerce']").first)
    body = card_text(page)
    check("Published by" in body and "prices overall" in body, f"a measure row's card compares it with prices overall ({body!r})")
    hover(page, page.locator(".stat.overall"))
    check("This is the number in the news." in card_text(page), "the big number's card says how it is measured")
    page.mouse.move(2, 2)
    check(page.locator(".mrow-blurb").count() == 0, "1280: measure blurbs live in the cards")
    for sel in (".mrow", ".stat"):
        check(focus_opens(page, page.locator(sel).first), f"1280: keyboard focus on {sel} opens its card")
    go(page, base, "#price-check")
    check(focus_opens(page, page.locator(".bar-list .bar-row").first), "1280: keyboard focus on a price change row opens its card")
    page.locator("#page-title").focus()
    hover(page, page.locator(".bar-list .bar-row").first)
    body = card_text(page)
    check("Price now" in body and "A year ago" in body, f"a price change row's card shows both prices ({body!r})")

    # Reduced motion: bars are at full width on first paint.
    page.goto(base + "#national-numbers")
    page.wait_for_selector("#page-title")
    check(page.evaluate(FULL_BARS_JS, ".bar, .pace-bar"), "reduced motion: bars are at full width on first paint")

    check(errors == [], f"no console errors in the desktop flows {errors}")
    context.close()


def touch_flows(browser, args, base):
    """Touch: rows, sliders and fold buttons open no card; a legend tap pins one; a tap elsewhere closes it."""
    context, page, errors = new_page(browser, args, 390, "light", touch=True)
    go(page, base)
    page.get_by_role("button", name="Commuter", exact=True).tap()
    page.wait_for_timeout(200)
    head = page.locator(".fam[data-family='around'] button.fam-head")
    head.tap()
    page.wait_for_timeout(100)
    check(head.get_attribute("aria-expanded") == "true" and page.locator("#hover-card").count() == 0,
          "touch: a fold button opens its card and no hover card")
    page.locator(".amt", has_text="Gas for the car").locator(".amt-label").tap()
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 0, "touch: tapping a row opens no card")
    page.locator("#slider-gasoline").tap()
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 0, "touch: tapping a slider opens no card")
    page.locator(".lg").first.tap()
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 1, "touch: tapping a legend item shows its card")
    page.locator("#page-title").tap()
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 0, "touch: a tap elsewhere closes the card")
    head.tap()
    page.wait_for_timeout(100)
    check(head.get_attribute("aria-expanded") == "false" and page.locator("#hover-card").count() == 0,
          "touch: the fold button folds the card and opens no hover card")
    check(errors == [], f"touch at 390: no console errors {errors}")
    context.close()
    # A touch tablet is wide enough for focus cards, but a tapped dollar box must not open one.
    context, page, errors = new_page(browser, args, 820, "light", touch=True)
    go(page, base)
    page.get_by_role("button", name="Commuter", exact=True).tap()
    page.wait_for_timeout(200)
    page.locator("#amount-gasoline").tap()
    page.wait_for_timeout(150)
    check(page.evaluate("document.activeElement.id") == "amount-gasoline" and page.locator("#hover-card").count() == 0,
          "tablet touch: tapping a dollar box focuses it and opens no card")
    check(errors == [], f"touch at 820: no console errors {errors}")
    context.close()


def motion_pass(browser, args, base, seen):
    """One pass with motion on: count-ups and bars settle to the same numbers as with reduced motion."""
    context, page, errors = new_page(browser, args, 1280, "light", reduced=False)
    go(page, base, "#national-numbers")
    page.clock.run_for(2000)       # count-ups and the line draw-in run on requestAnimationFrame (fake clock)
    page.wait_for_timeout(1000)    # CSS bar animations run on the real clock
    check(page.locator(".stat-value").all_text_contents() == seen["stats"], "motion on: big numbers settle to the same values")
    check(page.evaluate(FULL_BARS_JS, ".bar, .pace-bar"), "motion on: bars settle at full width")
    go(page, base)
    quick_start(page, "Commuter")
    page.clock.run_for(1000)
    page.wait_for_timeout(100)
    check(page.locator(".answer").text_content() == seen["commuter"], "motion on: the answer settles to the same number")
    check(errors == [], f"motion on: no console errors {errors}")
    context.close()


def matrix(browser, args, base):
    for width in (390, 1280):
        for theme in ("light", "dark"):
            context, page, errors = new_page(browser, args, width, theme)
            for rid, hash_, label in ROUTES:
                go(page, base, hash_)
                if theme == "dark":
                    ground = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ground').trim().toLowerCase()")
                    check(ground == "#161a1e", f"{label}, {width} dark: dark tokens apply")
                rules(page, f"{label}, {width} {theme}", theme == "dark", rid == "your-costs")
            go(page, base)
            check(page.evaluate("getComputedStyle(document.querySelector('.strip')).position") == "sticky",
                  f"{width} {theme}: the result strip is sticky")
            page.evaluate("window.scrollTo(0, 1500)")
            page.wait_for_timeout(100)
            top = page.evaluate("document.querySelector('.strip').getBoundingClientRect().top")
            check(top <= 1, f"{width} {theme}: the strip stays at the top after scrolling ({top:.0f})")
            if width == 1280 and theme == "dark":
                quick_start(page, "Family with kids")
                rules(page, "Your costs, Personal, 1280 dark", True, True)
            check(errors == [], f"{width} {theme}: no console errors {errors}")
            context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:4719/inflation-reality/")
    parser.add_argument("--live-data", action="store_true", help="use the site's real cpi.json (live site only)")
    parser.add_argument("--real-fonts", action="store_true", help="load the real web fonts instead of stubbing them (needs the network)")
    parser.add_argument("--seed", type=int, default=random.randrange(1_000_000), help="random-amounts seed (printed)")
    parser.add_argument("--rounds", type=int, default=6, help="random-amounts rounds")
    args = parser.parse_args()
    base = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
    if args.live_data and re.match(r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)[:/]", base):
        sys.exit("--live-data needs the live site: vite preview has no cpi.json, so it logs a 404 and every console "
                 "error counts. Drop --live-data, or pass --base-url https://derektm17.github.io/inflation-reality/.")
    print(f"auditing {base} with {'live data' if args.live_data else 'the fixture'}")
    seen = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        flows(browser, args, base)
        desktop_flows(browser, args, base, seen)
        touch_flows(browser, args, base)
        motion_pass(browser, args, base, seen)
        matrix(browser, args, base)
        browser.close()
    print(f"\n{len(failures)} failed" if failures else "\naudit passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Check it parses**

Run: `python3 -m py_compile scripts/audit/ui-audit.py && echo compiled`
Expected: `compiled`.

- [ ] **Step 3: Run it against the local build**

Start the preview (see *Preview procedure*), then:

```bash
python3 scripts/audit/ui-audit.py | grep -v "^ok:"
python3 scripts/audit/ui-audit.py --seed 1 | grep -v "^ok:"
```

Expected both times: `auditing http://localhost:4719/inflation-reality/ with the fixture`, the seed, then `audit passed` (223 `ok:` lines; run without the grep to see them). If a check fails, fix the **page**, not the check, unless the check is plainly wrong about the spec; record any change to a check in the commit message. The page-height checks may need spacing tightened in `calculator.css` (never target sizes). Keep the preview running for Step 4.

- [ ] **Step 4: Prove it can fail.** Append `.fam { border: 1px solid var(--rule); }` to `src/styles/calculator.css`, run `npm run build` (the preview serves the new `dist/`), and run the audit again. Expected: `FAIL: Your costs, Average, 390 light: design rules ['rule 5: tinted section.fam has a border', …]` and exit code 1 (`echo $?` prints `1`). Revert with `git checkout src/styles/calculator.css`, rebuild, confirm `audit passed`, then `kill "$(cat /tmp/ir-preview.pid)"`.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit/ui-audit.py
git commit -m "test(audit): revision 4 flows, reduced-motion numbers plus one motion pass, page height, hover and keyboard checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Final verification, 5-second test prep, handoff (controller)

Run by the controller after the last task's review, not by an implementer subagent. Steps 4, 5 and 7 need the owner.

**Files:**
- Modify: `docs/SESSIONS.md` (handoff, via the `session-checkpoint` skill); `docs/CHANGELOG.md` and `docs/BACKLOG.md` only through `ledger`

**Interfaces:**
- Consumes: everything above.
- Produces: a verified branch tip, a 5-second-test kit for the owner, the handoff, ledger entries.

- [ ] **Step 1: Whole-branch review.** Use superpowers:requesting-code-review on `d1b8c63..redesign/phase2b`. Fix findings on the branch, then re-run Step 2.

- [ ] **Step 2: Gates 1 and 2 (unit tests, audit) on the branch tip**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"          # tests 221, pass 221, fail 0 (or more, never fewer)
npx vite build 2>&1 | grep -E "built in|error"           # ✓ built in …
grep -rnE "#[0-9A-Fa-f]{3,8}\b|rgba?\(" src/components src/views src/tabs src/styles --include=*.jsx --include=*.js --include=*.css | grep -v tokens.css || echo "no literal colors"
diff <(sed -n '/prefers-color-scheme: dark/,/^}/p' src/styles/tokens.css | grep -- '--' | sed 's/^ *//') <(sed -n '/data-theme="dark"\] {/,/^}/p' src/styles/tokens.css | grep -- '--' | sed 's/^ *//') && echo "dark blocks identical"
```

Then start the preview and run `python3 scripts/audit/ui-audit.py | tail -3` and `python3 scripts/audit/ui-audit.py --seed 1 | tail -3`. Expected: `no literal colors`, `dark blocks identical`, and `audit passed` twice. Stop the preview by PID. Paste the summary lines into the handoff.

- [ ] **Step 3: Spec walk-through.** With the spec's *Revision 4* section open, check each bullet against the running preview at 390px and 1280px in both themes, using Python Playwright screenshots (never the Playwright MCP browser):

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in ((390, 844), (1280, 900)):
        for theme in ("light", "dark"):
            pg = b.new_page(viewport={"width": w, "height": h}, color_scheme=theme, reduced_motion="reduce")
            pg.goto("http://localhost:4719/inflation-reality/"); pg.wait_for_selector("#page-title"); pg.wait_for_timeout(300)
            pg.screenshot(path=f"/tmp/ir-rev4-{w}-{theme}-average.png", full_page=True)
            pg.get_by_role("button", name="Commuter", exact=True).click(); pg.wait_for_timeout(300)
            pg.screenshot(path=f"/tmp/ir-rev4-{w}-{theme}-commuter.png", full_page=True)
            for tab in ("national-numbers", "price-check", "sources"):
                pg.goto(f"http://localhost:4719/inflation-reality/#{tab}"); pg.wait_for_selector("#page-title"); pg.wait_for_timeout(300)
                pg.screenshot(path=f"/tmp/ir-rev4-{w}-{theme}-{tab}.png", full_page=True)
            pg.close()
    b.close()
EOF
ls /tmp/ir-rev4-*.png | wc -l    # 20
```

Compare them with the Bolder treatment in the three mockups. Note any difference that is not a spec-wins case in the handoff, as a question for the owner.

- [ ] **Step 4a: Page height with the real fonts (a condition for the 5-second test).** The other audit runs stub Google Fonts, so they measure Arial. With the preview running and network access:

```bash
python3 scripts/audit/ui-audit.py --real-fonts | grep -E "Commuter amounts end|FAIL|audit passed|failed"
```

Expected: `ok:   1280: Commuter amounts end within 1,500px (…)`, `ok:   390: Commuter amounts end within 2,000px with every card folded (…)`, and `audit passed`. If a height fails, tighten spacing in `calculator.css` (never target sizes), rerun Step 2, and do not start the 5-second test until both pass. If Google Fonts can't be reached, the font requests log console errors and the run fails: say so in the handoff and run it where the network is available.

- [ ] **Step 4: Gate 3, the 5-second test (owner, manual).** Design rule 9: "5 non-designers, first screen on a phone, 'What does this page do?' and 'Is that number yours?' At least 4 of 5 answer both correctly." Give the owner the first-screen image `/tmp/ir-rev4-390-light-average.png` (crop to the top 844px if needed) and, for people on the same network, the preview served to the LAN:

```bash
setsid node node_modules/vite/bin/vite.js preview --port 4719 --strictPort --host 0.0.0.0 < /dev/null > /tmp/ir-preview.log 2>&1 &
echo $! > /tmp/ir-preview.pid; disown
```

(On WSL the phone may not reach it without a Windows port forward; the screenshot is the fallback.) Record the result (how many of 5 got both right, and what the misses said) in the handoff. **Do not merge without it.** If it fails, stop and bring the answers to the owner; copy changes go through the spec first.

- [ ] **Step 5: Merge (only on the owner's word).** "Merge and push only on the owner's word." When the owner says so: read `git log redesign/phase2b..main` first, then

```bash
git switch main
git merge --ff-only redesign/phase2b    # or a merge commit if main moved on
npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built in|error"
```

Push only when the owner says so (`git push origin main`); the push deploys the site.

- [ ] **Step 6: Gate 4, production data live (after the deploy run is green).**

```bash
gh run list --limit 3
python3 scripts/audit/ui-audit.py --base-url https://derektm17.github.io/inflation-reality/ --live-data | grep -v "^ok:"
python3 scripts/audit/ui-audit.py --base-url https://derektm17.github.io/inflation-reality/ | grep -v "^ok:"
```

Expected: `audit passed` twice.

- [ ] **Step 7: Capture state.** Run `ledger rules` and follow them. Then:

```bash
ledger ship inflation-reality "The calculator got its bolder look: colors for each kind of spending, four starting households, cards that fold on phones, and details when you point at a number" --why "The owner's 5-second test found the last version too gray, and people scrolled too far to reach their own numbers."
ledger idea inflation-reality "Refresh the audit's fixture whenever fallback.json is refreshed" --note "scripts/audit/fixture-cpi.json drives every audit number; a stale fixture hides layout problems with new data."
```

If `ledger` refuses the text, fix the wording and run it again (the command is on PATH; else `/home/dynomatic/projects/ledger/.venv/bin/ledger`). There is no separate revision 4 backlog item (checked 2026-10-17). Once the 5-second test passes, close it with `ledger done inflation-reality "owner's 5-second test"`; once the branch is merged, close `ledger done inflation-reality "Phase 2b: rebuild National numbers"`. Add one `ledger idea` per open question below that the owner leaves unsettled. Finally run the `session-checkpoint` skill to write the `#### Handoff` in `docs/SESSIONS.md` with: the commits, the test count, both audit summaries, the 5-second test result, and the merge or deploy status.

---

## Open questions for the owner

Judgment calls this plan made where the spec is silent or loose (the *Decisions* list above, numbered the same):

1. **Settled (spec note).** **Average-state hover labels** say "Share of spending" and "Average spending now" instead of "your", so nobody reads the average household's numbers as their own. OK?
2. **Settled (spec note).** **Phone strip:** under 900px only the title, answer and bars stick; the rates line, verdict, mix bar and **Answer the questions** scroll away just under it. OK, or should the button stick too?
3. **Folded phone card with an empty renewal box** shows the family's total and, under it, "Add your renewal increase". The spec says the prompt shows "on its heading"; is "in addition to the total" right?
4. **Undo after a quick start** also unfolds the questions if they were open before. OK?
5. **"Updated with July 2026 prices."** shows only to returning visitors, not after a quick start. OK?
6. **Settled (spec note).** **Big numbers** stay in the text color; their card's color is on the top rule, tint, sparkline and pace bars (the spec says "Prices overall in `--accent`", but publisher colors are for marks only). OK?
7. **Settled (spec note).** **Measure blurbs** show under each row below 600px and in the row's hover card at 600px and wider.
8. **Sources dots** go on household, average-household and Price check series only. Should National numbers rows get publisher dots?
9. **Compare bars and Average rows are tab stops** so their cards open from the keyboard. More tab stops; OK?
10. **The trend chart's latest-month focus** uses a Recharts instance method (`accessibilityManager.setIndex`), which a Recharts 3 upgrade could break. OK to rely on it while Recharts stays on 2.x?
11. **Settled.** **`--live-data`** only runs against the live site; the audit stops with a message if it is pointed at localhost.
12. **Price check families:** fuels are Getting around, electricity and natural gas are Utilities, foods are Food. OK?
13. **Legend items are 44px-tall buttons**, which makes the legend two or three rows on a phone. OK, or allow 24px (WCAG 2.2's minimum) for these?
