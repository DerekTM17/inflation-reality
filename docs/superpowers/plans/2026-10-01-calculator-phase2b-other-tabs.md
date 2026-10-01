# Calculator Phase 2b (National numbers, Price check, Sources) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old dashboard views that still serve National numbers, Price check and Sources with new tabs in the calculator's visual system. Move the .xlsx export to Sources, commit the UI audit as `scripts/audit/ui-audit.py`, add link previews and an og image, and delete `src/views/LegacyDashboard.jsx`. All work happens on branch `redesign/phase2b`.

**Architecture:** This plan follows Phase 2a's pattern. The words, numbers and rows for each tab live in pure modules under a new `src/tabs/` folder (`notes.js`, `national.js`, `prices.js`, `sources.js`, `estimate.js`, `workbook.js`), unit-tested with `node --test`. Views under `src/views/` and two small components (`BarList`, `TrendChart`) only lay out what those modules return. The spreadsheet is built as plain arrays (`buildWorkbook`). The panel's lines come from the same `panelModel` Your costs uses, fed by the answers saved in this browser. `xlsx` is still loaded on demand. The audit is a Python Playwright script that runs against `vite preview` or the live site.

**Tech Stack:** Vite 5, React 18, Recharts 2 (trend line only), xlsx 0.18 (already a dependency), plain CSS with the existing tokens, Node's built-in test runner, Python Playwright 1.59 for the audit and the og image. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md`. Sections: Decisions (Tabs), Visual system, Design rules, Voice guide, Numbers, Other tabs (incl. Chart rules), Calculation model (owners' yardstick, resolved 2026-10-01), Front-end architecture (Link previews, .xlsx), Accessibility, Testing (Phase 2 audit), Rollout (Phase 2b). Phase 2a plan for conventions: `docs/superpowers/plans/2026-09-16-calculator-phase2a-your-costs.md`.

**Validated:** every code block below was run on 2026-10-01 in a scratch copy of `main` at `c2c57cc`, applied in task order. Results: `npm test` 180/180 (139 existing + 41 new); `npx vite build` succeeded; `scripts/audit/ui-audit.py` passed all 127 checks against `vite preview`, both with the fixture and with `--live-data`. The audit was also checked to **fail** on injected faults: uppercase labels, a second raised surface, and flipped line signs. Line numbers quoted below are from `c2c57cc`.

## Global Constraints

- **Branch:** create `redesign/phase2b` from `main` and do all work there. Never commit to `main`. **Never push** unless the owner says so in this session (a push to `main` deploys the live site).
- **Commits** end with the attribution lines that the executing session's system reminder gives.
- **No new npm dependencies.** Tests use `node --test`. Test files are `*.test.mjs` next to the code. No React component tests (that would need jsdom); views are covered by the audit (Task 12).
- **Components never use literal colors.** Colors exist only in `src/styles/tokens.css`. `src/styles/tokens.test.mjs` enforces this for `styles/`, `components/`, `tabs/`, every view and `App.jsx` from Task 4 on. Recharts gets colors as `var(--token)` strings.
- **Null, never zero.** A missing rate or price is `null`. It shows as "Not available" or is left out, never as `0.0%`, `NaN` or `Infinity`. Write `x != null && x >= 0`, never a bare comparison on a maybe-null value.
- **Rates display through `formatRate`** (one decimal, `+` or U+2212 `−`). Bars start at zero and extend left for decreases (`barGeometry`).
- **The owners' yardstick** is `CALC_LINES` entry `exShelter` (`CUUR0000SA0L2`, `yardstick: true`). It is a source series and a national measure, **never a household line**, on Sources and in the spreadsheet.
- **Voice guide (all site copy, spreadsheet cells included):** plain American English at about a 9th-grade reading level, second person, sentence case. Banned: `—` (em dash), `·`, `→`, exclamation marks, "Welcome back", "Here's", "Let's", "simply", "repriced", "reimagined". On Your costs only, also banned: unexplained "CPI", "YoY", "relative importance". Other tabs may name measures such as "Median CPI".
- **Design rules:** at most two type families and no monospace (series IDs render in the body font, never `<code>`); no uppercase or positive letter-spacing under 20px; no `·` `—` `→` or emoji; **at most one raised surface per view** (the new tabs have none: sections are separated by a top `--rule`); radius by role (controls 6px, panel 10px); one accent color; no red or green for up or down.
- **Chart rules:** Recharts styled from tokens only. Text is `--ink-2` and gridlines are `--rule`. One series uses `--accent`. Measures use one neutral hue (`--bar-line`) with direct value labels. Tooltips sit on `--surface` with a `--rule` border.
- **Every view's `<h1>` is `id="page-title" tabIndex={-1}`.** App focuses it on route changes.
- **Do not touch** `scripts/*.mjs` (the pipeline), `.github/workflows/`, `src/data/fallback.json`, `src/data/merge.js`, `src/data/payload.js`, `src/calculator/*`. In `src/data/catalog.js`, only the `ALT_MEASURES` and `WEEKLY_PRICES` blocks change (Task 2). In `public/`, commit only `og-image.png`. Never commit a `public/cpi.json`.
- **Python Playwright, not the Playwright MCP browser** (that browser is shared with other sessions). Use `from playwright.sync_api import sync_playwright`.
- **`vite preview` has no `public/cpi.json`**, so it logs a cpi.json 404 and the app uses `src/data/fallback.json`. That is expected. The audit answers cpi.json with its fixture unless `--live-data` is passed.

## Review Focus

These five input classes are implied by the spec, and most likely to bite a real visitor. Each is pinned by a test in the task named:

1. **Missing or unusable numbers.** A measure, price or year-ago price is null, a year-ago price is 0, or the basket is stale. The page says "Not available" or leaves the item out. It never shows `0.0%`, `NaN` or `Infinity`. Pinned in Task 3 (`cards: a missing number…`, `measures: none available…`), Task 5 (`pctChange…`, `avgPriceGroups…`, `fuelRows…`), Task 8 (`a stale basket…`, `every sheet… no NaN`), and the audit's broken-value check (Task 12).
2. **Falling prices and negative measures.** They get a `−` sign, a bar extending left of zero, and in Biggest price changes they are ranked by size either way. Pinned in Task 3 (`measures: … negatives extend left`) and Task 5 (`movers: …`).
3. **The owners' yardstick leaking in as a household line** on Sources or in the spreadsheet. Pinned in Task 7 (`the yardstick is a source series…`), Task 8 (`estimate sheet: the yardstick is never a line…`, the round-trip test), and the audit's Sources check.
4. **Downloading with nothing usable saved.** This covers no storage, blocked storage, corrupt or old-version JSON, and all amounts set to 0. The file falls back to the average household or the zero-total message and never throws. Pinned in Task 8 (`blocked, missing or corrupt storage…`, `all amounts 0…`).
5. **Odd amounts and themes.** With amounts of $0 or $1 to $15, the rounded panel lines still add up to the total and never show the opposite sign of their rate. The new tabs stay correct in dark mode at 390px. Pinned in Task 12: the random-amounts probe (seeded, includes 0 and tiny values) and the 390/1280 × light/dark rules matrix.

## Decisions this plan makes (not in the spec)

Each one is repeated under *Open questions for the owner* at the end.

1. **Other official measures** lists "CPI for all items", "Core CPI" and "CPI without housing" (the owners' yardstick), plus the five `ALT_MEASURES`, highest first.
2. **Measures and Biggest price changes are HTML bar lists** (`BarList`, using `barGeometry` like the result panel), not Recharts bar charts. They read as text, have direct labels, work at 390px, and remove the old color-index bug by construction. Recharts draws only the 12-month trend line, with a visually hidden table of the same numbers.
3. **Biggest price changes ranks by size of change, up or down** (top 10). The old view showed increases only, even when eggs fell 37%.
4. **The country comparison's "reserved spot"** is a code comment in `NationalNumbers.jsx`. Nothing visible ships.
5. **The spreadsheet** has five sheets: Your estimate, Price changes, Average prices, Monthly trend, How it works. Your estimate shows the saved answers if there are any, otherwise the average household. It writes the panel's lines plus the math behind them. The old slider sheet and the `CATEGORIES` sheet are dropped. The file name is `inflation-reality-YYYY-MM.xlsx`.
6. **Tab titles:** Your costs is "Inflation Reality" (matches the link preview). The others are "National numbers | Inflation Reality" and so on.
7. **BLS series link to `https://data.bls.gov/timeseries/<id>`**, and FRED series to `https://fred.stlouisfed.org/series/<id>`.
8. **`CATEGORIES` stays** in `catalog.js`, the pipeline, `merge.js` and the payload shape check. After Task 10 no view reads it. Retiring it touches the pipeline and `isPlausiblePayload`, so it is a follow-up (BACKLOG via `ledger idea`), not this plan.
9. **Catalog wording:** `ALT_MEASURES` and `WEEKLY_PRICES` blurbs are rewritten to the voice guide, and their labels go to sentence case ("Trimmed-mean CPI", "Gasoline, regular"). `AVG_PRICE_ITEMS` names ("Eggs, Grade A Large") are left as they are.
10. **The og image** is rendered from a committed HTML file by a committed Python script (`scripts/og/`). The resulting `public/og-image.png` is committed.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/routes.js`, `src/routes.test.mjs` (modify) | `titleFor(id)` | 1 |
| `src/App.jsx` (modify) | document.title + focus on route change; wire each new view; drop the legacy view | 1, 4, 6, 9, 10 |
| `src/views/YourCostsIntro.jsx`, `src/components/ResultPanel.jsx`, `src/styles/controls.css` (modify) | `#page-title` heading; "Show all" `aria-controls`; no focus ring on headings | 1 |
| `src/data/catalog.js`, `src/data/catalog.test.mjs` (modify) | measure and fuel blurbs/labels in the voice guide | 2 |
| `src/tabs/notes.js` (+ test) | stale and gap notes in plain words | 2 |
| `src/tabs/testdata.mjs` | payload-shaped test data run through `buildViewData` | 2 |
| `src/tabs/national.js` (+ test) | National numbers model | 3 |
| `src/components/BarList.jsx`, `src/components/TrendChart.jsx` | bar rows; the trend line + hidden table | 4 |
| `src/views/NationalNumbers.jsx`, `src/styles/tabs.css`, `src/main.jsx` | the tab; shared tab CSS | 4 |
| `src/styles/tokens.test.mjs` (modify) | literal-color scan covers `tabs/` and every view | 4, 10 |
| `src/tabs/prices.js` (+ test) | Price check model | 5 |
| `src/views/PriceCheck.jsx` | the tab | 6 |
| `src/tabs/sources.js` (+ test) | series list, method, caveats, links | 7 |
| `src/tabs/estimate.js`, `src/tabs/workbook.js`, `src/tabs/download.js` (+ tests) | saved estimate; spreadsheet as data; save the file | 8 |
| `src/views/Sources.jsx` | the tab and the download button | 9 |
| `src/views/LegacyDashboard.jsx` (delete), `src/shell.test.mjs` | old dashboard gone; every route has a focusable heading | 10 |
| `index.html`, `scripts/og/*`, `public/og-image.png` | link previews | 11 |
| `scripts/audit/ui-audit.py`, `scripts/audit/fixture-cpi.json`, `package.json` | the committed audit | 12 |

**Task order matters.** `tokens.test.mjs` scans views starting in Task 4, so it carries a `LegacyDashboard.jsx` exception until Task 10 deletes that file and removes the exception. `src/shell.test.mjs` scans `App.jsx` for "LegacyDashboard", so it is created in Task 10, not earlier. The audit (Task 12) checks design rules on every tab, so it comes after the legacy views are gone.

---

### Task 1: Branch, tab titles, focus on route change, "Show all" `aria-controls`

**Files:**
- Modify: `src/routes.js`, `src/routes.test.mjs`, `src/App.jsx`, `src/views/YourCostsIntro.jsx`, `src/components/ResultPanel.jsx`, `src/styles/controls.css`

**Interfaces:**
- Produces: `titleFor(id: string): string` in `src/routes.js`. Every later view renders `<h1 id="page-title" tabIndex={-1}>`, and App focuses `#page-title` after a route change.

- [ ] **Step 1: Create the branch and confirm the baseline**

```bash
cd ~/projects/inflation-reality
git status -sb          # clean; main may be ahead of origin (unpushed commits are fine)
git switch -c redesign/phase2b
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"   # tests 139, pass 139
```

- [ ] **Step 2: Write the failing test**. In `src/routes.test.mjs`, change the import line to:

```js
import { ROUTES, routeFromHash, hrefFor, isPlainClick, titleFor } from "./routes.js";
```

and append:

```js
test("titleFor: the site name alone on Your costs, the tab name first elsewhere", () => {
  assert.equal(titleFor("your-costs"), "Inflation Reality");
  assert.equal(titleFor("national-numbers"), "National numbers | Inflation Reality");
  assert.equal(titleFor("price-check"), "Price check | Inflation Reality");
  assert.equal(titleFor("sources"), "Sources | Inflation Reality");
  assert.equal(titleFor("nope"), "Inflation Reality");
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test src/routes.test.mjs`
Expected: FAIL, `titleFor` is not exported (`SyntaxError: ... does not provide an export named 'titleFor'`).

- [ ] **Step 4: Implement `titleFor`**. In `src/routes.js`, insert this above `/** A plain left click`:

```js
/**
 * document.title for a route. Your costs keeps the bare site name, matching the
 * link preview; the other tabs put their own name first so browser tabs differ.
 */
export function titleFor(id) {
  const r = ROUTES.find((x) => x.id === id);
  return !r || r.id === "your-costs" ? "Inflation Reality" : `${r.label} | Inflation Reality`;
}
```

- [ ] **Step 5: Use it in App, and focus the heading on route changes.** In `src/App.jsx`:

Replace `import { useEffect, useMemo, useState } from "react";` with:

```js
import { useEffect, useMemo, useRef, useState } from "react";
```

Replace `import { routeFromHash, hrefFor } from "./routes.js";` with:

```js
import { routeFromHash, hrefFor, titleFor } from "./routes.js";
```

Insert this directly above the comment `// Section links push a normal history entry.`:

```jsx
  // Every route names its tab in document.title. A route change (not the first
  // render of a page load) also moves focus to the new view's heading (#page-title),
  // so screen reader and keyboard users land at the top of what just appeared.
  // Child effects have committed by now, so the new heading exists. Comparing with
  // the previous route (not a "first render" flag) stays correct under StrictMode,
  // which runs effects twice in development.
  const shownRoute = useRef(route);
  useEffect(() => {
    document.title = titleFor(route);
    if (shownRoute.current === route) return;
    shownRoute.current = route;
    document.getElementById("page-title")?.focus({ preventScroll: true });
  }, [route]);
```

- [ ] **Step 6: Give Your costs' heading the id.** In `src/views/YourCostsIntro.jsx`, replace `<h1>How much more are you paying than a year ago?</h1>` with:

```jsx
      <h1 id="page-title" tabIndex={-1}>How much more are you paying than a year ago?</h1>
```

Append to `src/styles/controls.css`:

```css
/* Headings that take focus on a route change (tabIndex -1) show no ring: they are not controls. */
h1[tabindex="-1"]:focus { outline: none; }
```

- [ ] **Step 7: "Show all" names the list it controls.** In `src/components/ResultPanel.jsx`, replace `<ul className="lines">` with `<ul className="lines" id="result-lines">`. Then replace the one-line toggle opening tag `<button type="button" className="text-btn" aria-expanded={showAll ? "true" : "false"} onClick={onToggleShowAll}>` with:

```jsx
          <button
            type="button"
            className="text-btn"
            aria-expanded={showAll ? "true" : "false"}
            aria-controls="result-lines"
            onClick={onToggleShowAll}
          >
```

- [ ] **Step 8: Run tests and build**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built|error"`
Expected: `pass 140`, `fail 0`, `✓ built`. (The legacy views have no `#page-title` yet. Focus on them is a no-op until Tasks 4, 6 and 9 replace them.)

- [ ] **Step 9: Commit**

```bash
git add src/routes.js src/routes.test.mjs src/App.jsx src/views/YourCostsIntro.jsx src/components/ResultPanel.jsx src/styles/controls.css
git commit -m "feat(shell): tab titles, focus the heading on route change, Show all aria-controls"
```

---

### Task 2: Plain-language catalog copy, shared notes, tab test data

**Files:**
- Modify: `src/data/catalog.js` (only the `ALT_MEASURES` and `WEEKLY_PRICES` blocks), `src/data/catalog.test.mjs`
- Create: `src/tabs/notes.js`, `src/tabs/notes.test.mjs`, `src/tabs/testdata.mjs`

**Interfaces:**
- Produces: `staleNote(labels: string[] | undefined, noun = "value"): string | null` and `gapNote(data): string | null` in `src/tabs/notes.js`. Also `DYNAMIC` (payload object) and `viewData(overrides = {})` (returns the `buildViewData` output) in `src/tabs/testdata.mjs`.
- Test data facts later tasks rely on: reference month `2026-08`; headline yoy 3.4 / mom 0.4 / annualized 4.9; core 2.4 / −0.1 / −1.2; `exShelter` 3.6. Alt measures: corePce 3.3, medianCpi 2.6 (stale), trimmedCpi −0.4, stickyCpi null, trimmedPce missing. Avg prices are set for only 6 of 21 items: eggs fell, beef rose, gasoline rose, electricity is under $1, milk has no year-ago price, butter is stale and unchanged. Weekly prices: gasoline only. The trend has gaps in Oct and Nov 2025.

- [ ] **Step 1: Write the failing voice test**. Append to `src/data/catalog.test.mjs`:

```js
// Voice guide: these blurbs are shown on National numbers and Price check.
test("measure and fuel blurbs and labels follow the voice guide", () => {
  for (const x of [...ALT_MEASURES, ...WEEKLY_PRICES]) {
    for (const text of [x.label, x.blurb]) {
      for (const banned of ["—", "·", "→", "!", "Here's", "Let's", "simply"]) {
        assert.ok(!text.includes(banned), `${x.key}: ${JSON.stringify(banned)} in ${text}`);
      }
    }
    assert.doesNotMatch(x.label, /[\s-][A-Z][a-z]/, `${x.key} label is sentence case`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/data/catalog.test.mjs`
Expected: FAIL on the first `ALT_MEASURES` blurb (it contains `—`). Today's labels "Trimmed-Mean CPI" and "Gasoline, Regular" would also fail the sentence-case check.

- [ ] **Step 3: Rewrite the two blocks**. In `src/data/catalog.js`, replace the whole `export const ALT_MEASURES = [ … ];` block (from line 66) with:

```js
export const ALT_MEASURES = [
  { key: "corePce",    label: "Core PCE",         seriesId: "PCEPILFE",              kind: "index",   color: "#2D6A4F",
    blurb: "The Federal Reserve watches this one most closely. It comes from the Commerce Department, leaves out food and energy, and usually runs a little lower than CPI." },
  { key: "medianCpi",  label: "Median CPI",       seriesId: "MEDCPIM159SFRBCLE",     kind: "yoyRate", color: "#6D597A",
    blurb: "Lines up every item's price change and takes the one in the middle, so the biggest moves at either end don't count. From the Cleveland Fed." },
  { key: "trimmedCpi", label: "Trimmed-mean CPI", seriesId: "TRMMEANCPIM159SFRBCLE", kind: "yoyRate", color: "#52796F",
    blurb: "Drops the items with the biggest price moves at both ends and averages the rest. From the Cleveland Fed." },
  { key: "stickyCpi",  label: "Sticky-price CPI", seriesId: "CORESTICKM159SFRBATL",  kind: "yoyRate", color: "#E76F51",
    blurb: "Counts only prices that change slowly, like rent and insurance. These tend to show where prices are heading over the long run. From the Atlanta Fed." },
  { key: "trimmedPce", label: "Trimmed-mean PCE", seriesId: "PCETRIM12M159SFRBDAL",  kind: "yoyRate", color: "#B5838D",
    blurb: "The Dallas Fed drops the biggest price moves at both ends of PCE, the measure the Federal Reserve watches, and averages the rest." },
];
```

and the whole `export const WEEKLY_PRICES = [ … ];` block with:

```js
export const WEEKLY_PRICES = [
  { key: "gasoline", label: "Gasoline, regular", unit: "/gal", seriesId: "GASREGW", blsSeriesId: "APU000074714",
    blurb: "The Energy Information Administration checks prices at gas stations across the country every week and posts them each Monday." },
  { key: "diesel",   label: "Diesel",            unit: "/gal", seriesId: "GASDESW", blsSeriesId: "APU000074717",
    blurb: "Trucks and trains run on diesel, so a change in its price shows up in the cost of most goods a few months later." },
];
```

Keys, series IDs, kinds, units and colors are unchanged. The pipeline reads only those fields.

- [ ] **Step 4: Run it and watch it pass**

Run: `node --test src/data/catalog.test.mjs src/data/merge.test.mjs`
Expected: all pass.

- [ ] **Step 5: Write the notes test and the shared test data**. Create `src/tabs/testdata.mjs`:

```js
// Payload-shaped test data for the tab modules, run through the real buildViewData
// so tests see exactly what the views see. Values are fixed here on purpose so
// tests don't move when fallback.json is refreshed. Deliberate edge cases: a
// falling price, a price under $1, a missing year-ago price, a stale price and a
// stale measure, a missing measure, a negative measure, two gap months in the
// trend, and no diesel data.

import * as catalog from "../data/catalog.js";
import { buildViewData } from "../data/merge.js";

const LINE_RATES = {
  rent: 3.0, upkeep: 2.0, groceries: 2.2, dining: 3.4, gasoline: 27.4, carIns: -5.1,
  carUpkeep: 5.2, transit: -3.7, electric: 3.8, heatGas: 4.4, heatOil: 52.0,
  daycare: 4.0, tuition: 2.8, clothing: 3.6, fun: 2.7, doctor: 0.2,
  exShelter: 3.6,
};

export const DYNAMIC = {
  generatedAt: "2026-09-16T15:33:02.447Z",
  referenceMonth: "2026-08",
  referenceMonthLabel: "August 2026",
  headline: { yoy: 3.4, mom: 0.4, momAnnualized: 4.9 },
  core: { yoy: 2.4, mom: -0.1, momAnnualized: -1.2 },
  categories: {},
  avgPrices: {
    APU0000708111: { current: 2.272, yearAgo: 3.587 },            // eggs: fell 36.7%
    APU0000703112: { current: 6.923, yearAgo: 6.318 },            // ground beef: rose 9.6%
    APU000074714: { current: 4.211, yearAgo: 3.15 },              // gasoline: rose 33.7%
    APU000072610: { current: 0.183, yearAgo: 0.176 },             // electricity: under $1
    APU0000709112: { current: 4.1, yearAgo: null },               // milk: no year-ago price
    APU0000FS1101: { current: 5.0, yearAgo: 5.0, stale: true },   // butter: stale, no change
  },
  altMeasures: {
    corePce: { yoy: 3.3 },
    medianCpi: { yoy: 2.6, stale: true },
    trimmedCpi: { yoy: -0.4 },
    stickyCpi: { yoy: null },
  },
  weeklyPrices: {
    gasoline: { current: 4.319, yearAgo: 3.168, asOf: "2026-09-14", asOfLabel: "Sep 14, 2026" },
  },
  trend: [
    { month: "Sep 25", headline: 3.0 },
    { month: "Oct 25", headline: null, gap: true },
    { month: "Nov 25", headline: null, gap: true },
    { month: "Dec 25", headline: 2.7 },
    { month: "Jan 26", headline: 3.1 },
  ],
  lines: Object.fromEntries(Object.entries(LINE_RATES).map(([id, yoy]) => [id, { yoy }])),
  basket: {
    month: "2026-08",
    weights: {
      housing: 35.322438, groceries: 8.202357, dining: 5.30412, energy: 3.442446,
      gasoline: 3.85317, health: 8.229578, clothing: 2.445064, fun: 5.062939,
    },
    rates: {
      housing: 3.041144, groceries: 2.190663, dining: 3.36677, energy: 5.047394,
      gasoline: 27.404926, health: 1.563348, clothing: 3.608634, fun: 2.681868,
    },
    restWeight: 28.137887,
    residualYoy: 2.014252,
    headlineYoy: 3.396548,
  },
};

/** buildViewData over DYNAMIC, with top-level payload keys replaced by `overrides`. */
export function viewData(overrides = {}) {
  return buildViewData(catalog, { ...DYNAMIC, ...overrides });
}
```

Create `src/tabs/notes.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { staleNote, gapNote } from "./notes.js";
import { viewData } from "./testdata.mjs";

test("staleNote: null when nothing is stale, joined names otherwise", () => {
  assert.equal(staleNote([]), null);
  assert.equal(staleNote(undefined), null);
  assert.equal(staleNote(["Median CPI"]), "Using the last known value for Median CPI.");
  assert.equal(staleNote(["Eggs", "Milk"], "price"), "Using the last known price for Eggs and Milk.");
});

test("gapNote: only when the payload has a yoyGap, in plain words", () => {
  assert.equal(gapNote(viewData()), null);
  const data = viewData({ yoyGap: { latestMonthLabel: "December 2025", missingMonthLabel: "December 2024" } });
  assert.equal(
    gapNote(data),
    "The newest price data is for December 2025, but no figures were published for December 2024, so these numbers use August 2026.",
  );
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `node --test src/tabs/notes.test.mjs`
Expected: FAIL, `Cannot find module '.../src/tabs/notes.js'`.

- [ ] **Step 7: Implement** `src/tabs/notes.js`:

```js
// Notes shared by the National numbers and Price check tabs, in the voice guide's
// wording (the old StaleNote and yoyGap notes used em dashes and "CPI"). Pure.

import { joinAnd, monthLabel } from "../calculator/format.js";

/** "Using the last known value for Median CPI and Core PCE." null when nothing is stale. */
export function staleNote(labels, noun = "value") {
  if (!labels || labels.length === 0) return null;
  return `Using the last known ${noun} for ${joinAnd(labels)}.`;
}

/** Why the numbers are for an older month than the newest release. null when there is no gap. */
export function gapNote(data) {
  if (!data.yoyGap) return null;
  return `The newest price data is for ${data.yoyGap.latestMonthLabel}, but no figures were published for ${data.yoyGap.missingMonthLabel}, so these numbers use ${monthLabel(data.referenceMonth)}.`;
}
```

- [ ] **Step 8: Run all tests**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 143`, `fail 0`.

- [ ] **Step 9: Commit**

```bash
git add src/data/catalog.js src/data/catalog.test.mjs src/tabs/notes.js src/tabs/notes.test.mjs src/tabs/testdata.mjs
git commit -m "feat(tabs): plain-language measure and fuel copy, shared notes and test data"
```

---

### Task 3: National numbers model (`national.js`)

**Files:**
- Create: `src/tabs/national.js`, `src/tabs/national.test.mjs`

**Interfaces:**
- Consumes: `formatRate`, `movePhrase`, `monthLabel`, `barGeometry`, `round1`, `joinAnd` from `src/calculator/format.js`; `staleNote`, `gapNote` (Task 2).
- Produces:
  - `monthName(referenceMonth, offset = 0): string`
  - `trendMonth(label): { short, long }`, e.g. `"Sep 25"` → `{ short: "Sep 2025", long: "September 2025" }`. Task 8 uses it.
  - `measureRows(data): { key, name, note, value, valueText, bar: { left, width }, stale }[]`. This is the **BarList row shape**, which Task 5's `movers` also returns.
  - `nationalModel(data): { lede, headline: Card, core: Card, trend: { short, long, value, valueText }[], trendNote: string | null, measures, notes: string[] }`, where `Card = { title, yearText, yearSentence, monthSentence: string | null, help }`.
  - `CARDS`, `MEASURES` (copy constants).

- [ ] **Step 1: Write the failing test** `src/tabs/national.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { monthName, trendMonth, measureRows, nationalModel } from "./national.js";
import { viewData } from "./testdata.mjs";

test("monthName wraps across the year and handles a missing month", () => {
  assert.equal(monthName("2026-08"), "August");
  assert.equal(monthName("2026-08", -1), "July");
  assert.equal(monthName("2026-01", -1), "December");
  assert.equal(monthName(null), "");
});

test("trendMonth turns 'Sep 25' into words that can't be read as a date", () => {
  assert.deepEqual(trendMonth("Sep 25"), { short: "Sep 2025", long: "September 2025" });
  assert.deepEqual(trendMonth("Jan 26"), { short: "Jan 2026", long: "January 2026" });
  assert.deepEqual(trendMonth("2026-01"), { short: "2026-01", long: "2026-01" });
});

test("cards: 12-month change, one-month change and its yearly pace, both directions", () => {
  const m = nationalModel(viewData());
  assert.equal(m.lede, "Prices overall rose 3.4% in the year to August 2026. These are the official numbers for the whole country.");
  assert.equal(m.headline.title, "Prices overall");
  assert.equal(m.headline.yearText, "+3.4%");
  assert.equal(m.headline.yearSentence, "Change over the 12 months to August 2026.");
  assert.equal(m.headline.monthSentence, "From July to August, prices rose 0.4%. At that pace for a full year, they would rise 4.9%.");
  assert.equal(m.core.yearText, "+2.4%");
  assert.equal(m.core.monthSentence, "From July to August, prices fell 0.1%. At that pace for a full year, they would fall 1.2%.");
});

test("cards: a missing number says so instead of showing 0", () => {
  const m = nationalModel(viewData({ headline: { yoy: null, mom: null, momAnnualized: null } }));
  assert.equal(m.headline.yearText, "Not available");
  assert.equal(m.headline.yearSentence, "This figure is not available right now.");
  assert.equal(m.headline.monthSentence, null);
  assert.equal(m.lede, "These are the official inflation numbers for the whole country.");
  assert.ok(!m.measures.some((r) => r.key === "headline"));
});

test("cards: no reference month never produces 'From  to ,'", () => {
  const m = nationalModel(viewData({ referenceMonth: "" }));
  assert.equal(m.headline.monthSentence, null);
  assert.equal(m.headline.yearSentence, "Change over the last 12 months.");
});

test("measures: highest first, missing ones left out, negatives extend left of zero", () => {
  const rows = measureRows(viewData());
  assert.deepEqual(rows.map((r) => r.key), ["exShelter", "headline", "corePce", "medianCpi", "core", "trimmedCpi"]);
  assert.equal(rows[0].name, "CPI without housing");
  assert.equal(rows.at(-1).valueText, "−0.4%");
  // span = 3.6 + 0.4, zero sits at 10%: the negative bar ends there, positives start there.
  assert.equal(rows.at(-1).bar.left, 0);
  assert.ok(Math.abs(rows.at(-1).bar.width - 10) < 1e-9);
  assert.ok(Math.abs(rows[0].bar.left - 10) < 1e-9);
  for (const r of rows) assert.ok(r.note && r.note.length > 0, `${r.key} has an explanation`);
});

test("measures: none available gives an empty list, not NaN bars", () => {
  const data = viewData({
    headline: { yoy: null }, core: { yoy: null }, altMeasures: {},
    lines: { exShelter: { yoy: null } },
  });
  assert.deepEqual(measureRows(data), []);
});

test("trend: readable months, gaps named once in a note", () => {
  const m = nationalModel(viewData());
  assert.equal(m.trend.length, 5);
  assert.deepEqual(m.trend[0], { short: "Sep 2025", long: "September 2025", value: 3.0, valueText: "+3.0%" });
  assert.equal(m.trend[1].value, null);
  assert.equal(m.trend[1].valueText, "Not published");
  assert.equal(m.trendNote, "No figures were published for October 2025 and November 2025, so the line breaks there.");
  assert.equal(nationalModel(viewData({ trend: [{ month: "Sep 25", headline: 3 }] })).trendNote, null);
});

test("notes: stale measures by name, plus the yoyGap note", () => {
  assert.deepEqual(nationalModel(viewData()).notes, ["Using the last known value for Median CPI."]);
  const m = nationalModel(viewData({
    headline: { yoy: 3.4, mom: 0.4, momAnnualized: 4.9, stale: true },
    yoyGap: { latestMonthLabel: "September 2026", missingMonthLabel: "September 2025" },
  }));
  assert.equal(m.notes[0], "Using the last known value for CPI for all items and Median CPI.");
  assert.match(m.notes[1], /^The newest price data is for September 2026/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/tabs/national.test.mjs`
Expected: FAIL, `Cannot find module '.../src/tabs/national.js'`.

- [ ] **Step 3: Implement** `src/tabs/national.js`:

```js
// The National numbers tab as plain data (spec "Other tabs"): headline and core with
// the one-month change and its yearly pace, the 12-month trend, other official
// measures, and notes. Pure, so the wording is unit-tested and the view only lays it out.

import { formatRate, movePhrase, monthLabel, barGeometry, round1, joinAnd } from "../calculator/format.js";
import { staleNote, gapNote } from "./notes.js";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

/** "2026-08" → "August"; offset −1 → "July" (wraps across the year). "" when missing. */
export function monthName(referenceMonth, offset = 0) {
  const m = /^(\d{4})-(\d{2})$/.exec(referenceMonth ?? "");
  if (!m) return "";
  return MONTHS[(((Number(m[2]) - 1 + offset) % 12) + 12) % 12];
}

/**
 * Trend labels in the payload look like "Sep 25", which reads as a date. Returns
 * { short: "Sep 2025", long: "September 2025" }; an unknown label passes through.
 */
export function trendMonth(label) {
  const m = /^([A-Z][a-z]{2}) (\d{2})$/.exec(label ?? "");
  const i = m ? SHORT.indexOf(m[1]) : -1;
  if (i < 0) return { short: label ?? "", long: label ?? "" };
  const year = 2000 + Number(m[2]);
  return { short: `${m[1]} ${year}`, long: `${MONTHS[i]} ${year}` };
}

/** "rise 4.9%", "fall 1.2%", "stay about the same", for "they would …". */
function wouldPhrase(pct) {
  const r = round1(pct);
  if (r === 0) return "stay about the same";
  return `${r > 0 ? "rise" : "fall"} ${Math.abs(r).toFixed(1)}%`;
}

export const CARDS = {
  headline: {
    title: "Prices overall",
    help: "This is the number in the news. The one-month change is adjusted for normal seasonal swings, like holiday sales.",
  },
  core: {
    title: "Prices other than food and energy",
    help: "Food and energy prices jump around the most. Leaving them out shows the slower trend underneath. Economists call this core inflation.",
  },
};

/** Names and one-sentence explanations for the measures that are not in ALT_MEASURES. */
export const MEASURES = {
  headline: { name: "CPI for all items", blurb: "The government's main measure of prices for everything people buy." },
  core: { name: "Core CPI", blurb: "CPI without food and energy, whose prices jump around the most." },
  exShelter: {
    name: "CPI without housing",
    blurb: "CPI without rent and the rent value of owned homes. Your costs compares homeowners with this one.",
  },
};

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
  return {
    title,
    yearText: has ? formatRate(node.yoy) : "Not available",
    yearSentence: !has
      ? "This figure is not available right now."
      : month ? `Change over the 12 months to ${month}.` : "Change over the last 12 months.",
    monthSentence,
    help,
  };
}

/**
 * Other official measures, highest first, with bar geometry from zero. Measures
 * with no number are left out, never drawn as 0. Rows: { key, name, note, value,
 * valueText, bar, stale } — the shape BarList lays out.
 */
export function measureRows(data) {
  const ex = data.lines?.exShelter ?? null;
  const list = [
    { key: "headline", ...MEASURES.headline, value: data.headline.yoy, stale: data.headline.stale },
    { key: "core", ...MEASURES.core, value: data.core.yoy, stale: data.core.stale },
    { key: "exShelter", ...MEASURES.exShelter, value: ex?.yoy ?? null, stale: ex?.stale ?? false },
    ...data.altMeasures.map((m) => ({ key: m.key, name: m.label, blurb: m.blurb, value: m.yoy, stale: m.stale })),
  ]
    .filter((r) => r.value != null)
    .sort((a, b) => b.value - a.value);
  const bars = barGeometry(list.map((r) => r.value));
  return list.map((r, i) => ({
    key: r.key, name: r.name, note: r.blurb, value: r.value, valueText: formatRate(r.value), bar: bars[i], stale: r.stale,
  }));
}

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

  const measures = measureRows(data);
  // Headline and core are named here even if they have no number (then they are not in measures).
  const staleNames = [
    ...(data.headline.stale ? [MEASURES.headline.name] : []),
    ...(data.core.stale ? [MEASURES.core.name] : []),
    ...measures.filter((m) => m.stale && m.key !== "headline" && m.key !== "core").map((m) => m.name),
  ];

  return {
    lede,
    headline: card(data.headline, CARDS.headline, data.referenceMonth),
    core: card(data.core, CARDS.core, data.referenceMonth),
    trend,
    trendNote,
    measures,
    notes: [staleNote(staleNames), gapNote(data)].filter(Boolean),
  };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `node --test src/tabs/national.test.mjs && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: 9 tests pass; full suite `pass 152`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/national.js src/tabs/national.test.mjs
git commit -m "feat(tabs): National numbers model"
```

---

### Task 4: National numbers view, shared bar list and trend chart

**Files:**
- Create: `src/components/BarList.jsx`, `src/components/TrendChart.jsx`, `src/views/NationalNumbers.jsx`, `src/styles/tabs.css`
- Modify: `src/main.jsx`, `src/App.jsx`, `src/styles/tokens.test.mjs`

**Interfaces:**
- Consumes: `nationalModel` (Task 3).
- Produces:
  - `<BarList rows label />`, where `rows` has the BarList row shape (Task 3).
  - `<TrendChart points />`, where `points` is `nationalModel().trend`.
  - CSS classes in `tabs.css` that Tasks 6 and 9 reuse: `.tab`, `.tab-intro`, `.stats`, `.stat`, `.stat-value`, `.stat-sub`, `.trend-chart`, `.bar-list`, `.bar-row`, `.bar-name`, `.bar-val`, `.data-table` (+ `.num`, `.group`), `.fuel`, `.fuel-price`, `.status`.
  - Existing classes reused: `.lede`, `.help`, `.fine`, `.line-note`, `.bar-track`, `.bar`, `.sr`, `.btn`.

- [ ] **Step 1: Extend the literal-color scan first, so the new files are checked as they land.** In `src/styles/tokens.test.mjs`, replace the comment `// "Components never use literal colors." Scans the new UI files that exist so far.` with `// "Components never use literal colors." Scans the new UI files.`. Replace `  for (const dir of ["styles", "components"]) {` with:

```js
  for (const dir of ["styles", "components", "tabs"]) {
```

and replace

```js
  for (const f of ["views/YourCosts.jsx", "App.jsx"]) {
    if (existsSync(join(src, f))) files.push(join(src, f));
  }
```

with

```js
  // Every view except the old dashboard, which Task 10 deletes (and drops this exception).
  for (const f of readdirSync(join(src, "views"))) {
    if (/\.(jsx|js)$/.test(f) && f !== "LegacyDashboard.jsx") files.push(join(src, "views", f));
  }
  if (existsSync(join(src, "App.jsx"))) files.push(join(src, "App.jsx"));
```

Run: `node --test src/styles/tokens.test.mjs`. Expected: pass. It now also scans `YourCostsIntro.jsx` and the `tabs/` modules from Tasks 2 and 3.

- [ ] **Step 2: Create** `src/components/BarList.jsx`:

```jsx
/**
 * Rows of name, value and a bar from zero (one neutral hue, direct value labels;
 * spec "Chart rules"). Rows come from measureRows() or movers():
 * { key, name, note, valueText, bar: { left, width } }.
 */
export default function BarList({ rows, label }) {
  return (
    <ul className="bar-list" aria-label={label}>
      {rows.map((r) => (
        <li className="bar-row" key={r.key}>
          <span className="bar-name">
            {r.name}
            {r.note && <span className="line-note">{r.note}</span>}
          </span>
          <span className="bar-val">{r.valueText}</span>
          <span className="bar-track" aria-hidden="true">
            <span className="bar" style={{ left: `${r.bar.left}%`, width: `${r.bar.width}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Create** `src/components/TrendChart.jsx`:

```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatRate } from "../calculator/format.js";

const TICK = { fill: "var(--ink-2)", fontSize: 13 };

/**
 * The 12-month change in prices overall, month by month: one series in --accent,
 * gridlines in --rule, text in --ink-2 (spec "Chart rules"). Gap months are null,
 * so the line breaks there instead of guessing. The same numbers are in a
 * visually hidden table for screen readers.
 * points: [{ short, long, value, valueText }] from nationalModel().trend.
 */
export default function TrendChart({ points }) {
  return (
    <>
      <div className="trend-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="short" tick={TICK} tickLine={false} axisLine={{ stroke: "var(--rule)" }}
              interval="preserveStartEnd" minTickGap={24}
            />
            <YAxis
              width={44} tick={TICK} tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[(min) => Math.min(0, Math.floor(min)), (max) => Math.max(0, Math.ceil(max))]}
            />
            <ReferenceLine y={0} stroke="var(--control-edge)" />
            <Tooltip
              formatter={(v) => [formatRate(v), "Prices overall"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.long ?? ""}
              separator=": "
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 6, color: "var(--ink)" }}
              labelStyle={{ color: "var(--ink)", fontWeight: 700 }}
              itemStyle={{ color: "var(--ink)" }}
              cursor={{ stroke: "var(--rule)" }}
            />
            <Line
              type="linear" dataKey="value" stroke="var(--accent)" strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--accent)", stroke: "var(--accent)" }}
              connectNulls={false} isAnimationActive={false}
            />
          </LineChart>
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

- [ ] **Step 4: Create** `src/views/NationalNumbers.jsx`:

```jsx
import { useMemo } from "react";
import { nationalModel } from "../tabs/national.js";
import TrendChart from "../components/TrendChart.jsx";
import BarList from "../components/BarList.jsx";

function Stat({ card }) {
  return (
    <div className="stat">
      <h2>{card.title}</h2>
      <p className="stat-value">{card.yearText}</p>
      <p>{card.yearSentence}</p>
      {card.monthSentence && <p className="stat-sub">{card.monthSentence}</p>}
      <p className="help">{card.help}</p>
    </div>
  );
}

/** The National numbers tab (spec "Other tabs"). Lays out nationalModel(); computes nothing. */
export default function NationalNumbers({ data }) {
  const m = useMemo(() => nationalModel(data), [data]);
  return (
    <article className="tab" aria-labelledby="page-title">
      <header className="tab-intro">
        <h1 id="page-title" tabIndex={-1}>National numbers</h1>
        <p className="lede">{m.lede}</p>
      </header>

      <section className="stats" aria-label="The latest rates">
        <Stat card={m.headline} />
        <Stat card={m.core} />
      </section>

      <section aria-labelledby="trend-title">
        <h2 id="trend-title">The last 12 months</h2>
        <p>The change in prices overall over 12 months, as of each month.</p>
        {m.trend.length > 0
          ? <TrendChart points={m.trend} />
          : <p>These figures are not available right now.</p>}
        {m.trendNote && <p className="help">{m.trendNote}</p>}
      </section>

      <section aria-labelledby="measures-title">
        <h2 id="measures-title">Other official measures</h2>
        <p>Government agencies and the Federal Reserve measure inflation in several ways. Each number is the change over 12 months.</p>
        {m.measures.length > 0
          ? <BarList rows={m.measures} label="Official measures, highest first" />
          : <p>These figures are not available right now.</p>}
      </section>

      {/* Reserved: the comparison with other countries (a separate spec) goes here. */}

      {m.notes.length > 0 && (
        <div className="fine">
          {m.notes.map((text) => <p key={text}>{text}</p>)}
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 5: Create** `src/styles/tabs.css` with the shared tab styles. Tasks 6 and 9 append to it.

```css
/* National numbers, Price check and Sources. Colors only through tokens. No boxes:
   sections are separated by a top rule, so the views have no raised surface. */

.tab { display: grid; gap: 36px; max-width: 760px; padding-top: 28px; }
.tab-intro { display: grid; gap: 12px; }
.tab section { min-width: 0; padding-top: 20px; border-top: 1px solid var(--rule); }
.tab h2 { margin: 0 0 8px; font-weight: 700; font-size: 20px; }
.tab h3 { margin: 24px 0 8px; font-weight: 700; font-size: 18px; }
.tab p { margin: 0 0 10px; max-width: 36em; }
.tab .fine p { margin: 0 0 6px; }
.tab a { color: var(--ink); text-underline-offset: 3px; }

.stats { display: grid; gap: 28px; }
@media (min-width: 720px) { .stats { grid-template-columns: 1fr 1fr; } }
.stat h2 { font-size: 18px; }
.stat-value {
  margin: 4px 0 6px;
  font-weight: 800;
  font-size: clamp(34px, 9.4vw, 46px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.stat-sub { color: var(--ink-2); }

.trend-chart { height: 240px; margin-block: 8px 12px; }

.bar-list { margin: 0; padding: 0; list-style: none; }
.bar-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5em;
  column-gap: 12px;
  align-items: baseline;
  padding-block: 10px;
  border-top: 1px solid var(--rule);
  font-variant-numeric: tabular-nums;
}
.bar-name { font-weight: 500; overflow-wrap: anywhere; }
.bar-val { text-align: right; font-weight: 700; }
.bar-row .bar-track { grid-column: 1 / -1; height: 6px; margin-top: 8px; }
.bar-row .bar { background: var(--bar-line); }

.data-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-variant-numeric: tabular-nums; }
.data-table th,
.data-table td { padding: 10px 6px; border-top: 1px solid var(--rule); text-align: left; vertical-align: baseline; overflow-wrap: anywhere; }
.data-table th:first-child,
.data-table td:first-child { padding-left: 0; }
.data-table thead th { border-top: 0; font-weight: 600; font-size: 15px; color: var(--ink-2); }
.data-table tbody th { font-weight: 500; }
.data-table th.group { padding-top: 20px; font-weight: 700; }
.data-table .num { text-align: right; }

.fuel { display: grid; gap: 2px; padding-block: 12px; border-top: 1px solid var(--rule); }
.fuel h3 { margin: 0; font-size: 16px; }
.fuel-price { margin: 0; font-weight: 700; font-size: 20px; font-variant-numeric: tabular-nums; }
.fuel p { margin: 0; }

.status { min-height: 1.5em; color: var(--ink-2); }
```

In `src/main.jsx`, after `import "./styles/calculator.css";` add:

```js
import "./styles/tabs.css";
```

- [ ] **Step 6: Wire the route**. In `src/App.jsx`, after `import YourCosts from "./views/YourCosts.jsx";` add:

```js
import NationalNumbers from "./views/NationalNumbers.jsx";
```

Replace `const LEGACY_VIEW = { "national-numbers": "dashboard", "price-check": "prices", sources: "methodology" };` with:

```js
const LEGACY_VIEW = { "price-check": "prices", sources: "methodology" };
```

Replace the `<main>` body:

```jsx
        {route === "your-costs"
          ? <YourCosts data={data} base={BASE} onNavigate={navigate} />
          : <LegacyDashboard dynamic={dynamic} view={LEGACY_VIEW[route]} />}
```

with:

```jsx
        {route === "your-costs" ? <YourCosts data={data} base={BASE} onNavigate={navigate} />
          : route === "national-numbers" ? <NationalNumbers data={data} />
          : <LegacyDashboard dynamic={dynamic} view={LEGACY_VIEW[route]} />}
```

- [ ] **Step 7: Run tests and build**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built|error"`
Expected: `pass 152`, `fail 0`, `✓ built`. The existing ">500 kB chunk" warning is expected.

- [ ] **Step 8: Look at it in a real browser.** Start `npx vite preview --port 4719 --strictPort` in the background. Then save this check to the session scratchpad as `tab-check.py` (Tasks 6 and 9 reuse it) and run `python3 <scratchpad>/tab-check.py national-numbers`:

```python
"""Screenshots and basic checks for one tab: 390 and 1280 px, light and dark.

Usage: python3 tab-check.py <route-id>, with `npx vite preview --port 4719 --strictPort` running.
Screenshots land next to this script.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

route = sys.argv[1]
url = "http://localhost:4719/inflation-reality/" + ("" if route == "your-costs" else "#" + route)
out = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 1280):
        for theme in ("light", "dark"):
            page = browser.new_page(viewport={"width": width, "height": 900}, color_scheme=theme)
            errors = []
            page.on("console", lambda m: m.type == "error" and "cpi.json" not in m.text and errors.append(m.text))
            page.goto(url)
            page.wait_for_timeout(1200)
            page.screenshot(path=str(out / f"{route}-{width}-{theme}.png"), full_page=True)
            print(width, theme, "heading", page.locator("#page-title").inner_text(),
                  "hscroll", page.evaluate("document.documentElement.scrollWidth > innerWidth"), "errors", errors)
            page.close()
    browser.close()
```

Expected: `heading National numbers`, `hscroll False`, `errors []` for each of the four runs. Open the screenshots and confirm the following. The two big numbers sit side by side at 1280px and stacked at 390px. The line is green and breaks at the gap months. The measure bars are one gray. In dark mode the ground is dark and the text is light, with no white boxes. Stop the preview server afterwards.

- [ ] **Step 9: Commit**

```bash
git add src/components/BarList.jsx src/components/TrendChart.jsx src/views/NationalNumbers.jsx src/styles/tabs.css src/main.jsx src/App.jsx src/styles/tokens.test.mjs
git commit -m "feat(national-numbers): new National numbers tab replaces the legacy view"
```

---

### Task 5: Price check model (`prices.js`)

**Files:**
- Create: `src/tabs/prices.js`, `src/tabs/prices.test.mjs`

**Interfaces:**
- Consumes: `formatRate`, `barGeometry` (format.js); `staleLabels` (merge.js); `staleNote`, `gapNote` (Task 2).
- Produces:
  - `UNIT_WORDS`, `unitWords(unit): string`
  - `pctChange(current, yearAgo): number | null`. Tasks 7 and 8 use it.
  - `formatPrice(n): string`
  - `avgPriceGroups(data): { category, items: { seriesId, item, unitText, nowText, yearAgoText, change, changeText }[] }[]`
  - `movers(data, count = 10)`: BarList rows (`{ key, name, note, value, valueText, bar }`)
  - `fuelRows(data): { key, label, nowText, weekText, yearAgoText, monthlyText, blurb }[]`
  - `priceNotes(data): string[]`

- [ ] **Step 1: Write the failing test** `src/tabs/prices.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { unitWords, pctChange, formatPrice, avgPriceGroups, movers, fuelRows, priceNotes } from "./prices.js";
import { AVG_PRICE_ITEMS } from "../data/catalog.js";
import { viewData } from "./testdata.mjs";

test("unitWords: catalog units in words, unknown ones readable", () => {
  assert.equal(unitWords("/doz"), "a dozen");
  assert.equal(unitWords("/16oz"), "for 16 ounces");
  assert.equal(unitWords("/box"), "a box");
});

test("pctChange: null, never Infinity or NaN, when a price is missing or zero", () => {
  assert.ok(Math.abs(pctChange(2.272, 3.587) - -36.66) < 0.01);
  assert.equal(pctChange(null, 3), null);
  assert.equal(pctChange(3, null), null);
  assert.equal(pctChange(3, 0), null);
});

test("formatPrice: two decimals, three under $1", () => {
  assert.equal(formatPrice(3.587), "$3.59");
  assert.equal(formatPrice(0.183), "$0.183");
  assert.equal(formatPrice(null), "");
});

test("avgPriceGroups: every catalog item, grouped in catalog order, missing data said plainly", () => {
  const groups = avgPriceGroups(viewData());
  assert.equal(groups.reduce((n, g) => n + g.items.length, 0), AVG_PRICE_ITEMS.length);
  assert.deepEqual(groups.map((g) => g.category), [...new Set(AVG_PRICE_ITEMS.map((p) => p.category))]);
  const all = groups.flatMap((g) => g.items);
  const eggs = all.find((i) => i.seriesId === "APU0000708111");
  assert.deepEqual(
    [eggs.nowText, eggs.yearAgoText, eggs.changeText, eggs.unitText],
    ["$2.27", "$3.59", "−36.7%", "a dozen"],
  );
  const milk = all.find((i) => i.seriesId === "APU0000709112");
  assert.deepEqual([milk.nowText, milk.yearAgoText, milk.changeText], ["$4.10", "Not available", ""]);
  const chicken = all.find((i) => i.seriesId === "APU0000706111");
  assert.equal(chicken.nowText, "Not available");
  for (const i of all) assert.doesNotMatch(`${i.nowText}${i.changeText}`, /NaN|Infinity|undefined/);
});

test("movers: largest change first either way, missing prices left out, falls extend left", () => {
  const rows = movers(viewData());
  assert.deepEqual(rows.map((r) => r.name), [
    "Eggs, Grade A Large", "Gasoline, Regular", "Ground Beef, 100%", "Electricity", "Butter, Stick",
  ]);
  assert.equal(rows[0].valueText, "−36.7%");
  assert.equal(rows[0].bar.left, 0);
  assert.ok(rows[1].bar.left > 0);
  assert.equal(rows.at(-1).valueText, "0.0%");
  assert.equal(movers(viewData(), 2).length, 2);
  assert.deepEqual(movers(viewData({ avgPrices: {} })), []);
});

test("fuelRows: weekly price, week, year-ago change and the monthly average; missing fuel says so", () => {
  const [gas, diesel] = fuelRows(viewData());
  assert.equal(gas.label, "Gasoline, regular");
  assert.equal(gas.nowText, "$4.32 a gallon");
  assert.equal(gas.weekText, "Week ending Sep 14, 2026.");
  assert.equal(gas.yearAgoText, "A year earlier: $3.17 (+36.3%).");
  assert.equal(gas.monthlyText, "Government monthly average for August 2026: $4.21 a gallon.");
  assert.equal(diesel.nowText, "Not available");
  assert.equal(diesel.weekText, "");
  assert.equal(diesel.yearAgoText, "");
  assert.equal(diesel.monthlyText, "");
});

test("priceNotes: stale prices by name", () => {
  assert.deepEqual(priceNotes(viewData()), ["Using the last known price for Butter, Stick."]);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/tabs/prices.test.mjs`
Expected: FAIL, `Cannot find module '.../src/tabs/prices.js'`.

- [ ] **Step 3: Implement** `src/tabs/prices.js`:

```js
// The Price check tab as plain data: average prices, weekly fuel prices, and the
// biggest price changes. Pure, so the view only lays it out.

import { formatRate, barGeometry } from "../calculator/format.js";
import { staleLabels } from "../data/merge.js";
import { staleNote, gapNote } from "./notes.js";

/** Catalog units in words: "$2.27 a dozen", not "$2.27/doz". */
export const UNIT_WORDS = {
  "/doz": "a dozen",
  "/lb": "a pound",
  "/gal": "a gallon",
  "/kWh": "a kilowatt-hour",
  "/therm": "a therm",
  "/16oz": "for 16 ounces",
};

export function unitWords(unit) {
  return UNIT_WORDS[unit] ?? String(unit ?? "").replace(/^\//, "a ");
}

/** Percent change, or null when either price is missing or the year-ago price is 0. */
export function pctChange(current, yearAgo) {
  if (current == null || yearAgo == null || yearAgo === 0) return null;
  return (current / yearAgo - 1) * 100;
}

/** "$2.27"; prices under $1 keep a third decimal ("$0.183") so small changes still show. */
export function formatPrice(n) {
  if (n == null) return "";
  return `$${n.toFixed(Math.abs(n) < 1 ? 3 : 2)}`;
}

/** Average prices grouped by catalog category, in catalog order. */
export function avgPriceGroups(data) {
  const groups = [];
  for (const p of data.avgPrices) {
    let g = groups.find((x) => x.category === p.category);
    if (!g) groups.push((g = { category: p.category, items: [] }));
    const change = pctChange(p.current, p.yearAgo);
    g.items.push({
      seriesId: p.seriesId,
      item: p.item,
      unitText: unitWords(p.unit),
      nowText: p.current == null ? "Not available" : formatPrice(p.current),
      yearAgoText: p.yearAgo == null ? "Not available" : formatPrice(p.yearAgo),
      change,
      changeText: change == null ? "" : formatRate(change),
    });
  }
  return groups;
}

/**
 * The `count` items whose prices moved the most over the year, up or down, largest
 * first. Items without both prices are left out. Rows have the BarList shape.
 */
export function movers(data, count = 10) {
  const list = data.avgPrices
    .map((p) => ({ key: p.seriesId, name: p.item, value: pctChange(p.current, p.yearAgo) }))
    .filter((r) => r.value != null)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.name.localeCompare(b.name))
    .slice(0, count);
  const bars = barGeometry(list.map((r) => r.value));
  return list.map((r, i) => ({ ...r, note: "", valueText: formatRate(r.value), bar: bars[i] }));
}

/** Weekly EIA fuel prices next to the BLS monthly average for the same fuel. */
export function fuelRows(data) {
  return data.weeklyPrices.map((w) => {
    const unit = unitWords(w.unit);
    const change = pctChange(w.current, w.yearAgo);
    const bls = data.avgPrices.find((p) => p.seriesId === w.blsSeriesId);
    let yearAgoText = "";
    if (w.yearAgo != null) {
      yearAgoText = `A year earlier: ${formatPrice(w.yearAgo)}`;
      if (change != null) yearAgoText += ` (${formatRate(change)})`;
      yearAgoText += ".";
    }
    return {
      key: w.key,
      label: w.label,
      nowText: w.current == null ? "Not available" : `${formatPrice(w.current)} ${unit}`,
      weekText: w.current != null && w.asOfLabel ? `Week ending ${w.asOfLabel}.` : "",
      yearAgoText,
      monthlyText: bls?.current == null || !data.referenceMonthLabel
        ? ""
        : `Government monthly average for ${data.referenceMonthLabel}: ${formatPrice(bls.current)} ${unit}.`,
      blurb: w.blurb,
    };
  });
}

/** Stale and gap notes for the Price check fine print. */
export function priceNotes(data) {
  const stale = [...new Set([...staleLabels(data.avgPrices), ...staleLabels(data.weeklyPrices)])];
  return [staleNote(stale, "price"), gapNote(data)].filter(Boolean);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `node --test src/tabs/prices.test.mjs && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: 7 pass; full suite `pass 159`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/prices.js src/tabs/prices.test.mjs
git commit -m "feat(tabs): Price check model"
```

---

### Task 6: Price check view

**Files:**
- Create: `src/views/PriceCheck.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `avgPriceGroups`, `movers`, `fuelRows`, `priceNotes` (Task 5); `BarList` and `tabs.css` classes (Task 4).

- [ ] **Step 1: Create** `src/views/PriceCheck.jsx`:

```jsx
import { useMemo } from "react";
import { avgPriceGroups, movers, fuelRows, priceNotes } from "../tabs/prices.js";
import BarList from "../components/BarList.jsx";

/** The Price check tab (spec "Other tabs"). Lays out prices.js output; computes nothing. */
export default function PriceCheck({ data }) {
  const groups = useMemo(() => avgPriceGroups(data), [data]);
  const fuel = useMemo(() => fuelRows(data), [data]);
  const moved = useMemo(() => movers(data), [data]);
  const notes = useMemo(() => priceNotes(data), [data]);
  const month = data.referenceMonthLabel;

  return (
    <article className="tab" aria-labelledby="page-title">
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
          ? <BarList rows={moved} label="Biggest price changes, largest first" />
          : <p>These figures are not available right now.</p>}
      </section>

      {notes.length > 0 && (
        <div className="fine">
          {notes.map((text) => <p key={text}>{text}</p>)}
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Wire the route**. In `src/App.jsx`, after the `NationalNumbers` import add `import PriceCheck from "./views/PriceCheck.jsx";`. Replace `const LEGACY_VIEW = { "price-check": "prices", sources: "methodology" };` with:

```js
const LEGACY_VIEW = { sources: "methodology" };
```

After the line `          : route === "national-numbers" ? <NationalNumbers data={data} />` add:

```jsx
          : route === "price-check" ? <PriceCheck data={data} />
```

- [ ] **Step 3: Run tests, build, and look at it**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built|error"`
Expected: `pass 159`, `fail 0`, `✓ built`.

Then, with `npx vite preview --port 4719 --strictPort` running, run `python3 <scratchpad>/tab-check.py price-check` (the script is in Task 4 Step 8). Expected: `heading Price check`, `hscroll False`, `errors []` four times. In the 390px screenshot, check four things. Each item's unit sits under its name ("a dozen"). Prices line up on the right. Falls read `−36.7%`. Biggest price changes has bars going both ways from one zero line. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/views/PriceCheck.jsx src/App.jsx
git commit -m "feat(price-check): new Price check tab replaces the legacy view"
```

---

### Task 7: Sources model (`sources.js`)

**Files:**
- Create: `src/tabs/sources.js`, `src/tabs/sources.test.mjs`

**Interfaces:**
- Consumes: `BASKET` (catalog); `LINES`, `EMPLOYER_HEALTH_DEFAULT` (config.js); `formatDollars` (format.js); `pctChange` (Task 5).
- Produces:
  - `sourceUrl(seriesId, source: "fred" | "bls"): string`
  - `seriesGroups(catalog, data): { id: "household" | "yardstick" | "average" | "national" | "prices", title, rows: { name, seriesId, source: "FRED" | "BLS", url, yoy: number | null }[] }[]`
  - `NO_SERIES_LINES: { name, how }[]`
  - `METHOD: { heading, paragraphs: string[] }[]`
  - `CAVEATS: string[]`
  - `SOURCE_LINKS: { text, url }[]`

- [ ] **Step 1: Write the failing test** `src/tabs/sources.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as catalog from "../data/catalog.js";
import { seriesGroups, sourceUrl, NO_SERIES_LINES, METHOD, CAVEATS, SOURCE_LINKS } from "./sources.js";
import { viewData } from "./testdata.mjs";

const groups = seriesGroups(catalog, viewData());
const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
const ids = (g) => g.rows.map((r) => r.seriesId);

test("sourceUrl: FRED series page or the BLS data viewer", () => {
  assert.equal(sourceUrl("CUUR0000SEHA", "fred"), "https://fred.stlouisfed.org/series/CUUR0000SEHA");
  assert.equal(sourceUrl("CUUR0000SETE", "bls"), "https://data.bls.gov/timeseries/CUUR0000SETE");
});

test("the yardstick is a source series, never a household line", () => {
  const yard = catalog.CALC_LINES.find((l) => l.yardstick);
  assert.ok(!ids(byId.household).includes(yard.seriesId));
  assert.ok(ids(byId.yardstick).includes(yard.seriesId));
  assert.ok(ids(byId.national).includes(yard.seriesId));
  const row = byId.yardstick.rows.find((r) => r.seriesId === yard.seriesId);
  assert.equal(row.name, "Prices other than housing (homeowners)");
  assert.equal(row.yoy, 3.6);
  assert.ok(!NO_SERIES_LINES.some((l) => l.name === yard.label));
});

test("every household series and combo part is listed with its own source's link", () => {
  for (const l of catalog.CALC_LINES.filter((x) => !x.yardstick)) {
    const r = byId.household.rows.find((x) => x.seriesId === l.seriesId);
    assert.ok(r, `${l.id} listed`);
    assert.equal(r.url, sourceUrl(l.seriesId, l.source));
  }
  const parts = byId.household.rows.filter((r) => r.name.startsWith("Doctor and pharmacy: "));
  assert.deepEqual(parts.map((r) => r.source), ["BLS", "BLS"]);
  assert.match(parts[0].url, /^https:\/\/data\.bls\.gov\/timeseries\//);
});

test("every series the site fetches appears, except the old dashboard's categories", () => {
  const listed = new Set(groups.flatMap(ids));
  const used = new Set([
    ...catalog.blsSeries(),
    catalog.HEADLINE.seriesId, catalog.HEADLINE.momSeriesId, catalog.CORE.seriesId, catalog.CORE.momSeriesId,
    ...catalog.CALC_LINES.map((l) => l.seriesId),
    ...catalog.BASKET.visible.map((v) => v.seriesId),
    ...catalog.ALT_MEASURES.map((m) => m.seriesId),
    ...catalog.AVG_PRICE_ITEMS.map((p) => p.seriesId),
    ...catalog.WEEKLY_PRICES.map((w) => w.seriesId),
  ]);
  for (const id of used) assert.ok(listed.has(id), `${id} listed`);
});

test("missing numbers stay null, never 0", () => {
  const sticky = byId.national.rows.find((r) => r.seriesId === "CORESTICKM159SFRBATL");
  assert.equal(sticky.yoy, null);
  const chicken = byId.prices.rows.find((r) => r.seriesId === "APU0000706111");
  assert.equal(chicken.yoy, null);
  const diesel = byId.prices.rows.find((r) => r.seriesId === "GASDESW");
  assert.equal(diesel.yoy, null);
});

test("copy follows the voice guide", () => {
  const text = [
    ...groups.flatMap((g) => [g.title, ...g.rows.map((r) => r.name)]),
    ...NO_SERIES_LINES.flatMap((l) => [l.name, l.how]),
    ...METHOD.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...CAVEATS,
    ...SOURCE_LINKS.map((l) => l.text),
  ];
  for (const t of text) {
    for (const banned of ["—", "·", "→", "!", "Welcome back", "Here's", "Let's", "simply"]) {
      assert.ok(!t.includes(banned), `${JSON.stringify(banned)} in ${t}`);
    }
  }
  assert.ok(METHOD.some((s) => s.paragraphs.some((p) => p.includes("$5,750 a month"))));
  for (const l of SOURCE_LINKS) assert.match(l.url, /^https:\/\//);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/tabs/sources.test.mjs`
Expected: FAIL, `Cannot find module '.../src/tabs/sources.js'`.

- [ ] **Step 3: Implement** `src/tabs/sources.js`:

```js
// The Sources tab's copy and series list as plain data (spec "Other tabs": how the
// estimate is worked out, every series with a FRED or BLS link, caveats). The
// spreadsheet's "How it works" and "Price changes" sheets reuse the same data, so
// the page and the download never disagree.

import { BASKET } from "../data/catalog.js";
import { LINES, EMPLOYER_HEALTH_DEFAULT } from "../calculator/config.js";
import { formatDollars } from "../calculator/format.js";
import { pctChange } from "./prices.js";

/** Where a person can check a series: FRED for FRED-sourced ids, the BLS data viewer otherwise. */
export function sourceUrl(seriesId, source) {
  return source === "bls"
    ? `https://data.bls.gov/timeseries/${seriesId}`
    : `https://fred.stlouisfed.org/series/${seriesId}`;
}

const row = (name, seriesId, source, yoy = null) => ({
  name, seriesId, source: source === "bls" ? "BLS" : "FRED", url: sourceUrl(seriesId, source), yoy,
});

/**
 * Every series on the site, grouped by what it is used for. The owners' yardstick
 * (a CALC_LINES entry with yardstick: true) is listed under "What we compare you
 * with" and National numbers, never as a Your costs line. yoy is the 12-month
 * change where the site has one, else null.
 * @returns {{ id: string, title: string, rows: ReturnType<typeof row>[] }[]}
 */
export function seriesGroups(catalog, data) {
  const { HEADLINE, CORE, CALC_LINES, CALC_COMBOS, ALT_MEASURES, AVG_PRICE_ITEMS, WEEKLY_PRICES } = catalog;
  const lineYoy = (id) => data.lines?.[id]?.yoy ?? null;
  const yardsticks = CALC_LINES.filter((l) => l.yardstick);
  const household = CALC_LINES.filter((l) => !l.yardstick);
  const basketRate = (id) => data.basket?.items?.find((i) => i.id === id)?.rate ?? null;
  const alt = (key) => data.altMeasures?.find((m) => m.key === key)?.yoy ?? null;
  const avg = (id) => data.avgPrices?.find((p) => p.seriesId === id);
  const weekly = (key) => data.weeklyPrices?.find((w) => w.key === key);

  return [
    {
      id: "household",
      title: "Your costs lines",
      rows: [
        ...household.map((l) => row(l.label, l.seriesId, l.source, lineYoy(l.id))),
        ...CALC_COMBOS.flatMap((c) => c.parts.map((p) => row(`${c.label}: ${p.label.toLowerCase()}`, p.seriesId, c.source))),
      ],
    },
    {
      id: "yardstick",
      title: "What we compare you with",
      rows: [
        row("Prices overall (renters and the average household)", HEADLINE.seriesId, "fred", data.headline?.yoy ?? null),
        ...yardsticks.map((l) => row(`${l.label} (homeowners)`, l.seriesId, l.source, lineYoy(l.id))),
      ],
    },
    {
      id: "average",
      title: "The average household",
      rows: BASKET.visible.map((v) => row(v.label, v.seriesId, "fred", basketRate(v.id))),
    },
    {
      id: "national",
      title: "National numbers",
      rows: [
        row("CPI for all items", HEADLINE.seriesId, "fred", data.headline?.yoy ?? null),
        row("CPI for all items, seasonally adjusted (one-month change)", HEADLINE.momSeriesId, "fred"),
        row("Core CPI", CORE.seriesId, "fred", data.core?.yoy ?? null),
        row("Core CPI, seasonally adjusted (one-month change)", CORE.momSeriesId, "fred"),
        ...yardsticks.map((l) => row("CPI without housing", l.seriesId, l.source, lineYoy(l.id))),
        ...ALT_MEASURES.map((m) => row(m.label, m.seriesId, "fred", alt(m.key))),
      ],
    },
    {
      id: "prices",
      title: "Price check",
      rows: [
        ...AVG_PRICE_ITEMS.map((p) => {
          const a = avg(p.seriesId);
          return row(p.item, p.seriesId, "fred", pctChange(a?.current ?? null, a?.yearAgo ?? null));
        }),
        ...WEEKLY_PRICES.map((w) => {
          const x = weekly(w.key);
          return row(`${w.label}, weekly`, w.seriesId, "fred", pctChange(x?.current ?? null, x?.yearAgo ?? null));
        }),
      ],
    },
  ];
}

/** Lines whose rate does not come from a series of their own. */
export const NO_SERIES_LINES = [
  { name: LINES.mortgage.label, how: "0% by definition. A fixed-rate payment stays the same from year to year." },
  { name: LINES.homeIns.label, how: "The increase on your renewal notice. It is left out until you add it." },
  {
    name: LINES.health.label,
    how: `The increase on your renewal notice. Through work, it starts at ${EMPLOYER_HEALTH_DEFAULT}%, the 2025 average for employer family plans.`,
  },
  { name: LINES.charging.label, how: "Uses the change in home electricity prices." },
  { name: LINES.rest.label, how: "The rate that makes the average household match the national rate." },
];

/** "How your estimate is worked out": headings with one to three plain paragraphs each. */
export const METHOD = [
  {
    heading: "The basic idea",
    paragraphs: [
      "For each kind of spending, we take your monthly amount and how much its price changed over the last 12 months. From those two numbers we work out what the same spending cost a year ago. The difference is the extra you pay this year.",
      "For example, say you spend $200 a month on gas and gas prices rose 25%. That is $2,400 a year. A year ago the same gas cost $2,400 divided by 1.25, or $1,920. So you pay $480 more.",
      "Your rate is everything you spend in a year compared with what the same things cost a year ago.",
    ],
  },
  {
    heading: "Mortgages",
    paragraphs: [
      "A fixed-rate payment stays the same each year, so its price change is 0%. The official inflation rate leaves mortgage payments out too, because the government counts buying a home as an investment.",
    ],
  },
  {
    heading: "Homeowners",
    paragraphs: [
      "The national rate includes the rent owners would pay for their own homes. Owners don't pay that rent, so we compare homeowners with prices other than housing instead. Property taxes are left out because they depend on where you live.",
    ],
  },
  {
    heading: "Insurance",
    paragraphs: [
      `Health and home insurance use the increase on your own renewal notice. For health insurance through work, we start at ${EMPLOYER_HEALTH_DEFAULT}%, the average increase for employer family plans in 2025.`,
      "The government's health insurance index measures insurance company earnings instead of premiums, so we don't use it.",
    ],
  },
  {
    heading: "The average household",
    paragraphs: [
      `Before you answer, the page shows the average U.S. household. It spends about ${formatDollars(BASKET.ceMonthlyMean)} a month, from the government's Consumer Expenditure Survey for ${BASKET.ceYear}, split the way the government weights its price index.`,
      `Those weights are set each December. We move each one forward by how much its prices changed since then, so the shares fit the current month. When the 12 months cross January, the government updates its weights, so the average household's total can be off by a small amount.`,
    ],
  },
  {
    heading: "Everything else",
    paragraphs: [
      "The lines we show don't cover all spending. Everything else gets the rate that makes the average household's total match the national rate. Your Everything else line uses the same rate, so it is an estimate.",
    ],
  },
  {
    heading: "Close matches",
    paragraphs: [
      "Some lines use a close match instead of an exact price. Home repairs use household furnishings and operations. Charging an electric car uses home electricity prices. Doctor and pharmacy combines doctors' services and prescription drugs.",
    ],
  },
];

/** "Things to keep in mind." */
export const CAVEATS = [
  "These are national averages. Prices where you live may have gone up more or less.",
  "Price changes are not the same as your cost of living. If you buy more, or different things, your costs change too.",
  "Monthly amounts start as estimates. Change them to match what you pay for a better estimate.",
  "During the 2025 government shutdown, some figures for October and November 2025 were never published.",
  "The numbers update each month after the government publishes new prices, usually in the middle of the month.",
];

/** Background sources named in METHOD, with links. */
export const SOURCE_LINKS = [
  { text: "FRED, Federal Reserve Bank of St. Louis", url: "https://fred.stlouisfed.org/" },
  { text: "Consumer prices, Bureau of Labor Statistics", url: "https://www.bls.gov/cpi/" },
  { text: `Spending weights, December ${BASKET.riYear}`, url: BASKET.riSourceUrl },
  { text: `Consumer Expenditure Survey ${BASKET.ceYear}`, url: BASKET.ceSourceUrl },
  { text: "KFF 2025 Employer Health Benefits Survey", url: "https://www.kff.org/health-costs/2025-employer-health-benefits-survey/" },
  { text: "Why mortgage payments are left out", url: "https://www.bls.gov/cpi/factsheets/owners-equivalent-rent-and-rent.htm" },
  { text: "Weekly fuel prices, Energy Information Administration", url: "https://www.eia.gov/petroleum/gasdiesel/" },
];
```

- [ ] **Step 4: Run it and watch it pass**

Run: `node --test src/tabs/sources.test.mjs && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: 6 pass; full suite `pass 165`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/sources.js src/tabs/sources.test.mjs
git commit -m "feat(tabs): Sources model: every series with its link, method and caveats"
```

---

### Task 8: The spreadsheet (`estimate.js`, `workbook.js`, `download.js`)

**Files:**
- Create: `src/tabs/estimate.js`, `src/tabs/estimate.test.mjs`, `src/tabs/workbook.js`, `src/tabs/workbook.test.mjs`, `src/tabs/download.js`

**Interfaces:**
- Consumes: from `model.js`, `emptyAnswers`, `isPersonal`, `personalRows`, `averageRows` and `computeResult`; `panelModel` (panel.js); `loadAnswers` (storage.js); `seriesGroups`, `METHOD`, `CAVEATS`, `NO_SERIES_LINES`, `SOURCE_LINKS` (Task 7); `pctChange` (Task 5); `trendMonth` (Task 3).
- Produces:
  - `estimateFor(answers, data): { mode: "average" | "personal", rows: object[] | null, model }`. Same inputs and outputs as the Your costs panel.
  - `savedEstimate(data, storage): …same…`. Never throws.
  - `SHEET_NAMES`, `ESTIMATE_HEADER`
  - `workbookFileName(data): string`
  - `estimateRows(estimate, data): any[][]`
  - `buildWorkbook({ catalog, data, estimate }): { name, rows, cols: number[] }[]`
  - `toBook(XLSX, sheets)`: an xlsx workbook object
  - `downloadWorkbook({ catalog, data, estimate }): Promise<void>` in `download.js`. It loads `xlsx` on demand and saves the file.

`YourCosts.jsx` keeps its own inline copy of the `estimateFor` logic. Leave it alone. Refactoring a live, audited tab is out of scope.

- [ ] **Step 1: Write the failing tests**. Create `src/tabs/estimate.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { savedEstimate } from "./estimate.js";
import { emptyAnswers } from "../calculator/model.js";
import { serializeAnswers, STORAGE_KEY } from "../calculator/storage.js";
import { viewData } from "./testdata.mjs";

const store = (value) => ({ getItem: (k) => (k === STORAGE_KEY ? value : null) });

test("no saved answers: the average household, as the panel shows it", () => {
  const e = savedEstimate(viewData(), store(null));
  assert.equal(e.mode, "average");
  assert.equal(e.rows.length, 9);
  assert.equal(e.model.title, "The average U.S. household vs. August 2025");
});

test("blocked, missing or corrupt storage falls back to the average household", () => {
  const throwing = { getItem: () => { throw new Error("blocked"); } };
  for (const s of [null, throwing, store("{not json"), store('{"version":0}')]) {
    assert.equal(savedEstimate(viewData(), s).mode, "average");
  }
});

test("saved mortgage answers: personal lines, owners' yardstick, no yardstick line", () => {
  const answers = { ...emptyAnswers(), answered: { home: "mortgage" } };
  const e = savedEstimate(viewData(), store(serializeAnswers(answers)));
  assert.equal(e.mode, "personal");
  assert.equal(e.model.title, "Your costs vs. August 2025");
  assert.match(e.model.ratesLine, /Prices other than housing rose 3\.6%\.$/);
  assert.ok(e.rows.some((r) => r.id === "mortgage"));
  assert.ok(!e.rows.some((r) => r.id === "exShelter"));
});

test("a stale basket gives null rows, and the model says so", () => {
  const e = savedEstimate(viewData({ basket: { stale: true } }), store(null));
  assert.equal(e.rows, null);
  assert.equal(e.model.answer, "Average household figures are not available right now.");
});
```

Create `src/tabs/workbook.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import * as catalog from "../data/catalog.js";
import { buildWorkbook, toBook, workbookFileName, estimateRows, SHEET_NAMES, ESTIMATE_HEADER } from "./workbook.js";
import { estimateFor } from "./estimate.js";
import { emptyAnswers } from "../calculator/model.js";
import { viewData } from "./testdata.mjs";

const data = viewData();
const mortgage = estimateFor({ ...emptyAnswers(), answered: { home: "mortgage" } }, data);

/** Line rows of the estimate sheet: between the header and the blank row before Total. */
function lineRows(rows) {
  const start = rows.findIndex((r) => r[0] === "Line") + 1;
  const end = rows.findIndex((r, i) => i > start && r.length === 0);
  return rows.slice(start, end);
}

test("file name carries the price month", () => {
  assert.equal(workbookFileName(data), "inflation-reality-2026-08.xlsx");
  assert.equal(workbookFileName(viewData({ referenceMonth: "" })), "inflation-reality-data.xlsx");
});

test("estimate sheet: the panel's lines, shown dollars add up to the panel's total", () => {
  const rows = estimateRows(mortgage, data);
  assert.deepEqual(rows.find((r) => r[0] === "Line"), ESTIMATE_HEADER);
  assert.ok(rows.some((r) => r[0] === mortgage.model.answer));
  const lines = lineRows(rows).filter((r) => r[6] !== "");
  assert.equal(lines.reduce((s, r) => s + r[6], 0), mortgage.model.total);
  const pay = lines.find((r) => r[0] === "Mortgage payment");
  assert.equal(pay[3], 0);
  assert.equal(pay[5], 0);
  const total = rows.find((r) => r[0] === "Total");
  assert.equal(total[6], mortgage.model.total);
});

test("estimate sheet: the yardstick is never a line; unfilled renewals say why they are left out", () => {
  const rows = estimateRows(mortgage, data);
  assert.ok(!rows.some((r) => r[0] === "Prices other than housing"));
  const ins = rows.find((r) => r[0] === "Home insurance");
  assert.equal(ins[7], "Not counted until you add your renewal increase");
  assert.equal(ins[3], "");
});

test("estimate sheet: all amounts 0 still writes a sheet with a 0 total", () => {
  const zero = estimateFor({
    ...emptyAnswers(),
    answered: { home: "rent" },
    amounts: Object.fromEntries(mortgage.rows.map((r) => [r.id, 0]).concat([["rent", 0], ["rest", 0], ["health", 0]])),
  }, data);
  const rows = estimateRows(zero, data);
  assert.ok(rows.some((r) => r[0] === "Enter your monthly amounts to see your estimate."));
  const total = rows.find((r) => r[0] === "Total");
  assert.equal(total[6], 0);
});

test("estimate sheet: no usable basket writes the message and no line table", () => {
  const bare = viewData({ basket: { stale: true } });
  const rows = estimateRows(estimateFor(emptyAnswers(), bare), bare);
  assert.ok(rows.some((r) => r[0] === "Average household figures are not available right now."));
  assert.ok(!rows.some((r) => r[0] === "Line"));
});

test("every sheet is present, and no cell breaks the voice guide or says NaN", () => {
  const sheets = buildWorkbook({ catalog, data, estimate: mortgage });
  assert.deepEqual(sheets.map((s) => s.name), SHEET_NAMES);
  for (const s of sheets) {
    for (const row of s.rows) {
      for (const cell of row) {
        if (typeof cell === "number") assert.ok(Number.isFinite(cell), `${s.name}: ${cell}`);
        else for (const banned of ["—", "·", "→", "!", "NaN", "undefined"]) {
          assert.ok(!String(cell).includes(banned), `${s.name}: ${JSON.stringify(banned)} in ${cell}`);
        }
      }
    }
  }
});

test("round trip through the real xlsx package", () => {
  const book = toBook(XLSX, buildWorkbook({ catalog, data, estimate: mortgage }));
  const back = XLSX.read(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  assert.deepEqual(back.SheetNames, SHEET_NAMES);
  const prices = XLSX.utils.sheet_to_json(back.Sheets["Price changes"], { header: 1 });
  assert.ok(prices.some((r) => r[2] === "CUUR0000SA0L2" && r[0] === "What we compare you with"));
  assert.ok(!prices.some((r) => r[2] === "CUUR0000SA0L2" && r[0] === "Your costs lines"));
  const trend = XLSX.utils.sheet_to_json(back.Sheets["Monthly trend"], { header: 1 });
  assert.ok(trend.some((r) => r[0] === "October 2025" && r[2] === "Not published"));
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test src/tabs/estimate.test.mjs src/tabs/workbook.test.mjs`
Expected: FAIL, `Cannot find module '.../src/tabs/estimate.js'` (and `workbook.js`).

- [ ] **Step 3: Implement** `src/tabs/estimate.js`:

```js
// The estimate the Your costs panel shows, rebuilt outside that tab so the Sources
// download can write "the panel's lines" (spec "Front-end architecture"). Pure apart
// from reading the storage object it is given.

import { BASKET } from "../data/catalog.js";
import { emptyAnswers, isPersonal, personalRows, averageRows } from "../calculator/model.js";
import { panelModel } from "../calculator/panel.js";
import { loadAnswers } from "../calculator/storage.js";

/** Same inputs and outputs as the panel on Your costs: { mode, rows, model }. */
export function estimateFor(answers, data) {
  const personal = isPersonal(answers);
  const mode = personal ? "personal" : "average";
  const rows = personal ? personalRows(answers, data) : averageRows(data, BASKET.ceMonthlyMean);
  const model = panelModel({
    mode,
    rows,
    headlinePct: data.headline.yoy,
    exShelterPct: data.lines.exShelter?.yoy ?? null,
    referenceMonth: data.referenceMonth,
    answers,
  });
  return { mode, rows, model };
}

/**
 * The saved answers' estimate, or the average household when nothing usable is
 * saved (no storage, blocked storage, unparseable or old data). Never throws.
 */
export function savedEstimate(data, storage) {
  return estimateFor(loadAnswers(storage) ?? emptyAnswers(), data);
}
```

- [ ] **Step 4: Implement** `src/tabs/workbook.js`:

```js
// The .xlsx download as plain data: one { name, rows, cols } per sheet, rows as
// arrays of cells. Pure, so the contents are unit-tested without a browser;
// toBook() turns the sheets into a workbook with whichever xlsx module it is given.

import { computeResult } from "../calculator/model.js";
import { monthLabel } from "../calculator/format.js";
import { METHOD, CAVEATS, NO_SERIES_LINES, SOURCE_LINKS, seriesGroups } from "./sources.js";
import { pctChange } from "./prices.js";
import { trendMonth } from "./national.js";

export const SHEET_NAMES = ["Your estimate", "Price changes", "Average prices", "Monthly trend", "How it works"];

export const ESTIMATE_HEADER = [
  "Line", "Monthly amount ($)", "Yearly amount ($)", "Price change over 12 months (%)",
  "Cost a year ago ($)", "Extra this year ($)", "Extra shown on the site ($)", "Note",
];

const r2 = (n) => (n == null ? "" : Math.round(n * 100) / 100);

/** "inflation-reality-2026-08.xlsx" ("-data" when the month is missing). */
export function workbookFileName(data) {
  const month = /^\d{4}-\d{2}$/.test(data.referenceMonth ?? "") ? data.referenceMonth : "data";
  return `inflation-reality-${month}.xlsx`;
}

/** The panel's lines with the math behind them; "Extra shown" is the rounded panel amount. */
export function estimateRows(estimate, data) {
  const { mode, rows, model } = estimate;
  const out = [
    ["Inflation Reality: your estimate"],
    ["Prices for", monthLabel(data.referenceMonth)],
    ["What this shows", mode === "personal"
      ? "Your answers, saved in this browser"
      : "The average U.S. household (no answers are saved in this browser)"],
    [],
    [model.title],
    [model.answer],
  ];
  for (const s of [model.ratesLine, model.verdict, model.basis]) if (s) out.push([s]);
  if (rows == null) return out;

  const result = computeResult(rows);
  const shown = new Map([...model.main, ...(model.rest ? [model.rest] : [])].map((r) => [r.id, r.dollars]));
  out.push([], ESTIMATE_HEADER);
  for (const l of result.lines) {
    out.push([l.label, r2(l.monthly), r2(l.annual), l.rate, r2(l.yearAgo), r2(l.extra), shown.get(l.id) ?? 0, l.note ?? ""]);
  }
  for (const x of result.excluded) {
    out.push([
      x.label, r2(x.monthly), r2(12 * x.monthly), "", "", "", "",
      x.missing === "renewal" ? "Not counted until you add your renewal increase" : "Not counted: no recent price data",
    ]);
  }
  const monthly = result.lines.reduce((s, l) => s + l.monthly, 0);
  out.push(
    [],
    ["Total", r2(monthly), r2(result.totalAnnual), result.rate ?? "", r2(result.totalYearAgo), r2(result.totalExtra), model.total ?? 0, ""],
    [],
    ["Cost a year ago = yearly amount / (1 + price change / 100)"],
    ["Extra this year = yearly amount minus cost a year ago"],
    ["The site rounds the total to the nearest $50 and each line to the nearest $10, so the rounded lines add up to the rounded total."],
  );
  return out;
}

function priceChangeRows(catalog, data) {
  const out = [
    ["Every series on the site"],
    ["FRED series can be checked at fred.stlouisfed.org. BLS series can be checked at data.bls.gov."],
    [],
    ["Group", "Name", "Series", "Source", "Change over 12 months (%)", "Link"],
  ];
  for (const g of seriesGroups(catalog, data)) {
    for (const r of g.rows) out.push([g.title, r.name, r.seriesId, r.source, r.yoy ?? "", r.url]);
  }
  out.push([], ["Lines without their own series"], ["Line", "How its rate is set"]);
  for (const l of NO_SERIES_LINES) out.push([l.name, l.how]);
  return out;
}

function averagePriceRows(data) {
  const out = [
    [`Average prices, ${data.referenceMonthLabel} and a year earlier`],
    [],
    ["Group", "Item", "Unit", "Series", "Price now ($)", "Price a year ago ($)", "Change (%)", "Link"],
  ];
  for (const p of data.avgPrices) {
    const c = pctChange(p.current, p.yearAgo);
    out.push([p.category, p.item, p.unit, p.seriesId, p.current ?? "", p.yearAgo ?? "", r2(c), `https://fred.stlouisfed.org/series/${p.seriesId}`]);
  }
  out.push(
    [],
    ["Weekly fuel prices, Energy Information Administration"],
    ["Item", "Unit", "Series", "Week ending", "Price now ($)", "Price a year ago ($)", "Change (%)", "Link"],
  );
  for (const w of data.weeklyPrices) {
    const c = pctChange(w.current, w.yearAgo);
    out.push([w.label, w.unit, w.seriesId, w.asOfLabel, w.current ?? "", w.yearAgo ?? "", r2(c), `https://fred.stlouisfed.org/series/${w.seriesId}`]);
  }
  return out;
}

function trendRows(data) {
  const out = [["Prices overall: change over 12 months, by month"], [], ["Month", "Change over 12 months (%)", "Note"]];
  for (const d of data.trend) out.push([trendMonth(d.month).long, d.headline ?? "", d.headline == null ? "Not published" : ""]);
  return out;
}

function howRows() {
  const out = [["How the estimate is worked out"], []];
  for (const s of METHOD) {
    out.push([s.heading]);
    for (const p of s.paragraphs) out.push([p]);
    out.push([]);
  }
  out.push(["Things to keep in mind"]);
  for (const c of CAVEATS) out.push([c]);
  out.push([], ["Sources"]);
  for (const l of SOURCE_LINKS) out.push([l.text, l.url]);
  return out;
}

/** Every sheet, in SHEET_NAMES order. estimate = savedEstimate() output. */
export function buildWorkbook({ catalog, data, estimate }) {
  return [
    { name: SHEET_NAMES[0], rows: estimateRows(estimate, data), cols: [28, 16, 16, 18, 16, 16, 18, 44] },
    { name: SHEET_NAMES[1], rows: priceChangeRows(catalog, data), cols: [24, 48, 24, 8, 16, 52] },
    { name: SHEET_NAMES[2], rows: averagePriceRows(data), cols: [14, 26, 10, 18, 14, 16, 12, 48] },
    { name: SHEET_NAMES[3], rows: trendRows(data), cols: [18, 24, 16] },
    { name: SHEET_NAMES[4], rows: howRows(), cols: [110, 60] },
  ];
}

/** Sheets → workbook object with the given xlsx module (the page loads it on demand). */
export function toBook(XLSX, sheets) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    ws["!cols"] = s.cols.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  return wb;
}
```

- [ ] **Step 5: Implement** `src/tabs/download.js`. It has no unit test because it only saves a file in a browser. The audit downloads it in Task 12.

```js
// Saves the spreadsheet. xlsx is large and only needed here, so it is loaded on
// demand (its own chunk) rather than in the main bundle.

import { buildWorkbook, toBook, workbookFileName } from "./workbook.js";

export async function downloadWorkbook({ catalog, data, estimate }) {
  const XLSX = await import("xlsx");
  XLSX.writeFile(toBook(XLSX, buildWorkbook({ catalog, data, estimate })), workbookFileName(data));
}
```

- [ ] **Step 6: Run them and watch them pass**

Run: `node --test src/tabs/estimate.test.mjs src/tabs/workbook.test.mjs && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: 11 pass; full suite `pass 176`, `fail 0`. The round-trip test uses the real `xlsx` package from `node_modules`, so `npm ci` must have run.

- [ ] **Step 7: Commit**

```bash
git add src/tabs/estimate.js src/tabs/estimate.test.mjs src/tabs/workbook.js src/tabs/workbook.test.mjs src/tabs/download.js
git commit -m "feat(tabs): spreadsheet built from the saved estimate and every series"
```

---

### Task 9: Sources view and the download button

**Files:**
- Create: `src/views/Sources.jsx`
- Modify: `src/App.jsx`, `src/styles/tabs.css`

**Interfaces:**
- Consumes: `seriesGroups`, `METHOD`, `CAVEATS`, `NO_SERIES_LINES`, `SOURCE_LINKS` (Task 7); `savedEstimate` (Task 8); `downloadWorkbook` (Task 8); `getStorage` (storage.js).
- Produces: a table per group with `aria-labelledby="series-<group id>"`, the button "Download the spreadsheet (.xlsx)", and a `role="status"` paragraph `.status`. The audit (Task 12) relies on all three.

- [ ] **Step 1: Create** `src/views/Sources.jsx`:

```jsx
import { useMemo, useState } from "react";
import * as catalog from "../data/catalog.js";
import { METHOD, CAVEATS, NO_SERIES_LINES, SOURCE_LINKS, seriesGroups } from "../tabs/sources.js";
import { savedEstimate } from "../tabs/estimate.js";
import { downloadWorkbook } from "../tabs/download.js";
import { getStorage } from "../calculator/storage.js";

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" };

/** The Sources tab (spec "Other tabs"): method, every series with a link, caveats, the download. */
export default function Sources({ data }) {
  const groups = useMemo(() => seriesGroups(catalog, data), [data]);
  const [status, setStatus] = useState("");

  // Read the saved answers at click time, so the file matches what Your costs shows now.
  const download = async () => {
    setStatus("Preparing the spreadsheet.");
    try {
      await downloadWorkbook({ catalog, data, estimate: savedEstimate(data, getStorage()) });
      setStatus("Spreadsheet downloaded.");
    } catch (err) {
      console.warn("Spreadsheet download failed:", err);
      setStatus("The download did not work. Please try again.");
    }
  };

  return (
    <article className="tab" aria-labelledby="page-title">
      <header className="tab-intro">
        <h1 id="page-title" tabIndex={-1}>Sources</h1>
        <p className="lede">
          Every number on this site comes from public government data. This page shows how the estimate is worked out and where each number comes from.
        </p>
      </header>

      <section aria-labelledby="method-title">
        <h2 id="method-title">How your estimate is worked out</h2>
        {METHOD.map((s) => (
          <div key={s.heading}>
            <h3>{s.heading}</h3>
            {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
          </div>
        ))}
      </section>

      <section aria-labelledby="series-title">
        <h2 id="series-title">Where each number comes from</h2>
        <p>Each series links to its page at FRED or the Bureau of Labor Statistics (BLS), where you can download the same numbers.</p>
        {groups.map((g) => (
          <div key={g.id}>
            <h3 id={`series-${g.id}`}>{g.title}</h3>
            <table className="data-table series-table" aria-labelledby={`series-${g.id}`}>
              <colgroup><col style={{ width: "46%" }} /><col style={{ width: "36%" }} /><col style={{ width: "18%" }} /></colgroup>
              <thead>
                <tr><th scope="col">Name</th><th scope="col">Series</th><th scope="col">From</th></tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={`${g.id}-${r.seriesId}-${r.name}`}>
                    <th scope="row">{r.name}</th>
                    <td><a href={r.url} {...EXTERNAL}>{r.seriesId}</a></td>
                    <td>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <h3>Lines without their own series</h3>
        <table className="data-table">
          <colgroup><col style={{ width: "40%" }} /><col style={{ width: "60%" }} /></colgroup>
          <thead><tr><th scope="col">Line</th><th scope="col">How its rate is set</th></tr></thead>
          <tbody>
            {NO_SERIES_LINES.map((l) => (
              <tr key={l.name}><th scope="row">{l.name}</th><td>{l.how}</td></tr>
            ))}
          </tbody>
        </table>
        <h3>Background</h3>
        <ul className="link-list">
          {SOURCE_LINKS.map((l) => (
            <li key={l.url}><a href={l.url} {...EXTERNAL}>{l.text}</a></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="caveats-title">
        <h2 id="caveats-title">Things to keep in mind</h2>
        <ul className="plain-list">
          {CAVEATS.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </section>

      <section aria-labelledby="download-title">
        <h2 id="download-title">Download the data</h2>
        <p>
          Get every number on this site in a spreadsheet, with a link to check each one. It includes your estimate as Your costs shows it. Your answers stay in this browser.
        </p>
        <button type="button" className="btn" onClick={download}>Download the spreadsheet (.xlsx)</button>
        <p className="status" role="status">{status}</p>
      </section>
    </article>
  );
}
```

- [ ] **Step 2: Append** to `src/styles/tabs.css`:

```css
.link-list,
.plain-list { margin: 0; padding-left: 20px; }
.link-list li,
.plain-list li { margin-bottom: 8px; max-width: 36em; }
.tab .btn { margin-top: 4px; }
.series-table td { font-size: 15px; }
.series-table td:last-child { overflow-wrap: normal; }
```

- [ ] **Step 3: Wire the route**. In `src/App.jsx`, after the `PriceCheck` import add `import Sources from "./views/Sources.jsx";`. After the line `          : route === "price-check" ? <PriceCheck data={data} />` add:

```jsx
          : route === "sources" ? <Sources data={data} />
```

The `LegacyDashboard` fallback line is now unreachable. Task 10 removes it.

- [ ] **Step 4: Run tests, build, and check the download in a browser**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built|error"`
Expected: `pass 176`, `fail 0`, `✓ built`, and a separate `xlsx-*.js` chunk in the build output.

With `npx vite preview --port 4719 --strictPort` running, run `python3 <scratchpad>/tab-check.py sources` (expected: as in Task 4). Then save and run this download check from the scratchpad:

```python
"""Sources download check: answer Mortgage, open Sources, download, read the sheet names."""
import zipfile, re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":390,"height":844})
    pg.goto("http://localhost:4719/inflation-reality/"); pg.wait_for_timeout(600)
    pg.get_by_role("button", name=re.compile("^Mortgage")).click(); pg.wait_for_timeout(200)
    pg.get_by_role("link", name="Sources").click(); pg.wait_for_timeout(400)
    print("focus", pg.evaluate("document.activeElement.id"), pg.title())
    with pg.expect_download() as dl:
        pg.get_by_role("button", name="Download the spreadsheet (.xlsx)").click()
    d = dl.value; print(d.suggested_filename); path = d.path()
    z = zipfile.ZipFile(path); print(re.findall(r'<sheet name="([^"]+)"', z.read("xl/workbook.xml").decode()))
    print("Mortgage payment" in z.read("xl/worksheets/sheet1.xml").decode())
    print(pg.locator(".status").inner_text())
    b.close()
```

Expected: `focus page-title Sources | Inflation Reality`, `inflation-reality-2026-08.xlsx` (the month follows the fallback data), the five sheet names, `True`, `Spreadsheet downloaded.`. `xlsx` writes inline strings, so there is no `sharedStrings.xml`; read the sheet XML instead. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/views/Sources.jsx src/App.jsx src/styles/tabs.css
git commit -m "feat(sources): new Sources tab with every series and the spreadsheet download"
```

---

### Task 10: Delete the old dashboard

**Files:**
- Delete: `src/views/LegacyDashboard.jsx`
- Modify: `src/App.jsx`, `src/styles/tokens.test.mjs`
- Create: `src/shell.test.mjs`

**Interfaces:**
- Produces: App renders exactly four views. No file under `src/` mentions `LegacyDashboard`.

- [ ] **Step 1: Write the failing test** `src/shell.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { ROUTES } from "./routes.js";

const here = dirname(fileURLToPath(import.meta.url));

test("the old dashboard is gone and nothing imports it", () => {
  assert.ok(!existsSync(resolve(here, "views/LegacyDashboard.jsx")));
  const files = [resolve(here, "App.jsx"), resolve(here, "main.jsx")];
  for (const dir of ["views", "components"]) {
    for (const f of readdirSync(join(here, dir))) files.push(join(here, dir, f));
  }
  for (const f of files) assert.ok(!readFileSync(f, "utf8").includes("LegacyDashboard"), f);
});

test("every route has a view with a focusable #page-title heading", () => {
  const app = readFileSync(resolve(here, "App.jsx"), "utf8");
  const views = { "your-costs": "YourCostsIntro", "national-numbers": "NationalNumbers", "price-check": "PriceCheck", sources: "Sources" };
  assert.deepEqual(Object.keys(views), ROUTES.map((r) => r.id));
  for (const [id, view] of Object.entries(views)) {
    if (id !== "your-costs") assert.ok(app.includes(`<${view} `), `App renders ${view}`);
    const jsx = readFileSync(resolve(here, "views", `${view}.jsx`), "utf8");
    assert.match(jsx, /<h1 id="page-title" tabIndex=\{-1\}>/, `${view} heading`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test src/shell.test.mjs`
Expected: FAIL, `the old dashboard is gone…` (the file still exists and App imports it).

- [ ] **Step 3: Remove it**

```bash
git rm src/views/LegacyDashboard.jsx
```

In `src/App.jsx`, delete the line `import LegacyDashboard from "./views/LegacyDashboard.jsx";` and delete these lines (the blank line above them included):

```js
// Until Phase 2b rebuilds them, the other sections render the old dashboard's views.
const LEGACY_VIEW = { sources: "methodology" };
```

Replace the last two lines of the `<main>` body:

```jsx
          : route === "sources" ? <Sources data={data} />
          : <LegacyDashboard dynamic={dynamic} view={LEGACY_VIEW[route]} />}
```

with:

```jsx
          : <Sources data={data} />}
```

`routeFromHash` only ever returns the four route ids, so Sources is the last case. The `<main>` body is now:

```jsx
      <main>
        {route === "your-costs" ? <YourCosts data={data} base={BASE} onNavigate={navigate} />
          : route === "national-numbers" ? <NationalNumbers data={data} />
          : route === "price-check" ? <PriceCheck data={data} />
          : <Sources data={data} />}
      </main>
```

- [ ] **Step 4: Drop the scan exception.** In `src/styles/tokens.test.mjs`, replace

```js
  // Every view except the old dashboard, which Task 10 deletes (and drops this exception).
  for (const f of readdirSync(join(src, "views"))) {
    if (/\.(jsx|js)$/.test(f) && f !== "LegacyDashboard.jsx") files.push(join(src, "views", f));
  }
```

with

```js
  for (const f of readdirSync(join(src, "views"))) {
    if (/\.(jsx|js)$/.test(f)) files.push(join(src, "views", f));
  }
```

- [ ] **Step 5: Run everything**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built|error" && grep -rn "LegacyDashboard\|JetBrains\|Source Serif" src index.html`
Expected: `pass 178`, `fail 0`, `✓ built`, and no grep output. `data.categories` now has no reader in a view. That is expected, see Decision 8.

- [ ] **Step 6: Commit**

```bash
git add -A src/views/LegacyDashboard.jsx src/App.jsx src/styles/tokens.test.mjs src/shell.test.mjs
git commit -m "refactor: delete the legacy dashboard; every tab is rebuilt"
```

---

### Task 11: Link previews and the og image

**Files:**
- Modify: `index.html`
- Create: `scripts/og/og-image.html`, `scripts/og/render-og.py`, `scripts/og/link-preview.test.mjs`, `public/og-image.png` (generated)

**Interfaces:**
- Produces: the spec's Open Graph and Twitter tags, plus a 1200×630 `og-image.png` that Vite copies to `dist/` and the live site serves at `/inflation-reality/og-image.png`.

- [ ] **Step 1: Write the failing test** `scripts/og/link-preview.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const meta = (attr, key) => new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];
const DESCRIPTION = "See how much prices rose for a household like yours, in dollars, using government price data.";

// Spec "Front-end architecture", Link previews.
test("index.html carries the spec's link preview tags", () => {
  assert.match(html, /<title>Inflation Reality<\/title>/);
  assert.equal(meta("name", "description"), DESCRIPTION);
  assert.equal(meta("property", "og:site_name"), "Inflation Reality");
  assert.equal(meta("property", "og:title"), "How much more are you paying than a year ago?");
  assert.equal(meta("property", "og:description"), DESCRIPTION);
  assert.equal(meta("property", "og:url"), "https://derektm17.github.io/inflation-reality/");
  assert.equal(meta("property", "og:image"), "https://derektm17.github.io/inflation-reality/og-image.png");
  assert.equal(meta("property", "og:image:width"), "1200");
  assert.equal(meta("property", "og:image:height"), "630");
  assert.ok(meta("property", "og:image:alt"));
  assert.equal(meta("name", "twitter:card"), "summary_large_image");
});

test("public/og-image.png is a 1200x630 PNG small enough for every preview service", () => {
  const png = readFileSync(resolve(root, "public/og-image.png"));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 1_000_000, `${png.length} bytes`);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test scripts/og/link-preview.test.mjs`
Expected: FAIL. `description` is undefined, and `public/og-image.png` is missing (ENOENT).

- [ ] **Step 3: Add the tags.** In `index.html`, replace `    <title>Inflation Reality</title>` with:

```html
    <title>Inflation Reality</title>
    <meta name="description" content="See how much prices rose for a household like yours, in dollars, using government price data." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Inflation Reality" />
    <meta property="og:title" content="How much more are you paying than a year ago?" />
    <meta property="og:description" content="See how much prices rose for a household like yours, in dollars, using government price data." />
    <meta property="og:url" content="https://derektm17.github.io/inflation-reality/" />
    <meta property="og:image" content="https://derektm17.github.io/inflation-reality/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Inflation Reality. How much more are you paying than a year ago?" />
    <meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 4: Create the image source** `scripts/og/og-image.html`. Its colors are the light tokens, copied; this file is outside `src/`, so the token scan does not apply.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<!-- Source for public/og-image.png (1200x630). Render with scripts/og/render-og.py.
     Colors are the light tokens from src/styles/tokens.css; no numbers, so the image never goes stale. -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400..800&display=block" />
<style>
  html, body { margin: 0; width: 1200px; height: 630px; }
  body {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 72px 88px;
    background: #F3F5F4;
    color: #1F2933;
    font-family: "Libre Franklin", "Franklin Gothic Medium", "Helvetica Neue", Arial, sans-serif;
  }
  .site { font-weight: 800; font-size: 40px; letter-spacing: -0.01em; }
  h1 { margin: 0; max-width: 15em; font-weight: 800; font-size: 82px; line-height: 1.04; letter-spacing: -0.02em; }
  .mark { width: 120px; height: 10px; margin-bottom: 28px; background: #2E5E45; border-radius: 2px; }
  p { margin: 0; font-size: 34px; color: #56626E; }
</style>
</head>
<body>
  <div class="site">Inflation Reality</div>
  <div>
    <div class="mark"></div>
    <h1>How much more are you paying than a year ago?</h1>
  </div>
  <p>See it in dollars, for a household like yours.</p>
</body>
</html>
```

Create `scripts/og/render-og.py`:

```python
#!/usr/bin/env python3
"""Render scripts/og/og-image.html to public/og-image.png (1200x630) for link previews.

Run from anywhere: python3 scripts/og/render-og.py
Needs Python Playwright and network access for the Libre Franklin font. Uses its own
browser (the Playwright MCP browser is shared with other sessions).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "public" / "og-image.png"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    page.goto((HERE / "og-image.html").as_uri())
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready.then(() => true)")
    if not page.evaluate("document.fonts.check('800 82px \"Libre Franklin\"')"):
        raise SystemExit("Libre Franklin did not load; check the network and run again.")
    OUT.parent.mkdir(exist_ok=True)
    page.screenshot(path=str(OUT))
    browser.close()
print(f"wrote {OUT}")
```

- [ ] **Step 5: Render it and look at it**

Run: `python3 scripts/og/render-og.py`
Expected: `wrote …/public/og-image.png`, about 40 kB. Open it and confirm three things. "Inflation Reality" is at the top left. The headline is in heavy Libre Franklin under a short green bar. "See it in dollars, for a household like yours." is at the bottom. There are no numbers.

- [ ] **Step 6: Run tests and build**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && npx vite build 2>&1 | grep -E "built|error" && ls dist/og-image.png`
Expected: `pass 180`, `fail 0`, `✓ built`, `dist/og-image.png`.

- [ ] **Step 7: Commit** (only the PNG from `public/`)

```bash
git add index.html scripts/og/og-image.html scripts/og/render-og.py scripts/og/link-preview.test.mjs public/og-image.png
git status --short public   # must not list cpi.json
git commit -m "feat: link previews with an og image"
```

---

### Task 12: The committed UI audit (`scripts/audit/ui-audit.py`)

**Files:**
- Create: `scripts/audit/fixture-cpi.json`, `scripts/audit/ui-audit.py`
- Modify: `package.json` (an `audit:ui` script)

**Interfaces:**
- Consumes: every selector the views render: `#page-title`, `.result h2`, `.answer`, `.rates`, `.verdict`, `.basis`, `.lines .line(.line-rate|.line-amt)`, `#result-lines`, `.opt.guess`, `.help`, `.prompts`, `.lede`, `.summary p`, `.toast`, `input[id^='amount-']`, `.stat`, `.trend-chart svg`, `.bar-list .bar-row`, `.data-table`, `.fuel`, `table[aria-labelledby='series-…']`, `.status`, `.result-col`.
- Produces: `python3 scripts/audit/ui-audit.py [--base-url URL] [--live-data] [--seed N] [--rounds N]`. It exits 0 when every check passes and 1 otherwise. It prints `ok:` / `FAIL:` per check and the random seed.

- [ ] **Step 1: Create the fixture** from the bundled fallback, with one measure marked stale so the stale note is exercised:

```bash
python3 - <<'EOF'
import json
d = json.load(open("src/data/fallback.json"))
d["altMeasures"]["medianCpi"]["stale"] = True
json.dump(d, open("scripts/audit/fixture-cpi.json", "w"), indent=2)
open("scripts/audit/fixture-cpi.json", "a").write("\n")
EOF
```

The fixture has falling lines (car insurance, bus and train fares) and a trend gap, which the flows rely on. Refresh it only on purpose. When `fallback.json` is refreshed, re-run this step so the fixture matches.

- [ ] **Step 2: Create** `scripts/audit/ui-audit.py`:

```python
#!/usr/bin/env python3
"""UI audit for Inflation Reality (spec "Testing": the Phase 2 audit).

Runs the user flows and the automatable Design rules (1, 2, 4, 5, 8) on every tab,
in light and dark themes, at 390px and 1280px, plus a random-amounts probe of the
Your costs panel (amounts include 0 and tiny values, which default amounts never hit).

Local, against the built site (the default base URL):
    npm run build && npx vite preview --port 4719 --strictPort     # in another shell
    python3 scripts/audit/ui-audit.py
Live site, with the real cpi.json (the merge gate's "production data live" run):
    python3 scripts/audit/ui-audit.py --base-url https://derektm17.github.io/inflation-reality/ --live-data

By default cpi.json is answered with scripts/audit/fixture-cpi.json, so results don't
move with each month's data. Google Fonts requests are stubbed either way. The page
runs on Playwright's fake clock so the Undo toast's 8-second timer can be tested.
Uses its own browser: the Playwright MCP browser is shared with other sessions.
Every check runs; the exit code is 1 if any failed.
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
BANNED = ["—", "·", "→", "!", "Welcome back", "Here's", "Let's", "simply", "repriced", "reimagined"]
BANNED_YOUR_COSTS = ["CPI", "YoY", "relative importance"]
SHEETS = ["Your estimate", "Price changes", "Average prices", "Monthly trend", "How it works"]
MINUS = "−"

failures = []


def check(cond, msg):
    print(("ok:   " if cond else "FAIL: ") + msg)
    if not cond:
        failures.append(msg)


# Design rules 1, 2, 4 (emoji, code), 5, plus radius-by-role and dark-mode surfaces.
# Returns a list of problems; empty means the view passes.
RULES_JS = r"""
(dark) => {
  const problems = [];
  const seen = new Set();
  const note = (msg) => { if (!seen.has(msg) && seen.size < 40) { seen.add(msg); problems.push(msg); } };
  const visible = (el, cs) => cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0;
  const name = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "");
  const families = new Set();
  const radii = new Set(["0px", "2px", "6px", "8px", "10px"]);
  const lum = (rgb) => {
    const m = rgb.match(/[\d.]+/g); if (!m) return 0;
    const [r, g, b] = m.slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const transparent = (c) => c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
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
    const bordered = ["Top", "Right", "Bottom", "Left"].every((s) => parseFloat(cs[`border${s}Width`]) > 0);
    if (cs.position !== "fixed" && bordered && !transparent(cs.backgroundColor) && parseFloat(cs.borderTopLeftRadius) >= 8) raised += 1;
    if (dark && !transparent(cs.backgroundColor) && lum(cs.backgroundColor) > 0.4
        && !el.closest(".bar-track, .dock, .toast, [aria-pressed='true'], .check")) {
      note(`dark: light background ${cs.backgroundColor} on ${name(el)}`);
    }
  }
  if (families.size > 2) note(`rule 1: ${families.size} font families: ${[...families].join(", ")}`);
  if (raised > 1) note(`rule 5: ${raised} raised surfaces`);
  if (document.querySelector("code, pre, kbd, samp")) note("rule 1: a code element is rendered");
  const text = document.body.innerText;
  if (/\p{Extended_Pictographic}|️/u.test(text)) note("rule 4: emoji in rendered text");
  if (/NaN|Infinity|undefined|\[object Object\]/.test(text)) note("broken value (NaN, Infinity, undefined) in rendered text");
  if (document.documentElement.scrollWidth > window.innerWidth) note("horizontal scroll");
  return problems;
}
"""


def dollars(text):
    """'+$1,450' -> 1450, '−$40' -> -40, 'under $10' -> 0."""
    t = text.strip()
    if t in ("", "under $10", "$0"):
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


def new_page(browser, args, width, theme):
    context = browser.new_context(viewport={"width": width, "height": 900}, color_scheme=theme, accept_downloads=True)
    page = context.new_page()
    page.clock.install()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
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
    text = page.locator("main").inner_text()
    banned = BANNED + (BANNED_YOUR_COSTS if your_costs else [])
    found = [b for b in banned if b in text]
    check(found == [], f"{where}: voice guide banned strings {found}")


def panel_sum_ok(page, where):
    """Rendered line amounts (top rows, smaller items, Everything else) add up to the answer."""
    total = answer_total(page.locator(".answer").inner_text())
    if total is None:
        check(page.locator(".answer").inner_text().startswith("Enter your monthly amounts"), f"{where}: zero-total message")
        return
    amounts = [dollars(t) for t in page.locator(".lines .line-amt").all_inner_texts()]
    check(sum(amounts) == total, f"{where}: lines add up ({sum(amounts)} vs {total})")
    flips = []
    for row in page.locator(".lines .line").all():
        rate = row.locator(".line-rate").inner_text()
        amt = row.locator(".line-amt").inner_text()
        if (rate.startswith("+") and amt.startswith(MINUS)) or (rate.startswith(MINUS) and amt.startswith("+")):
            flips.append(f"{rate} {amt}")
    check(flips == [], f"{where}: no line shows the opposite sign of its rate {flips}")


def flows(browser, args, base):
    context, page, errors = new_page(browser, args, 390, "light")
    text = lambda sel: page.locator(sel).first.inner_text()

    # Average first screen.
    go(page, base)
    check(page.title() == "Inflation Reality", "Your costs title")
    check(text(".result h2").startswith("The average U.S. household vs. "), "Average title")
    check(answer_total(text(".answer")) is not None, "Average answer")
    check(page.locator(".verdict").count() == 0 and page.locator(".compare").count() == 0, "Average has no verdict or bars")
    panel_sum_ok(page, "Average")
    rules(page, "Your costs, Average, 390 light", False, True)

    # Mortgage: 0% line, explanation, guesses, basis, owners' yardstick.
    page.get_by_role("button", name=re.compile("^Mortgage")).click()
    page.wait_for_timeout(200)
    check(page.locator(".opt.guess").count() == 3, "three guessed answers")
    check(text(".basis").startswith("Based on 1 answer and 3 guesses."), "basis wording")
    check(page.locator(".help").first.inner_text().startswith("A fixed-rate payment"), "mortgage explanation")
    check("Prices other than housing" in text(".rates"), "owners compared with prices other than housing")
    check("prices other than housing" in text(".verdict") or text(".verdict").startswith("About the same as prices other than housing"),
          "owner verdict names the yardstick")
    show_all = page.get_by_role("button", name=re.compile(r"^Show all \d+ items$"))
    if show_all.count():
        check(show_all.get_attribute("aria-controls") == "result-lines" and page.locator("#result-lines").count() == 1,
              "Show all has aria-controls")
        show_all.click()
        page.wait_for_timeout(150)
    mortgage_row = page.locator(".line", has_text="Mortgage payment")
    check(mortgage_row.locator(".line-rate").inner_text() == "0%", "mortgage line is 0%")

    # Daycare checkbox adds a line.
    page.get_by_label("Daycare").check()
    page.wait_for_timeout(200)
    check(page.locator(".line", has_text="Daycare").count() == 1, "daycare line appears")

    # A falling price renders as −$ (bus and train fares fall in the fixture).
    page.get_by_role("button", name=re.compile("^No car")).click()
    page.wait_for_timeout(200)
    more = page.get_by_role("button", name=re.compile(r"^Show all \d+ items$"))
    if more.count():
        more.click()
        page.wait_for_timeout(150)
    if not args.live_data:
        fares = page.locator(".line", has_text="Bus and train fares").locator(".line-amt").inner_text()
        check(fares.startswith(MINUS + "$"), f"a falling price shows {MINUS}$ ({fares})")
    panel_sum_ok(page, "Personal, defaults")
    rules(page, "Your costs, Personal, 390 light", False, True)

    # Renewal prompt focuses its input.
    page.get_by_role("button", name="Home insurance: add your renewal increase").click()
    page.wait_for_timeout(300)
    check(page.evaluate("document.activeElement.id") == "renewal-homeIns", "prompt focuses the renewal box")
    page.keyboard.type("8")
    page.wait_for_timeout(200)
    check(page.locator(".prompts").count() == 0, "prompt row leaves once a rate is typed")

    # Random amounts, including 0 and tiny values: totals add up, no sign flips, no NaN.
    rng = random.Random(args.seed)
    print(f"random amounts seed {args.seed}")
    choices = [0, 0, 1, 4, 5, 6, 9, 14, 15, 37, 120, 999, 2500]
    inputs = page.locator("input[id^='amount-']")
    for round_ in range(args.rounds):
        for i in range(inputs.count()):
            inputs.nth(i).fill(str(rng.choice(choices + [rng.randint(0, 6000)])))
        page.wait_for_timeout(200)
        panel_sum_ok(page, f"random amounts round {round_ + 1}")
        check("NaN" not in page.locator(".result").inner_text(), f"random amounts round {round_ + 1}: no NaN")
    for i in range(inputs.count()):
        inputs.nth(i).fill("0")
    page.wait_for_timeout(200)
    check(text(".answer") == "Enter your monthly amounts to see your estimate.", "all amounts 0: zero-total message")
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
    check(text(".result h2").startswith("The average U.S. household"), "Start over returns to Average")
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
    check(text(".result h2").startswith("Your costs vs. "), "Undo restores answers")

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
    check(page.locator(".bar-list .bar-row").count() >= 3, "National: other measures listed")
    if not args.live_data:
        check("Using the last known value for Median CPI." in page.locator("main").inner_text(), "National: stale note")
    go(page, base, "#price-check")
    check(page.locator(".data-table tbody tr th[scope=row]").count() == 21, "Price check: 21 average prices")
    check(page.locator(".bar-list .bar-row").count() == 10, "Price check: 10 biggest changes")
    check(page.locator(".fuel").count() == 2, "Price check: gas and diesel")
    go(page, base, "#sources")
    yard = page.locator("table[aria-labelledby='series-yardstick']").inner_text()
    lines = page.locator("table[aria-labelledby='series-household']").inner_text()
    check("CUUR0000SA0L2" in yard and "CUUR0000SA0L2" not in lines, "Sources: the yardstick is a source series, not a line")
    bls = page.locator("a", has_text="CUUR0000SETE").first.get_attribute("href")
    check(bls == "https://data.bls.gov/timeseries/CUUR0000SETE", "Sources: BLS series link to BLS")

    # Download: five sheets, and the estimate sheet is the saved (mortgage) household.
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
            check("Mortgage payment" in sheet1 and "Your costs vs." in sheet1, "spreadsheet has the saved estimate")
    page.wait_for_timeout(200)
    check(page.locator(".status").inner_text() == "Spreadsheet downloaded.", "download status")

    real = [e for e in errors if "cpi.json" not in e]
    check(real == [], f"no console errors in the flows {real}")
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
            if width == 1280:
                go(page, base)
                check(page.evaluate("getComputedStyle(document.querySelector('.result-col')).position") == "sticky",
                      "desktop: result panel is sticky")
            real = [e for e in errors if "cpi.json" not in e]
            check(real == [], f"{width} {theme}: no console errors {real}")
            context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:4719/inflation-reality/")
    parser.add_argument("--live-data", action="store_true", help="use the site's real cpi.json instead of the fixture")
    parser.add_argument("--seed", type=int, default=random.randrange(1_000_000), help="random-amounts seed (printed)")
    parser.add_argument("--rounds", type=int, default=6, help="random-amounts rounds")
    args = parser.parse_args()
    base = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
    print(f"auditing {base} with {'live data' if args.live_data else 'the fixture'}")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        flows(browser, args, base)
        matrix(browser, args, base)
        browser.close()
    print(f"\n{len(failures)} failed" if failures else "\naudit passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
```

Add to `package.json` `"scripts"` (after `"test"`):

```json
    "audit:ui": "python3 scripts/audit/ui-audit.py"
```

(Mind the comma after the `"test"` line.)

- [ ] **Step 3: Run it against the local build**

```bash
npm run build
npx vite preview --port 4719 --strictPort     # in the background
python3 scripts/audit/ui-audit.py | grep -v "^ok:"
```

Expected: `auditing http://localhost:4719/inflation-reality/ with the fixture`, the seed, then `audit passed` (127 `ok:` lines; run without the grep to see them). If a check fails, fix the **page**, not the check, unless the check is plainly wrong about the spec. Record any change to a check in the commit message. Then run it again with `--seed 1` and `--live-data`. Both must pass.

- [ ] **Step 4: Prove it can fail.** Temporarily append `.bar-name { text-transform: uppercase; }` to `src/styles/tabs.css`, then run `npm run build` and run the audit again. Expected: `FAIL: National numbers, 390 light: design rules ['rule 2: uppercase on span.bar-name', …]` and exit code 1. Revert the line with `git checkout src/styles/tabs.css`, rebuild, and confirm `audit passed` again. Stop the preview server.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit/fixture-cpi.json scripts/audit/ui-audit.py package.json
git commit -m "test: commit the UI audit (flows, design rules, random amounts, both themes)"
```

---

### Task 13: Merge gate, deploy check, handoff (controller)

Run by the controller after the final whole-branch review, not by an implementer subagent. Steps 3 and 5 need the owner.

**Files:**
- Modify: `docs/SESSIONS.md` (handoff), `docs/CHANGELOG.md` and `docs/BACKLOG.md` via `ledger`

- [ ] **Step 1: Whole-branch review.** Use superpowers:requesting-code-review on `main..redesign/phase2b`. Fix findings on the branch and re-run `npm test`, `npx vite build` and the audit.

- [ ] **Step 2: Gate 1 and 2 (unit tests, audit).** On the branch tip: `npm test` shows 180/180 (or more), `npx vite build` succeeds, and `python3 scripts/audit/ui-audit.py` passes against `vite preview` with the fixture and with `--live-data`. Paste the summary lines into the handoff.

- [ ] **Step 3: Gate 3: the 5-second test (owner, manual; not a code task).** The spec's Design rule 9 calls for 5 non-designers, each shown the first screen on a phone. Ask "What does this page do?" and "Is that number yours?". At least 4 of 5 must answer both correctly. Ask the owner for the result and record it in the handoff. **Do not merge without it.** If it fails, stop and bring the answers back to the owner. Copy changes go through the spec first.

- [ ] **Step 4: Merge (owner's go-ahead required).** Read any commits on `main` that are not on the branch first (`git log redesign/phase2b..main`). Then:

```bash
git switch main
git merge --ff-only redesign/phase2b    # or a merge commit if main moved on
npm test && npx vite build
```

Push only when the owner says so (`git push origin main`). The push deploys the site, and unpushed commits already on `main` go out with it.

- [ ] **Step 5: Gate 4: production data live.** After the deploy run finishes green (`gh run list --limit 3`, then `gh run view <id> --log | grep -E "series live|Calculator BLS lines|warning"`), expect `54/54 series live` or more, `Calculator BLS lines are live.`, and no `::warning::`. Then:

```bash
curl -s https://derektm17.github.io/inflation-reality/cpi.json | python3 -c '
import json, sys
d = json.load(sys.stdin)
ids = ["rent","upkeep","groceries","dining","gasoline","carIns","carUpkeep","transit","electric",
       "heatGas","heatOil","daycare","tuition","clothing","fun","exShelter","doctor"]
bad = [i for i in ids if d.get("lines", {}).get(i, {}).get("yoy") is None or d["lines"][i].get("stale")]
print("referenceMonth", d.get("referenceMonth"), "stale or missing:", bad, "residualYoy", d.get("basket", {}).get("residualYoy"))
sys.exit(1 if bad or d.get("basket", {}).get("residualYoy") is None else 0)'
python3 scripts/audit/ui-audit.py --base-url https://derektm17.github.io/inflation-reality/ --live-data | grep -v "^ok:"
python3 scripts/audit/ui-audit.py --base-url https://derektm17.github.io/inflation-reality/ | grep -v "^ok:"
```

Expected: `stale or missing: []` with a numeric `residualYoy` (exit 0), then `audit passed` twice. If `exShelter` is missing, the deploy predates the owner-yardstick commit (`ef81ff2`). Check that it is on `origin/main`.

Also check the preview with a link-preview inspector, for example by pasting the URL into a Slack DM to yourself. The title, description and image must show.

- [ ] **Step 6: Capture state.** Run the `session-checkpoint` skill: write a `#### Handoff` in `docs/SESSIONS.md` with the commits, test count, audit summary, the 5-second test result and the deploy run ID. Ship with `ledger ship inflation-reality "National numbers, Price check and Sources are rebuilt; the spreadsheet moved to Sources; link previews; committed UI audit"`. Record follow-ups with `ledger idea inflation-reality --tag redesign`: (a) retire `CATEGORIES` from the catalog, pipeline, merge and payload check; (b) each open question below the owner did not settle; (c) refresh `scripts/audit/fixture-cpi.json` whenever `fallback.json` is refreshed. Mark the BACKLOG items this plan closes as done with `ledger done`: Phase 2b, route focus/title, "Show all" `aria-controls`, and legacy dark mode.

---

## Open questions for the owner

**Resolved 2026-10-01: the owner accepted the plan's choice on all nine** (Q8: keep BLS item names as published; Q9: keep the example, it already opens with "For example"). Task 13's follow-up (b) therefore has nothing to record.

These were judgment calls this plan made where the spec is silent or loose.

1. **Other official measures:** the plan adds "CPI for all items", "Core CPI" and "CPI without housing" (the owners' yardstick) to the five `ALT_MEASURES`. Should the yardstick appear there, or only on Sources?
2. **Bars as HTML lists, not Recharts.** The spec's chart rules assume Recharts. This plan uses Recharts for the trend line only, and plain bar rows for measures and movers. OK?
3. **Biggest price changes** ranks by size of change, up or down. The old view showed only the 10 biggest increases. Which do you want?
4. **Country comparison spot:** is an invisible code slot enough, or do you want a visible "Coming later" line? The plan says invisible, because a placeholder looks unfinished.
5. **Spreadsheet contents:** five sheets, as in Decision 5. The old "Your Calculation" slider sheet and the old 10-category sheet are gone. The estimate sheet uses saved answers, or the average household if there are none. Is anything from the old workbook missed?
6. **Tab titles** use "National numbers | Inflation Reality". Is a different separator wanted? (Em dash and `·` are banned.)
7. **`CATEGORIES` retirement:** after this plan, no view reads it, but the pipeline still fetches its 10 series and the payload check requires `categories`. Retire it in a follow-up?
8. **Average-price item names** keep their catalog form ("Eggs, Grade A Large", "Ground Beef, 100%"). Sentence-case them too?
9. **The worked example on Sources** ("$200 a month on gas… prices rose 25%… $480 more") uses made-up numbers to explain the math. The spec bans placeholder *rates* in the estimate, and this is not one, but say if you would rather the example use live data or be cut.
