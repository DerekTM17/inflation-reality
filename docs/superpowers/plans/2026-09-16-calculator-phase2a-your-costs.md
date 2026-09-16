# Calculator Phase 2a (Shell and Your costs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's first screen with the calculator-first "Your costs" tab (average household first, four questions, a live result panel in dollars, saved answers), inside a new shell with section links and hash routing, on branch `redesign/calculator-first`.

**Architecture:** All math and wording live in pure modules under `src/calculator/` (`format.js` → `config.js` + `model.js` → `panel.js`, plus `storage.js`), unit-tested with `node --test`. React components under `src/components/` only lay out what `panel.js` returns. `App.jsx` becomes a shell (data loading, routing, nav); the old dashboard moves unchanged into `src/views/LegacyDashboard.jsx` and serves National numbers, Price check and Sources until Phase 2b rebuilds them. `merge.js` starts forwarding the Phase 1 `lines` and `basket` payload keys.

**Tech Stack:** Vite 5, React 18, plain CSS with custom-property tokens, Node's built-in test runner (`node --test`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md` (sections Visual system, Design rules, Voice guide, Numbers, The "Your costs" tab, Calculation model, Front-end architecture, Error handling, Accessibility). Approved mockup: `docs/superpowers/mockups/2026-09-14-layout-c-plain.html`; **where it differs, the spec wins** (renewal defaults, heating "Included in my rent", negatives, verdict rule).

**Validated:** every code block below was run on 2026-09-16 in a throwaway worktree of `main` at `9378d77`: `npm test` 127/127 (71 existing + 56 new), `npx vite build` succeeded, and the Task 9 smoke script passed all 30 checks against `vite preview`.

## Global Constraints

- **Branch:** all work on `redesign/calculator-first`, created from `main`. Never commit to `main`. **Never push** (the owner pushes; a push to `main` deploys the live site).
- **Commits** end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **No new dependencies.** Tests use `node --test` only; test files are `*.test.mjs` next to the code.
- **Null, never zero.** A missing rate is `null` and the line stays off every total. In JavaScript `null >= 0` is `true`: write `x != null && x >= 0`, never a bare comparison on a maybe-null value.
- **Rates are stored to 6 decimals** (`lines[id].yoy`, basket weights/rates/residual); every displayed rate goes through `formatRate` (one decimal, `+` or U+2212 `−`, fixed mortgage `0%`).
- **Your costs reads `data.lines` and `data.basket` only, never `data.categories`.** `categories.gas` and `lines.gasoline` share a series but are anchored to different months and can disagree.
- **A stale basket can be a bare `{ stale: true }`.** After `buildViewData` its fields are `null`; `averageRows` returns `null` and the page says "Average household figures are not available right now."
- **Components never use literal colors.** Colors exist only in `src/styles/tokens.css` (enforced by `src/styles/tokens.test.mjs`).
- **Voice guide:** site copy has no `—` (em dash), `·`, `→`, exclamation marks, "Welcome back", "Here's", "Let's", "simply"; on Your costs, no unexplained "CPI", "YoY", "relative importance". Sentence case, second person.
- **Controls:** ≥ 44px tall; selected = `aria-pressed="true"` + accent fill + ✓; guessed = dashed accent border + "our guess" + `aria-pressed="false"`; `:focus-visible` ring in `--accent`.
- **Do not touch** `scripts/`, `.github/workflows/`, `public/`, `src/data/catalog.js`, `src/data/fallback.json`.

## Decisions this plan makes (not in the spec)

1. **Legacy views serve the other sections in 2a.** `#national-numbers` → old "dashboard" view, `#price-check` → "prices", `#sources` → "methodology". Phase 2b replaces them; the branch is not merged before then.
2. **Personal (not folded) shows "Saved in this browser only. [Start over]" under the questions**, so someone who just answered can reset without reloading. The spec only places Start over in the Returning summary.
3. **Missing data:** a personal line whose series has no number (including Everything else when the basket residual is null) is left out of the total, and the fine print says "No recent price data for X, so it is left out." The headline rate is **not** substituted. The BACKLOG's whole-basket fallback decision (renormalize vs. stale the whole basket) stays open; this plan does not decide it.
4. **Tapping a selected answer keeps it selected** (no deselect). Nothing locks; people change answers by tapping another option.
5. **Explanations** show under a question for the effective choice (answered or guessed) in Personal only, so the employer health note appears alongside the 6% default it explains.
6. **Returning summary's monthly total** sums every active line's amount, including renewal lines that are off the rate total.
7. **Compare-bar labels** are "Your costs" and "National".
8. **No React component tests** (would need jsdom, a new dependency). Component behavior is checked by the Task 9 browser smoke script; Phase 2b adds the committed audit.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/data/merge.js` (modify) | also forward `lines` (keyed by id) and `basket` (ordered items + residual) | 1 |
| `src/calculator/format.js` | rounding, rate/dollar/date text, largest-remainder allocation, bar geometry, input parsing | 2 |
| `src/calculator/config.js` | questions, options, common answers, line defaults and phrases, explanations | 3 |
| `src/calculator/model.js` | answers → rows → result; verdict; basis | 3 |
| `src/calculator/testdata.mjs` | synthetic view data shared by calculator tests | 3 |
| `src/calculator/panel.js` | panel/lede/summary/fine-print text and rows as plain data | 4 |
| `src/calculator/storage.js` | versioned localStorage with pure `parseSaved` | 5 |
| `src/styles/tokens.css`, `controls.css` | tokens (light/dark) and control states | 6 |
| `src/styles/tokens.test.mjs` | contrast (design rule 7), dark blocks in sync, no literal colors | 6 |
| `index.html` (modify) | Libre Franklin font link | 6 |
| `src/routes.js`, `src/data/payload.js` | route parsing, payload shape check | 7 |
| `src/App.jsx` (rewrite), `src/views/LegacyDashboard.jsx` (moved from `src/App.jsx`) | shell; old dashboard | 7 |
| `src/components/SectionNav.jsx`, `src/views/YourCostsIntro.jsx`, `src/styles/calculator.css`, `src/main.jsx`, `src/index.css` | nav, intro, layout CSS, CSS imports | 7 |
| `src/components/{NumberField,Questions,Summary,Amounts,ResultPanel,Dock,Toast,LiveRegion}.jsx`, `src/views/YourCosts.jsx` | the Your costs tab | 8 |

---

### Task 1: Forward `lines` and `basket` through `buildViewData`

**Files:**
- Modify: `src/data/merge.js`
- Test: `src/data/merge.test.mjs`

**Interfaces:**
- Consumes: payload `lines: { [id]: { yoy } | { yoy, stale: true } }` and `basket: { month, weights: {[visibleId]: n}, rates: {[visibleId]: n}, restWeight, residualYoy, headlineYoy } | { ...same, stale: true } | { stale: true }`; catalog `CALC_LINES`, `CALC_COMBOS`, `BASKET.visible`.
- Produces: `buildViewData(catalog, dynamic)` additionally returns
  - `lines: { [id]: { id, label, source, yoy: number|null, stale: boolean } }` for every `CALC_LINES` and `CALC_COMBOS` id (16 ids, including `doctor`);
  - `basket: { month: string|null, items: { id, label, weight: number|null, rate: number|null }[] (BASKET.visible order), restWeight, residualYoy, headlineYoy (number|null each), stale: boolean }`.
  - Callers that pass a catalog without `CALC_LINES`/`CALC_COMBOS`/`BASKET` get `lines: {}` and `basket.items: []`.

- [ ] **Step 0: Create the branch**

```bash
cd ~/projects/inflation-reality
git switch main && git status --short   # expect clean
git switch -c redesign/calculator-first
```

- [ ] **Step 1: Write the failing tests**

In `src/data/merge.test.mjs`, change the catalog import line to also import `BASKET`:

```js
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, WEEKLY_PRICES, CALC_LINES, CALC_COMBOS, BASKET } from "./catalog.js";
```

Directly under the existing `const catalog = { … };` line add:

```js
const fullCatalog = { ...catalog, CALC_LINES, CALC_COMBOS, BASKET };
```

Append to the end of the file:

```js
test("buildViewData forwards every calculator line, keyed by id, from the payload", () => {
  const view = buildViewData(fullCatalog, dynamic);
  const ids = [...CALC_LINES.map(l => l.id), ...CALC_COMBOS.map(c => c.id)];
  assert.deepEqual(Object.keys(view.lines).sort(), [...ids].sort());
  assert.equal(ids.length, 16);
  const gasoline = view.lines.gasoline;
  assert.equal(gasoline.yoy, dynamic.lines.gasoline.yoy);
  assert.equal(gasoline.yoy, 27.404926);               // literal, pinned to the production fixture
  assert.equal(gasoline.label, "Gas for the car");      // from catalog
  assert.equal(gasoline.source, "fred");
  assert.equal(gasoline.stale, false);
  assert.equal(view.lines.doctor.yoy, dynamic.lines.doctor.yoy);
  assert.equal(view.lines.doctor.label, "Doctor and pharmacy");
});

test("buildViewData lines: stale is carried; a missing line is null, never 0", () => {
  const { rent, ...withoutRent } = dynamic.lines;
  const view = buildViewData(fullCatalog, {
    ...dynamic,
    lines: { ...withoutRent, carIns: { yoy: -5.1, stale: true } },
  });
  assert.deepEqual(
    { yoy: view.lines.carIns.yoy, stale: view.lines.carIns.stale },
    { yoy: -5.1, stale: true },
  );
  assert.equal(view.lines.rent.yoy, null);
  assert.equal(view.lines.rent.stale, false);
});

test("buildViewData forwards the basket as ordered items plus the residual", () => {
  const view = buildViewData(fullCatalog, dynamic);
  assert.deepEqual(view.basket.items.map(i => i.id), BASKET.visible.map(v => v.id));
  const housing = view.basket.items.find(i => i.id === "housing");
  assert.equal(housing.label, "Housing");                          // from catalog
  assert.equal(housing.weight, dynamic.basket.weights.housing);
  assert.equal(housing.rate, dynamic.basket.rates.housing);
  assert.equal(view.basket.restWeight, 28.137887);                 // literal, production fixture
  assert.equal(view.basket.residualYoy, dynamic.basket.residualYoy);
  assert.equal(view.basket.headlineYoy, dynamic.basket.headlineYoy);
  assert.equal(view.basket.month, dynamic.basket.month);
  assert.equal(view.basket.stale, false);
});

test("buildViewData basket: a bare { stale: true } has null fields, never 0", () => {
  const view = buildViewData(fullCatalog, { ...dynamic, basket: { stale: true } });
  assert.equal(view.basket.stale, true);
  assert.equal(view.basket.items.length, BASKET.visible.length);
  assert.ok(view.basket.items.every(i => i.weight === null && i.rate === null));
  assert.equal(view.basket.restWeight, null);
  assert.equal(view.basket.residualYoy, null);
  assert.equal(view.basket.headlineYoy, null);
  assert.equal(view.basket.month, null);
});

test("buildViewData without calculator catalog entries or payload keys returns empty lines and basket", () => {
  const view = buildViewData(catalog, { trend: [], categories: {} });
  assert.deepEqual(view.lines, {});
  assert.deepEqual(view.basket.items, []);
  assert.equal(view.basket.residualYoy, null);
  assert.equal(view.basket.stale, false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test src/data/merge.test.mjs`
Expected: FAIL, 5 new tests failing with `TypeError: Cannot read properties of undefined` (reading `lines` / `basket` / `items`); the 10 existing tests pass.

- [ ] **Step 3: Implement**

Replace `src/data/merge.js` with:

```js
// Merge static catalog metadata with a dynamic payload (from cpi.json or fallback.json)
// into render-ready objects for the app. Pure; no side effects.

export function buildViewData(catalog, dynamic) {
  const {
    HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, WEEKLY_PRICES,
    CALC_LINES, CALC_COMBOS, BASKET,
  } = catalog;

  const macro = (spec, node = {}) => ({
    ...spec,
    yoy: node.yoy ?? null,
    mom: node.mom ?? null,
    momAnnualized: node.momAnnualized ?? null,
    stale: node.stale ?? false,
  });

  const categories = CATEGORIES.map(c => ({
    ...c,
    yoy: dynamic.categories?.[c.id]?.yoy ?? null,
    stale: dynamic.categories?.[c.id]?.stale ?? false,
  }));

  const avgPrices = AVG_PRICE_ITEMS.map(p => ({
    ...p,
    current: dynamic.avgPrices?.[p.seriesId]?.current ?? null,
    yearAgo: dynamic.avgPrices?.[p.seriesId]?.yearAgo ?? null,
    stale: dynamic.avgPrices?.[p.seriesId]?.stale ?? false,
  }));

  const altMeasures = (ALT_MEASURES || []).map(m => ({
    ...m,
    yoy: dynamic.altMeasures?.[m.key]?.yoy ?? null,
    stale: dynamic.altMeasures?.[m.key]?.stale ?? false,
  }));

  const weeklyPrices = (WEEKLY_PRICES || []).map(w => ({
    ...w,
    current: dynamic.weeklyPrices?.[w.key]?.current ?? null,
    yearAgo: dynamic.weeklyPrices?.[w.key]?.yearAgo ?? null,
    asOf: dynamic.weeklyPrices?.[w.key]?.asOf ?? null,
    asOfLabel: dynamic.weeklyPrices?.[w.key]?.asOfLabel ?? "",
    stale: dynamic.weeklyPrices?.[w.key]?.stale ?? false,
  }));

  // Calculator lines, keyed by id (CALC_LINES plus combos such as "doctor"). A line
  // with no published value has yoy null, never 0. Values stay at stored precision
  // (6 decimals); display rounds.
  const lines = Object.fromEntries(
    [...(CALC_LINES || []), ...(CALC_COMBOS || [])].map((l) => [l.id, {
      id: l.id,
      label: l.label,
      source: l.source,
      yoy: dynamic.lines?.[l.id]?.yoy ?? null,
      stale: dynamic.lines?.[l.id]?.stale ?? false,
    }]),
  );

  // Average-household basket. The payload keys weights and rates by visible id; a
  // stale basket may be a bare { stale: true }, so every field defaults to null.
  const b = dynamic.basket ?? {};
  const basket = {
    month: b.month ?? null,
    items: (BASKET?.visible || []).map((v) => ({
      id: v.id,
      label: v.label,
      weight: b.weights?.[v.id] ?? null,
      rate: b.rates?.[v.id] ?? null,
    })),
    restWeight: b.restWeight ?? null,
    residualYoy: b.residualYoy ?? null,
    headlineYoy: b.headlineYoy ?? null,
    stale: b.stale ?? false,
  };

  return {
    generatedAt: dynamic.generatedAt ?? null,
    referenceMonth: dynamic.referenceMonth ?? null,
    referenceMonthLabel: dynamic.referenceMonthLabel ?? "",
    yoyGap: dynamic.yoyGap ?? null,
    headline: macro(HEADLINE, dynamic.headline),
    core: macro(CORE, dynamic.core),
    categories,
    avgPrices,
    altMeasures,
    weeklyPrices,
    trend: dynamic.trend ?? [],
    lines,
    basket,
  };
}

// Given a list of merged items (categories/avgPrices/altMeasures/weeklyPrices entries,
// or the headline/core macro nodes passed ad hoc as [headline, core]), return the
// display labels of the stale ones — the input for a "using last known value" note
// in the UI. Items carry their display name as `label`, except avgPrices, which uses
// `item`.
export function staleLabels(items) {
  return (items || [])
    .filter((i) => i && i.stale)
    .map((i) => i.label ?? i.item)
    .filter(Boolean);
}
```

(Only `buildViewData`'s destructuring, the `lines`/`basket` blocks and the two new return keys change; `staleLabels` is unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test src/data/merge.test.mjs`
Expected: `pass 15`, `fail 0`.

- [ ] **Step 5: Full suite and commit**

Run: `npm test` → expect `pass 76`, `fail 0`.

```bash
git add src/data/merge.js src/data/merge.test.mjs
git commit -m "feat(merge): forward calculator lines and basket to the view

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Display formatting and rounding (`format.js`)

**Files:**
- Create: `src/calculator/format.js`
- Test: `src/calculator/format.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces (all pure): `round1(n|null)→number|null`; `formatRate(pct|null, {fixed?})→string`; `movePhrase(pct)→"rose 3.4%"|"fell 0.5%"|"did not change"`; `formatDollars(n)→"$1,450"` (absolute value); `signedDollars(n)→"+$150"|"−$40"|"$0"`; `roundToStep(n, step)→number` (half away from zero, no `-0`); `allocateRounded(values[], total, step=10)→number[]` (sums exactly to `total`); `barGeometry(values[])→{left,width}[]` (percent); `monthLabel("YYYY-MM", yearOffset=0)→"August 2026"`; `joinAnd(string[])→string`; `clampAmount(n)`; `clampRenewal(n)`; `parseAmountInput(text)→number`; `parseRenewalInput(text)→number|null`.

- [ ] **Step 1: Write the failing test** — create `src/calculator/format.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  round1, formatRate, movePhrase, formatDollars, signedDollars, roundToStep, allocateRounded,
  barGeometry, monthLabel, joinAnd, clampAmount, clampRenewal, parseAmountInput, parseRenewalInput,
} from "./format.js";

const sum = (xs) => xs.reduce((s, x) => s + x, 0);

test("round1 keeps null and drops negative zero", () => {
  assert.equal(round1(null), null);
  assert.equal(round1(3.396548), 3.4);
  assert.ok(Object.is(round1(-0.04), 0));
});

test("formatRate: sign, U+2212 minus, one decimal, fixed mortgage", () => {
  assert.equal(formatRate(24.6), "+24.6%");
  assert.equal(formatRate(-4.5), "−4.5%");
  assert.equal(formatRate(-0.04), "0.0%");
  assert.equal(formatRate(0, { fixed: true }), "0%");
  assert.equal(formatRate(null), "");
});

test("movePhrase", () => {
  assert.equal(movePhrase(3.396548), "rose 3.4%");
  assert.equal(movePhrase(-0.46), "fell 0.5%");
  assert.equal(movePhrase(0.01), "did not change");
});

test("dollars: grouping, sign, zero", () => {
  assert.equal(formatDollars(1450), "$1,450");
  assert.equal(formatDollars(-120), "$120");
  assert.equal(signedDollars(150), "+$150");
  assert.equal(signedDollars(-40), "−$40");
  assert.equal(signedDollars(0), "$0");
});

test("roundToStep rounds half away from zero and never returns -0", () => {
  assert.equal(roundToStep(2266.63, 50), 2250);
  assert.equal(roundToStep(125, 50), 150);
  assert.equal(roundToStep(-125, 50), -150);
  assert.ok(Object.is(roundToStep(-20, 50), 0));
});

test("allocateRounded sums exactly with mixed signs", () => {
  const values = [104, -38, 7, 12];
  const total = roundToStep(sum(values), 50); // 85 → 100
  const out = allocateRounded(values, total);
  assert.deepEqual(out, [110, -30, 10, 10]);
  assert.equal(sum(out), total);
});

test("allocateRounded handles leftovers larger than the list and negative leftovers", () => {
  const over = allocateRounded([49, 49, -73], 50); // floors sum to 0, needs +5 steps over 3 values
  assert.equal(sum(over), 50);
  const under = allocateRounded([21, 21, 21], 50); // floors sum to 60, needs −1 step
  assert.deepEqual(under, [20, 20, 10]);
  const negative = allocateRounded([-26, -26], -50);
  assert.deepEqual(negative, [-20, -30]);
  assert.deepEqual(allocateRounded([], 0), []);
  assert.ok(allocateRounded([0.4], 0).every((v) => Object.is(v, 0)));
});

test("barGeometry: all positive starts at zero; negatives extend left", () => {
  assert.deepEqual(barGeometry([50, 100]), [{ left: 0, width: 50 }, { left: 0, width: 100 }]);
  const mixed = barGeometry([75, -25]);
  assert.deepEqual(mixed[0], { left: 25, width: 75 });
  assert.deepEqual(mixed[1], { left: 0, width: 25 });
  assert.deepEqual(barGeometry([0, 0]), [{ left: 0, width: 0 }, { left: 0, width: 0 }]);
});

test("monthLabel and joinAnd", () => {
  assert.equal(monthLabel("2026-08"), "August 2026");
  assert.equal(monthLabel("2026-08", -1), "August 2025");
  assert.equal(monthLabel(null), "");
  assert.equal(joinAnd(["car insurance"]), "car insurance");
  assert.equal(joinAnd(["a", "b"]), "a and b");
  assert.equal(joinAnd(["a", "b", "c"]), "a, b, and c");
});

test("input parsing and clamps", () => {
  assert.equal(parseAmountInput("1,650"), 1650);
  assert.equal(parseAmountInput(""), 0);
  assert.equal(parseAmountInput("abc"), 0);
  assert.equal(parseAmountInput("250000"), 100000);
  assert.equal(parseAmountInput("-5"), 0);
  assert.equal(clampAmount(99.6), 100);
  assert.equal(parseRenewalInput(""), null);
  assert.equal(parseRenewalInput("  "), null);
  assert.equal(parseRenewalInput("4.25%"), 4.3);
  assert.equal(parseRenewalInput("x"), 0);
  assert.equal(parseRenewalInput("-80"), -50);
  assert.equal(clampRenewal(250), 100);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/calculator/format.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `format.js`.

- [ ] **Step 3: Implement** — create `src/calculator/format.js`:

```js
// Display formatting and rounding for the Your costs calculator. Pure.
// Rules come from the spec's "Numbers" section.

const MINUS = "−"; // U+2212, never a hyphen, in displayed negatives
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Round to one decimal (display precision). null stays null. */
export function round1(n) {
  if (n == null) return null;
  const r = Math.round(n * 10) / 10;
  return r === 0 ? 0 : r; // drop -0
}

/** "+24.6%", "−4.5%", "0.0%"; a fixed mortgage passes { fixed: true } and shows "0%". */
export function formatRate(pct, { fixed = false } = {}) {
  if (fixed) return "0%";
  if (pct == null) return "";
  const r = round1(pct);
  if (r === 0) return "0.0%";
  return `${r > 0 ? "+" : MINUS}${Math.abs(r).toFixed(1)}%`;
}

/** "rose 3.4%", "fell 0.5%", "did not change" — for sentences like "Prices overall rose 3.4%." */
export function movePhrase(pct) {
  const r = round1(pct);
  if (r === 0) return "did not change";
  return `${r > 0 ? "rose" : "fell"} ${Math.abs(r).toFixed(1)}%`;
}

/** "$1,450" from the absolute value, whole dollars. The caller supplies any sign or wording. */
export function formatDollars(n) {
  const whole = String(Math.round(Math.abs(n)));
  return "$" + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "+$150", "−$40", "$0". */
export function signedDollars(n) {
  if (n === 0) return "$0";
  return (n > 0 ? "+" : MINUS) + formatDollars(n);
}

/** Round half away from zero to a step (50 for totals, 10 for lines), so −125 → −150 like 125 → 150. */
export function roundToStep(n, step) {
  const v = Math.sign(n) * Math.round(Math.abs(n) / step) * step;
  return v === 0 ? 0 : v;
}

/**
 * Largest-remainder allocation: round each value to `step` so the results sum
 * exactly to `total` (already a multiple of `step`). Works with mixed signs.
 * Floors every value, then hands the leftover steps to the largest fractional
 * parts (or takes them from the smallest when the floors overshoot). Ties go to
 * the earlier index.
 */
export function allocateRounded(values, total, step = 10) {
  const units = values.map((v) => v / step);
  const out = units.map(Math.floor);
  if (out.length === 0) return out;
  const order = units
    .map((u, i) => ({ i, frac: u - out[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  let k = Math.round(total / step) - out.reduce((s, u) => s + u, 0);
  for (let j = 0; k > 0; j++, k--) out[order[j % order.length].i] += 1;
  for (let j = 0; k < 0; j++, k++) out[order[order.length - 1 - (j % order.length)].i] -= 1;
  return out.map((u) => (u === 0 ? 0 : u * step));
}

/**
 * Horizontal bar placement for values that may be negative. Returns
 * { left, width } in percent of the track. Zero sits at the left edge when
 * nothing is negative; otherwise it moves right so decreases extend left.
 */
export function barGeometry(values) {
  const pos = Math.max(0, ...values);
  const neg = Math.max(0, ...values.map((v) => -v));
  const span = pos + neg;
  if (span === 0) return values.map(() => ({ left: 0, width: 0 }));
  const zero = (neg / span) * 100;
  return values.map((v) => {
    const width = (Math.abs(v) / span) * 100;
    return { left: v < 0 ? zero - width : zero, width };
  });
}

/** "2026-08" → "August 2026"; yearOffset −1 → "August 2025". Missing month → "". */
export function monthLabel(referenceMonth, yearOffset = 0) {
  const m = /^(\d{4})-(\d{2})$/.exec(referenceMonth ?? "");
  if (!m) return "";
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[1]) + yearOffset}`;
}

/** ["a"] → "a"; ["a","b"] → "a and b"; ["a","b","c"] → "a, b, and c". */
export function joinAnd(items) {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Whole dollars a month, clamped 0–100,000. */
export function clampAmount(n) {
  return Math.min(100000, Math.max(0, Math.round(n)));
}

/** Renewal increase in percent, one decimal, clamped −50 to 100. */
export function clampRenewal(n) {
  const r = Math.min(100, Math.max(-50, Math.round(n * 10) / 10));
  return r === 0 ? 0 : r;
}

/** Text typed into an amount box → a clamped number. Blank or non-numeric counts as 0. */
export function parseAmountInput(text) {
  const n = Number(String(text).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? clampAmount(n) : 0;
}

/** Text typed into a renewal box → clamped number, or null when blank (the line leaves the total). */
export function parseRenewalInput(text) {
  const t = String(text).replace(/[%\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? clampRenewal(n) : 0;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test src/calculator/format.test.mjs`
Expected: `pass 10`, `fail 0`.

- [ ] **Step 5: Full suite and commit**

Run: `npm test` → expect `pass 86`, `fail 0`.

```bash
git add src/calculator/format.js src/calculator/format.test.mjs
git commit -m "feat(calculator): number formatting, rounding and allocation helpers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Calculator config and model

**Files:**
- Create: `src/calculator/config.js`, `src/calculator/model.js`, `src/calculator/testdata.mjs`
- Test: `src/calculator/model.test.mjs`

**Interfaces:**
- Consumes: `buildViewData` output from Task 1 (`data.lines`, `data.basket`, `data.headline.yoy`); `round1`-style rounding is local to `model.js` (it does not import `format.js`).
- Produces:
  - `config.js`: `QUESTIONS` (`{id, legend, options:{id,label}[]}[]`, ids `home`/`car`/`heat`/`health`), `ALSO` (`{id,label,phrase}[]`, ids `daycare`/`tuition`), `COMMON`, `EMPLOYER_HEALTH_DEFAULT` (6), `EMPLOYER_DEFAULT_NOTE`, `EXPLANATIONS`, `SUMMARY_PHRASES`, `LINES` (`{[lineId]: {label, amount, note?, hint?, renewal?, because?}}`).
  - Answers shape used everywhere: `{ answered: {home?, car?, heat?, health?}, also: {daycare: bool, tuition: bool}, amounts: {[lineId]: number}, renewals: {[lineId]: number|null} }`.
  - Row shape: `{ id, label, monthly, rate: number|null, note: string, stale: boolean, missing: "renewal"|"data"|null }`.
  - `model.js`: `emptyAnswers()`, `isPersonal(answers)`, `effectiveChoices(answers)`, `activeLines(choices, also)→id[]`, `defaultAmount(id, choices)`, `lineRate(id, answers, choices, data)→{rate,note,stale,missing}`, `personalRows(answers, data)→Row[]`, `averageRows(data, monthlyMean)→Row[]|null`, `monthlyTotal(rows)`, `computeResult(rows)→{lines (Row & {annual, yearAgo, extra})[], excluded: Row[], totalAnnual, totalYearAgo, totalExtra, rate: number|null}`, `verdict(result, headlinePct)→string|null`, `basis(answers)→string`.
  - `testdata.mjs`: `fakeData({ lines?, basket?, headline?, yoyGap? })` → view-shaped data with fixed rates.

- [ ] **Step 1: Write the shared test data** — create `src/calculator/testdata.mjs`:

```js
// Synthetic view data (the shape buildViewData returns) for calculator tests.
// Values are fixed here on purpose so tests don't move when fallback.json is refreshed.

const LINE_RATES = {
  rent: 3.0, upkeep: 2.0, groceries: 2.2, dining: 3.4, gasoline: 27.4, carIns: -5.1,
  carUpkeep: 5.2, transit: -3.7, electric: 3.8, heatGas: 4.4, heatOil: 52.0,
  daycare: 4.0, tuition: 2.8, clothing: 3.6, fun: 2.7, doctor: 0.2,
};

const BASKET_ITEMS = [
  { id: "housing", label: "Housing", weight: 35.322438, rate: 3.041144 },
  { id: "groceries", label: "Groceries", weight: 8.202357, rate: 2.190663 },
  { id: "dining", label: "Eating out", weight: 5.30412, rate: 3.36677 },
  { id: "energy", label: "Home energy", weight: 3.442446, rate: 5.047394 },
  { id: "gasoline", label: "Gas for the car", weight: 3.85317, rate: 27.404926 },
  { id: "health", label: "Health care", weight: 8.229578, rate: 1.563348 },
  { id: "clothing", label: "Clothing", weight: 2.445064, rate: 3.608634 },
  { id: "fun", label: "Entertainment", weight: 5.062939, rate: 2.681868 },
];

/** Overrides: `lines` replaces whole line nodes by id; `basket` merges over the basket. */
export function fakeData({ lines = {}, basket = {}, headline = 3.4, yoyGap = null } = {}) {
  const viewLines = Object.fromEntries(
    Object.entries(LINE_RATES).map(([id, yoy]) => [id, { id, yoy, stale: false }]),
  );
  Object.assign(viewLines, lines);
  return {
    referenceMonth: "2026-08",
    referenceMonthLabel: "August 2026",
    yoyGap,
    headline: { yoy: headline, stale: false },
    lines: viewLines,
    basket: {
      month: "2026-08", stale: false, restWeight: 28.137887, residualYoy: 2.014252, headlineYoy: 3.396548,
      items: BASKET_ITEMS.map((i) => ({ ...i })),
      ...basket,
    },
  };
}
```

- [ ] **Step 2: Write the failing test** — create `src/calculator/model.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as catalog from "../data/catalog.js";
import { buildViewData } from "../data/merge.js";
import { QUESTIONS, COMMON, LINES } from "./config.js";
import {
  emptyAnswers, isPersonal, effectiveChoices, activeLines, defaultAmount, lineRate,
  personalRows, averageRows, monthlyTotal, computeResult, verdict, basis,
} from "./model.js";
import { fakeData } from "./testdata.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const answersWith = (patch) => ({ ...emptyAnswers(), ...patch });

test("config: labels match the catalog, common answers are real options", () => {
  for (const l of [...catalog.CALC_LINES, ...catalog.CALC_COMBOS]) {
    assert.equal(LINES[l.id]?.label, l.label, `label for ${l.id}`);
  }
  for (const q of QUESTIONS) {
    assert.ok(q.options.some((o) => o.id === COMMON[q.id]), `common answer for ${q.id}`);
  }
});

test("isPersonal: an answer or a checkbox, not an amount edit", () => {
  assert.equal(isPersonal(emptyAnswers()), false);
  assert.equal(isPersonal(answersWith({ amounts: { rent: 900 } })), false);
  assert.equal(isPersonal(answersWith({ answered: { car: "none" } })), true);
  assert.equal(isPersonal(answersWith({ also: { daycare: true, tuition: false } })), true);
});

test("activeLines: common answers, mortgage, electric car, no car, heating included", () => {
  const common = activeLines(effectiveChoices(emptyAnswers()), { daycare: false, tuition: false });
  assert.deepEqual(common, [
    "rent", "groceries", "dining", "gasoline", "carIns", "carUpkeep", "electric", "heatGas",
    "health", "doctor", "clothing", "fun", "rest",
  ]);
  const mortgage = activeLines({ ...COMMON, home: "mortgage", car: "electric", heat: "included", health: "none" },
    { daycare: true, tuition: true });
  assert.deepEqual(mortgage, [
    "mortgage", "homeIns", "upkeep", "groceries", "dining", "charging", "carIns", "carUpkeep",
    "electric", "daycare", "tuition", "doctor", "clothing", "fun", "rest",
  ]);
  const noCar = activeLines({ ...COMMON, home: "owned", car: "none", heat: "oil" }, { daycare: false, tuition: false });
  assert.ok(noCar.includes("transit") && !noCar.includes("carIns") && noCar.includes("heatOil"));
  assert.ok(!noCar.includes("rent") && noCar.includes("homeIns"));
});

test("defaultAmount nudges: hybrid gas, electric heat, buying your own insurance", () => {
  assert.equal(defaultAmount("gasoline", { ...COMMON, car: "hybrid" }), 105); // 190 × 0.55 = 104.5
  assert.equal(defaultAmount("electric", { ...COMMON, heat: "electric" }), 190);
  assert.equal(defaultAmount("health", { ...COMMON, health: "own" }), 650);
  assert.equal(defaultAmount("rent", COMMON), 1650);
});

test("lineRate: mortgage 0, renewal defaults and edits, charging uses electricity, rest uses the residual", () => {
  const data = fakeData();
  const a = emptyAnswers();
  assert.deepEqual(lineRate("mortgage", a, COMMON, data), { rate: 0, note: "Fixed payment", stale: false, missing: null });
  assert.deepEqual(lineRate("health", a, COMMON, data),
    { rate: 6, note: "Average for employer plans, change to yours", stale: false, missing: null });
  assert.equal(lineRate("health", a, { ...COMMON, health: "own" }, data).missing, "renewal");
  assert.equal(lineRate("homeIns", a, COMMON, data).rate, null);
  const edited = answersWith({ renewals: { health: 9.5, homeIns: null } });
  assert.deepEqual(lineRate("health", edited, COMMON, data), { rate: 9.5, note: "", stale: false, missing: null });
  assert.equal(lineRate("homeIns", edited, COMMON, data).missing, "renewal");
  assert.equal(lineRate("charging", a, COMMON, data).rate, 3.8);
  assert.equal(lineRate("rest", a, COMMON, data).rate, 2.014252);
  assert.equal(lineRate("rest", a, COMMON, data).note, "Estimated from the national rate");
});

test("lineRate: missing series is null (never 0); stale is carried", () => {
  const data = fakeData({ lines: { carIns: { id: "carIns", yoy: -5.1, stale: true }, daycare: { id: "daycare", yoy: null, stale: false } } });
  const a = emptyAnswers();
  assert.deepEqual(lineRate("carIns", a, COMMON, data), { rate: -5.1, note: "", stale: true, missing: null });
  assert.deepEqual(lineRate("daycare", a, COMMON, data), { rate: null, note: "", stale: false, missing: "data" });
  const bare = fakeData({ basket: { residualYoy: null, stale: true } });
  assert.equal(lineRate("rest", a, COMMON, bare).rate, null);
  assert.equal(lineRate("rest", a, COMMON, bare).missing, "data");
});

test("personalRows uses edits over defaults", () => {
  const rows = personalRows(answersWith({ answered: { car: "hybrid" }, amounts: { rent: 1200 } }), fakeData());
  assert.equal(rows.find((r) => r.id === "rent").monthly, 1200);
  assert.equal(rows.find((r) => r.id === "gasoline").monthly, 105);
  assert.equal(rows.find((r) => r.id === "gasoline").label, "Gas for the car");
});

test("computeResult: formula, negatives, excluded rows stay off the total", () => {
  const result = computeResult([
    { id: "gasoline", monthly: 200, rate: 25 },
    { id: "carIns", monthly: 100, rate: -20 },
    { id: "homeIns", monthly: 140, rate: null },
  ]);
  // gas: annual 2400, yearAgo 1920, extra 480. carIns: annual 1200, yearAgo 1500, extra −300.
  assert.equal(result.lines.length, 2);
  assert.equal(result.excluded[0].id, "homeIns");
  assert.equal(result.totalAnnual, 3600);
  assert.equal(result.totalYearAgo, 3420);
  assert.equal(result.totalExtra, 180);
  assert.ok(Math.abs(result.rate - (3600 / 3420 - 1) * 100) < 1e-9);
  assert.equal(result.lines[1].extra, -300);
});

test("computeResult: no spending → rate null, not 0", () => {
  assert.equal(computeResult([{ id: "rent", monthly: 0, rate: 3 }]).rate, null);
});

test("average household reproduces the published headline (production fixture)", () => {
  const dynamic = JSON.parse(readFileSync(resolve(here, "../data/fallback.json"), "utf8"));
  const data = buildViewData(catalog, dynamic);
  const rows = averageRows(data, catalog.BASKET.ceMonthlyMean);
  assert.equal(rows.length, 9);
  assert.equal(rows[8].id, "rest");
  const result = computeResult(rows);
  assert.ok(Math.abs(result.rate - data.basket.headlineYoy) < 1e-4, `${result.rate} vs ${data.basket.headlineYoy}`);
  assert.equal(Math.round(result.rate * 10) / 10, data.headline.yoy);
  assert.ok(Math.abs(monthlyTotal(rows) - catalog.BASKET.ceMonthlyMean) < 0.01);
});

test("averageRows returns null for a bare stale basket", () => {
  const bare = fakeData({
    basket: { stale: true, restWeight: null, residualYoy: null, headlineYoy: null,
      items: [{ id: "housing", label: "Housing", weight: null, rate: null }] },
  });
  assert.equal(averageRows(bare, 5750), null);
  assert.equal(averageRows(fakeData({ basket: { items: [] } }), 5750), null);
});

test("verdict: reason in the direction of the gap", () => {
  const gas = computeResult([
    { id: "gasoline", monthly: 200, rate: 27.4 },
    { id: "groceries", monthly: 800, rate: 2.2 },
  ]); // your rate 6.4
  assert.equal(verdict(gas, 3.4), "More than the national rate, mainly because of gas prices.");
  const mortgage = computeResult([
    { id: "mortgage", monthly: 2000, rate: 0 },
    { id: "groceries", monthly: 500, rate: 2.2 },
  ]); // your rate 0.4
  assert.equal(verdict(mortgage, 3.4), "Less than the national rate, mainly because of your fixed mortgage payment.");
});

test("verdict: about the same within 0.2; no reason under 40% of the gap; Everything else never a reason", () => {
  assert.equal(verdict(computeResult([{ id: "groceries", monthly: 500, rate: 3.5 }]), 3.4),
    "About the same as the national rate.");
  const spread = computeResult([
    { id: "groceries", monthly: 1000, rate: 5 },
    { id: "dining", monthly: 1000, rate: 5 },
    { id: "fun", monthly: 1000, rate: 5 },
  ]); // d = 1.6; each c = 0.533 < 0.64
  assert.equal(verdict(spread, 3.4), "More than the national rate.");
  const restOnly = computeResult([{ id: "rest", monthly: 1000, rate: 10 }]);
  assert.equal(verdict(restOnly, 3.4), "More than the national rate.");
  assert.equal(verdict(computeResult([]), 3.4), null);
  assert.equal(verdict(spread, null), null);
});

test("basis wording", () => {
  assert.equal(basis(answersWith({ also: { daycare: true, tuition: false } })),
    "Based on 4 guesses. Monthly amounts are starting estimates.");
  assert.equal(basis(answersWith({ answered: { home: "rent" } })),
    "Based on 1 answer and 3 guesses. Monthly amounts are starting estimates.");
  assert.equal(basis(answersWith({ answered: { home: "rent", car: "gas", heat: "gas" }, amounts: { rent: 1 } })),
    "Based on 3 answers and 1 guess.");
  assert.equal(basis(answersWith({ answered: { home: "rent", car: "gas", heat: "gas", health: "none" }, amounts: { rent: 1 } })),
    "Based on your answers.");
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test src/calculator/model.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `config.js`.

- [ ] **Step 4: Implement the config** — create `src/calculator/config.js`:

```js
// Questions, lines and copy for the Your costs calculator.
//
// Monthly `amount` values are ILLUSTRATIVE starting estimates: people see and edit
// them. Rates never live here, except EMPLOYER_HEALTH_DEFAULT, a published survey
// figure the person is told to replace with their own.

export const QUESTIONS = [
  {
    id: "home", legend: "Your home",
    options: [
      { id: "rent", label: "Rent" },
      { id: "mortgage", label: "Mortgage, fixed rate" },
      { id: "owned", label: "Own it outright" },
    ],
  },
  {
    id: "car", legend: "Getting around",
    options: [
      { id: "gas", label: "Gas car" },
      { id: "hybrid", label: "Hybrid" },
      { id: "electric", label: "Electric car" },
      { id: "none", label: "No car" },
    ],
  },
  {
    id: "heat", legend: "Home heating",
    options: [
      { id: "electric", label: "Electric" },
      { id: "gas", label: "Natural gas" },
      { id: "oil", label: "Heating oil" },
      { id: "included", label: "Included in my rent" },
    ],
  },
  {
    id: "health", legend: "Health insurance",
    options: [
      { id: "work", label: "Through work" },
      { id: "own", label: "I buy my own" },
      { id: "none", label: "I don't pay a premium" },
    ],
  },
];

/** "Also paying for" checkboxes. Never answers or guesses; unchecked means not paying. */
export const ALSO = [
  { id: "daycare", label: "Daycare", phrase: "daycare" },
  { id: "tuition", label: "College tuition", phrase: "college tuition" },
];

/** Common answers, shown as guesses for unanswered questions. */
export const COMMON = { home: "rent", car: "gas", heat: "gas", health: "work" };

/** KFF 2025 average employer family premium increase, percent. */
export const EMPLOYER_HEALTH_DEFAULT = 6;

const HEALTH_HELP =
  "Use the increase from your renewal notice. The government's health insurance index measures insurance company earnings instead of premiums, so we don't use it.";

/** One or two sentences shown under a question for the chosen (or guessed) option. */
export const EXPLANATIONS = {
  home: {
    mortgage:
      "A fixed-rate payment stays the same from year to year, so it adds nothing here. The official inflation rate leaves mortgage payments out too. Home insurance and repairs still go up.",
  },
  car: { electric: "Most people charge at home, so we use the change in home electricity prices." },
  health: { work: HEALTH_HELP, own: HEALTH_HELP },
};

/** Phrases for the returning visitor's summary sentence. */
export const SUMMARY_PHRASES = {
  home: { rent: "rent", mortgage: "fixed-rate mortgage", owned: "home owned outright" },
  car: { gas: "gas car", hybrid: "hybrid", electric: "electric car", none: "no car" },
  heat: { electric: "electric heat", gas: "natural gas heat", oil: "heating oil", included: "heat included in rent" },
  health: { work: "health insurance through work", own: "buying your own health insurance", none: "no health insurance premium" },
};

/**
 * Personal lines. `amount` = illustrative monthly default; `note` = small text under
 * the label; `hint` = help beside the amount box; `renewal` = rate comes from the
 * person's renewal notice; `because` = verdict phrase ("mainly because of …").
 * Labels for series-backed lines match CALC_LINES in src/data/catalog.js (tested).
 */
export const LINES = {
  rent:      { label: "Rent", amount: 1650, because: "rent" },
  mortgage:  { label: "Mortgage payment", amount: 1900, note: "Fixed payment", because: "your fixed mortgage payment" },
  homeIns:   { label: "Home insurance", amount: 140, renewal: true, because: "home insurance" },
  upkeep:    { label: "Home repairs", amount: 130, note: "Estimate", because: "home repairs" },
  groceries: { label: "Groceries", amount: 620, because: "grocery prices" },
  dining:    { label: "Eating out", amount: 220, because: "restaurant prices" },
  gasoline:  { label: "Gas for the car", amount: 190, hint: "Drive less or work from home? Lower this.", because: "gas prices" },
  charging:  { label: "Charging the car", amount: 55, because: "electricity prices" },
  carIns:    { label: "Car insurance", amount: 160, because: "car insurance" },
  carUpkeep: { label: "Car repairs", amount: 60, because: "car repairs" },
  transit:   { label: "Bus and train fares", amount: 90, because: "bus and train fares" },
  electric:  { label: "Electricity", amount: 110, because: "electricity prices" },
  heatGas:   { label: "Natural gas bill", amount: 70, because: "natural gas prices" },
  heatOil:   { label: "Heating oil", amount: 120, because: "heating oil prices" },
  daycare:   { label: "Daycare", amount: 1100, because: "daycare costs" },
  tuition:   { label: "College tuition", amount: 900, because: "college tuition" },
  health:    { label: "Health insurance", amount: 180, renewal: true, because: "health insurance" },
  doctor:    { label: "Doctor and pharmacy", amount: 90, because: "doctor and pharmacy costs" },
  clothing:  { label: "Clothing", amount: 80, because: "clothing prices" },
  fun:       { label: "Entertainment", amount: 150, because: "entertainment prices" },
  rest:      { label: "Everything else", amount: 250, note: "Estimated from the national rate" },
};

/** The note on a health line that is still using EMPLOYER_HEALTH_DEFAULT. */
export const EMPLOYER_DEFAULT_NOTE = "Average for employer plans, change to yours";
```

- [ ] **Step 5: Implement the model** — create `src/calculator/model.js`:

```js
// The Your costs calculation model. Pure: takes answers plus the merged view data
// (buildViewData output) and returns rows and results. No React, no DOM.
//
// Rates are percents (2.75 means +2.75%). A rate of null means "no number": the
// row stays off the total. Missing data never becomes 0.

import {
  QUESTIONS, COMMON, LINES, EMPLOYER_HEALTH_DEFAULT, EMPLOYER_DEFAULT_NOTE,
} from "./config.js";

/** Fresh answers: nothing answered, nothing checked, no edits. */
export function emptyAnswers() {
  return { answered: {}, also: { daycare: false, tuition: false }, amounts: {}, renewals: {} };
}

/** Personal once any question is answered or any checkbox is checked. */
export function isPersonal(answers) {
  return Object.keys(answers.answered).length > 0 || answers.also.daycare || answers.also.tuition;
}

/** Answered choices, with common answers filling the unanswered questions. */
export function effectiveChoices(answers) {
  return { ...COMMON, ...answers.answered };
}

/** Line ids for a household, in display order before sorting. */
export function activeLines(choices, also) {
  const ids = [];
  if (choices.home === "rent") ids.push("rent");
  if (choices.home === "mortgage") ids.push("mortgage", "homeIns", "upkeep");
  if (choices.home === "owned") ids.push("homeIns", "upkeep");
  ids.push("groceries", "dining");
  if (choices.car === "gas" || choices.car === "hybrid") ids.push("gasoline");
  if (choices.car === "electric") ids.push("charging");
  if (choices.car === "none") ids.push("transit");
  else ids.push("carIns", "carUpkeep");
  ids.push("electric");
  if (choices.heat === "gas") ids.push("heatGas");
  if (choices.heat === "oil") ids.push("heatOil");
  if (also.daycare) ids.push("daycare");
  if (also.tuition) ids.push("tuition");
  if (choices.health !== "none") ids.push("health");
  ids.push("doctor", "clothing", "fun", "rest");
  return ids;
}

/** Starting monthly amount for a line, nudged by the answers. */
export function defaultAmount(id, choices) {
  let v = LINES[id].amount;
  if (id === "gasoline" && choices.car === "hybrid") v *= 0.55;
  if (id === "electric" && choices.heat === "electric") v += 80;
  if (id === "health" && choices.health === "own") v = 650;
  return Math.round(v);
}

/**
 * Rate for one personal line: { rate, note, stale, missing }.
 * missing is "renewal" (the person hasn't given an increase) or "data" (no
 * published number), else null.
 */
export function lineRate(id, answers, choices, data) {
  if (id === "mortgage") {
    return { rate: 0, note: LINES.mortgage.note, stale: false, missing: null };
  }
  if (LINES[id].renewal) {
    const edited = Object.hasOwn(answers.renewals, id);
    const usingDefault = !edited && id === "health" && choices.health === "work";
    const rate = edited ? answers.renewals[id] : usingDefault ? EMPLOYER_HEALTH_DEFAULT : null;
    return {
      rate,
      note: usingDefault ? EMPLOYER_DEFAULT_NOTE : "",
      stale: false,
      missing: rate == null ? "renewal" : null,
    };
  }
  let node;
  if (id === "charging") node = data.lines.electric;
  else if (id === "rest") node = { yoy: data.basket.residualYoy, stale: data.basket.stale };
  else node = data.lines[id];
  const rate = node?.yoy ?? null;
  return {
    rate,
    note: LINES[id].note ?? "",
    stale: rate != null && node.stale === true,
    missing: rate == null ? "data" : null,
  };
}

/** Rows for a personal household: { id, label, monthly, rate, note, stale, missing }. */
export function personalRows(answers, data) {
  const choices = effectiveChoices(answers);
  return activeLines(choices, answers.also).map((id) => ({
    id,
    label: LINES[id].label,
    monthly: answers.amounts[id] ?? defaultAmount(id, choices),
    ...lineRate(id, answers, choices, data),
  }));
}

/**
 * Rows for the average U.S. household: rolled basket shares × monthly mean spending,
 * plus Everything else. Returns null when the basket has no usable numbers (for
 * example a bare { stale: true } basket), so the page can say so instead of
 * inventing values.
 */
export function averageRows(data, monthlyMean) {
  const b = data.basket;
  const usable =
    b.items.length > 0 &&
    b.items.every((i) => i.weight != null && i.rate != null) &&
    b.restWeight != null &&
    b.residualYoy != null;
  if (!usable) return null;
  const row = (id, label, weight, rate, note) => ({
    id, label, monthly: (weight / 100) * monthlyMean, rate, note, stale: b.stale === true, missing: null,
  });
  return [
    ...b.items.map((i) => row(i.id, i.label, i.weight, i.rate, "")),
    row("rest", LINES.rest.label, b.restWeight, b.residualYoy, LINES.rest.note),
  ];
}

/** Sum of monthly amounts across rows (the summary's "About $3,950 a month"). */
export function monthlyTotal(rows) {
  return (rows ?? []).reduce((s, r) => s + r.monthly, 0);
}

/**
 * Spec "Calculation model": annual = 12m; yearAgo = annual / (1 + r);
 * extra = annual − yearAgo; your rate = Σ annual / Σ yearAgo − 1.
 * Rows with rate null go to `excluded` and stay off every total.
 */
export function computeResult(rows) {
  const lines = [];
  const excluded = [];
  for (const row of rows) {
    if (row.rate == null) {
      excluded.push(row);
      continue;
    }
    const annual = 12 * row.monthly;
    const yearAgo = annual / (1 + row.rate / 100);
    lines.push({ ...row, annual, yearAgo, extra: annual - yearAgo });
  }
  const totalAnnual = lines.reduce((s, l) => s + l.annual, 0);
  const totalYearAgo = lines.reduce((s, l) => s + l.yearAgo, 0);
  return {
    lines,
    excluded,
    totalAnnual,
    totalYearAgo,
    totalExtra: totalAnnual - totalYearAgo,
    rate: totalYearAgo > 0 ? (totalAnnual / totalYearAgo - 1) * 100 : null,
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Spec "Verdict rule". P and R at one decimal, d = P − R. Within 0.2 → about the
 * same. Otherwise the reason is the line (not Everything else) with the largest
 * c_i = share of year-ago spending × (r_i − R) in the direction of d, if it
 * explains at least 40% of d.
 */
export function verdict(result, headlinePct) {
  if (result.rate == null || headlinePct == null) return null;
  const R = r1(headlinePct);
  const d = r1(r1(result.rate) - R);
  if (Math.abs(d) <= 0.2) return "About the same as the national rate.";
  const lead = d > 0 ? "More than the national rate" : "Less than the national rate";
  let best = null;
  for (const l of result.lines) {
    if (l.id === "rest") continue;
    const c = (l.yearAgo / result.totalYearAgo) * (l.rate - R);
    if (Math.sign(c) !== Math.sign(d)) continue;
    if (best == null || Math.abs(c) > Math.abs(best.c)) best = { c, id: l.id };
  }
  if (best == null || Math.abs(best.c) < 0.4 * Math.abs(d)) return `${lead}.`;
  return `${lead}, mainly because of ${LINES[best.id].because}.`;
}

/** "Based on 1 answer and 3 guesses." (+ starting-estimates sentence until an amount is edited). */
export function basis(answers) {
  const a = QUESTIONS.filter((q) => answers.answered[q.id]).length;
  const g = QUESTIONS.length - a;
  const answersText = `${a} ${a === 1 ? "answer" : "answers"}`;
  const guessesText = `${g} ${g === 1 ? "guess" : "guesses"}`;
  let s;
  if (g === 0) s = "Based on your answers.";
  else if (a === 0) s = `Based on ${guessesText}.`;
  else s = `Based on ${answersText} and ${guessesText}.`;
  return Object.keys(answers.amounts).length === 0 ? `${s} Monthly amounts are starting estimates.` : s;
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `node --test src/calculator/model.test.mjs`
Expected: `pass 14`, `fail 0`. The "average household reproduces the published headline" test is the spec's success criterion: the rolled basket × $5,750 must land on `basket.headlineYoy` and round to the displayed headline.

- [ ] **Step 7: Full suite and commit**

Run: `npm test` → expect `pass 100`, `fail 0`.

```bash
git add src/calculator/config.js src/calculator/model.js src/calculator/testdata.mjs src/calculator/model.test.mjs
git commit -m "feat(calculator): questions config and the dollar model with verdict rule

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Panel text and rows (`panel.js`)

**Files:**
- Create: `src/calculator/panel.js`
- Test: `src/calculator/panel.test.mjs`

**Interfaces:**
- Consumes: Task 2 `format.js`; Task 3 `config.js` and `model.js` (`computeResult`, `verdict`, `basis`, `effectiveChoices`, `monthlyTotal`); `testdata.mjs`.
- Produces:
  - `TOP_ROWS` (6).
  - `panelModel({ mode: "average"|"personal", rows: Row[]|null, headlinePct, referenceMonth, answers })` → `{ title, answer, ratesLine, zero: boolean, total?: number, compare: {you:{text,bar}, us:{text,bar}}|null, verdict: string|null, basis: string|null, top: DisplayRow[], main: DisplayRow[], smaller: {count, text, dollars, dollarText}|null, rest: DisplayRow|null, allCount, prompts: {id, text}[], bars: boolean, actionLabel }` where `DisplayRow = { id, label, note, quiet, rateText, dollars, dollarText, bar:{left,width}, abs, order }`. Invariant: `Σ top.dollars + smaller.dollars + rest.dollars === total`.
  - `ledeText({ headlinePct, referenceMonth, returning })`, `summaryText(answers, rows)`, `finePrint({ mode, rows, data })→string[]`.

- [ ] **Step 1: Write the failing test** — create `src/calculator/panel.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyAnswers, personalRows, averageRows } from "./model.js";
import { panelModel, ledeText, summaryText, finePrint, TOP_ROWS } from "./panel.js";
import { fakeData } from "./testdata.mjs";

const MINUS = "−";
const answersWith = (patch) => ({ ...emptyAnswers(), ...patch });

function personalModel(answers, data = fakeData()) {
  return panelModel({
    mode: "personal", rows: personalRows(answers, data), headlinePct: data.headline.yoy,
    referenceMonth: data.referenceMonth, answers,
  });
}

// Every dollar row the panel shows, counted once: top rows + smaller items + Everything else.
function shownSum(m) {
  return m.top.reduce((s, r) => s + r.dollars, 0) + (m.smaller?.dollars ?? 0) + (m.rest?.dollars ?? 0);
}

test("average panel: title, answer, national line, 6 rows + smaller items + Everything else, no bars/verdict/basis", () => {
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
  assert.equal(m.actionLabel, "Answer the questions");
  assert.equal(m.top.length, TOP_ROWS);
  assert.equal(m.smaller.count, 2);
  assert.equal(m.smaller.text, "2 smaller items");
  assert.equal(m.rest.label, "Everything else");
  assert.equal(m.rest.note, "Estimated from the national rate");
  assert.equal(m.allCount, 9);
  assert.equal(m.main.length, 8);
  assert.ok(m.top.every((r, i) => i === 0 || m.top[i - 1].abs >= r.abs), "sorted by absolute dollars");
  assert.equal(shownSum(m), m.total);
});

test("personal panel with a mortgage: 0% line, prompt for home insurance, basis, verdict", () => {
  const m = personalModel(answersWith({ answered: { home: "mortgage" } }));
  assert.equal(m.title, "Your costs vs. August 2025");
  assert.equal(m.actionLabel, "Change answers");
  const mortgage = m.main.find((r) => r.id === "mortgage");
  assert.equal(mortgage.rateText, "0%");
  assert.equal(mortgage.note, "Fixed payment");
  assert.equal(mortgage.dollarText, "$0");
  assert.deepEqual(m.prompts, [{ id: "homeIns", text: "Home insurance: add your renewal increase" }]);
  assert.equal(m.basis, "Based on 1 answer and 3 guesses. Monthly amounts are starting estimates.");
  assert.match(m.verdict, /national rate/);
  assert.match(m.ratesLine, /^Your costs (rose|fell) \d+\.\d%\. Prices overall rose 3\.4%\.$/);
  assert.ok(m.compare && m.compare.us.text === "+3.4%");
  assert.equal(m.bars, true);
  assert.equal(shownSum(m), m.total);
});

test("personal panel: a negative line renders with U+2212 and totals still add up", () => {
  const m = personalModel(answersWith({ answered: { car: "gas" } }));
  const carIns = m.main.find((r) => r.id === "carIns");
  assert.ok(carIns.dollarText.startsWith(`${MINUS}$`), carIns.dollarText);
  assert.equal(carIns.rateText, `${MINUS}5.1%`);
  assert.ok(carIns.bar.width > 0);
  assert.equal(shownSum(m), m.total);
});

test("panel: all prices fell → 'less a year' with a U+2212-free answer", () => {
  const lines = Object.fromEntries(
    ["rent", "groceries", "dining", "gasoline", "carIns", "carUpkeep", "electric", "heatGas", "doctor", "clothing", "fun"]
      .map((id) => [id, { id, yoy: -2, stale: false }]),
  );
  const data = fakeData({ lines, basket: { residualYoy: -2 } });
  const m = personalModel(answersWith({ answered: { health: "none" } }), data);
  assert.match(m.answer, /^About \$[\d,]+ less a year$/);
  assert.equal(shownSum(m), m.total);
});

test("panel: 'under $10' for a tiny non-zero line", () => {
  const data = fakeData();
  const answers = answersWith({ answered: { car: "gas" }, amounts: { clothing: 5 } }); // 60 a year at 3.6% ≈ $2
  const m = personalModel(answers, data);
  assert.equal(m.main.find((r) => r.id === "clothing").dollarText, "under $10");
});

test("panel: zero total replaces the answer and hides lines, bars and verdict", () => {
  const amounts = Object.fromEntries(
    ["rent", "groceries", "dining", "gasoline", "carIns", "carUpkeep", "electric", "heatGas", "health", "doctor", "clothing", "fun", "rest"]
      .map((id) => [id, 0]),
  );
  const m = personalModel(answersWith({ answered: { home: "rent" }, amounts }));
  assert.equal(m.zero, true);
  assert.equal(m.answer, "Enter your monthly amounts to see your estimate.");
  assert.deepEqual(m.top, []);
  assert.equal(m.compare, null);
  assert.equal(m.verdict, null);
});

test("panel: unusable basket in Average says so and invents nothing", () => {
  const m = panelModel({ mode: "average", rows: null, headlinePct: 3.4, referenceMonth: "2026-08", answers: emptyAnswers() });
  assert.equal(m.answer, "Average household figures are not available right now.");
  assert.deepEqual(m.top, []);
  assert.equal(m.ratesLine, "Prices overall rose 3.4%.");
});

test("ledeText: new and returning", () => {
  assert.equal(ledeText({ headlinePct: 3.4, referenceMonth: "2026-08", returning: false }),
    "Prices overall rose 3.4% in the year to August 2026. How much that costs you depends on how you live. Answer four questions to see your estimate.");
  assert.equal(ledeText({ headlinePct: 3.4, referenceMonth: "2026-08", returning: true }), "Updated with August 2026 prices.");
});

test("summaryText: guesses fill in, checkboxes listed, monthly total to $50", () => {
  const answers = answersWith({ answered: { home: "rent" }, also: { daycare: true, tuition: false } });
  const rows = [{ monthly: 3000 }, { monthly: 960 }];
  assert.equal(summaryText(answers, rows),
    "Rent, gas car, natural gas heat, health insurance through work. Paying for daycare. About $3,950 a month.");
  const both = answersWith({ answered: { home: "mortgage", car: "none" }, also: { daycare: true, tuition: true } });
  assert.match(summaryText(both, rows), /^Fixed-rate mortgage, no car, .* Paying for daycare and college tuition\. /);
});

test("finePrint: month, stale lines, missing data, yoyGap", () => {
  const data = fakeData({
    lines: {
      carIns: { id: "carIns", yoy: -5.1, stale: true },
      daycare: { id: "daycare", yoy: null, stale: false },
    },
    yoyGap: { latestMonthLabel: "October 2026", missingMonthLabel: "October 2025" },
  });
  const rows = personalRows(answersWith({ also: { daycare: true, tuition: false } }), data);
  assert.deepEqual(finePrint({ mode: "personal", rows, data }), [
    "Estimates based on BLS consumer price data for August 2026. Dollar amounts are rounded.",
    "Using the last known value for car insurance.",
    "No recent price data for daycare, so it is left out.",
    "The newest price data is for October 2026, but no figures were published for October 2025, so these estimates use August 2026.",
  ]);
  const staleBasket = fakeData({ basket: { stale: true } });
  assert.deepEqual(finePrint({ mode: "average", rows: averageRows(staleBasket, 5750), data: staleBasket }), [
    "Estimates based on BLS consumer price data for August 2026. Dollar amounts are rounded.",
    "Using the last known value for the average household.",
  ]);
});

test("panel copy obeys the voice guide's banned characters", () => {
  const data = fakeData({ yoyGap: { latestMonthLabel: "October 2026", missingMonthLabel: "October 2025" } });
  const answers = answersWith({ answered: { home: "mortgage", car: "electric" }, also: { daycare: true, tuition: true } });
  const rows = personalRows(answers, data);
  const m = personalModel(answers, data);
  const text = JSON.stringify([m, finePrint({ mode: "personal", rows, data }), summaryText(answers, rows),
    ledeText({ headlinePct: 3.4, referenceMonth: "2026-08", returning: false })]);
  for (const banned of ["—", "·", "→", "!", "CPI", "YoY"]) {
    assert.ok(!text.includes(banned), `found ${banned}`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/calculator/panel.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `panel.js`.

- [ ] **Step 3: Implement** — create `src/calculator/panel.js`:

```js
// Everything the result panel, lede, summary and fine print display, as plain data.
// Pure, so the wording and the "dollar lines add up to the total" rule are unit-tested
// and the React components only lay it out.

import { ALSO, QUESTIONS, SUMMARY_PHRASES } from "./config.js";
import { effectiveChoices, computeResult, verdict, basis, monthlyTotal } from "./model.js";
import {
  formatRate, movePhrase, formatDollars, signedDollars, roundToStep, allocateRounded,
  barGeometry, monthLabel, joinAnd,
} from "./format.js";

/** Rows shown before "N smaller items" (Everything else is never counted here). */
export const TOP_ROWS = 6;

const UNAVAILABLE = "Average household figures are not available right now.";

/**
 * @param {object} p
 * @param {"average"|"personal"} p.mode
 * @param {object[]|null} p.rows  personalRows() or averageRows() output; null = basket unusable
 * @param {number|null} p.headlinePct  data.headline.yoy
 * @param {string|null} p.referenceMonth  "YYYY-MM"
 * @param {object} p.answers
 */
export function panelModel({ mode, rows, headlinePct, referenceMonth, answers }) {
  const personal = mode === "personal";
  const title = `${personal ? "Your costs" : "The average U.S. household"} vs. ${monthLabel(referenceMonth, -1)}`;
  const nationalLine = headlinePct == null ? "" : `Prices overall ${movePhrase(headlinePct)}.`;
  const empty = {
    title, compare: null, verdict: null, basis: null, top: [], main: [], smaller: null, rest: null,
    allCount: 0, prompts: [], bars: personal, actionLabel: personal ? "Change answers" : "Answer the questions",
  };

  if (rows == null) return { ...empty, answer: UNAVAILABLE, ratesLine: nationalLine, zero: false };

  const result = computeResult(rows);
  const prompts = result.excluded
    .filter((r) => r.missing === "renewal")
    .map((r) => ({ id: r.id, text: `${r.label}: add your renewal increase` }));
  const basisText = personal ? basis(answers) : null;

  if (result.totalAnnual === 0) {
    return {
      ...empty, prompts, basis: basisText, zero: true,
      answer: "Enter your monthly amounts to see your estimate.", ratesLine: nationalLine,
    };
  }

  const total = roundToStep(result.totalExtra, 50);
  const answer =
    total > 0 ? `About ${formatDollars(total)} more a year`
    : total < 0 ? `About ${formatDollars(total)} less a year`
    : "About the same as a year ago";
  const ratesLine = personal && result.rate != null
    ? `Your costs ${movePhrase(result.rate)}. ${nationalLine}`.trim()
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
  const tail = main.slice(TOP_ROWS);
  const smaller = tail.length === 0 ? null : {
    count: tail.length,
    text: `${tail.length} smaller ${tail.length === 1 ? "item" : "items"}`,
    dollars: tail.reduce((s, r) => s + r.dollars, 0),
    dollarText: signedDollars(tail.reduce((s, r) => s + r.dollars, 0)),
  };

  let compare = null;
  if (personal && result.rate != null && headlinePct != null) {
    const [you, us] = barGeometry([result.rate, headlinePct]);
    compare = {
      you: { text: formatRate(result.rate), bar: you },
      us: { text: formatRate(headlinePct), bar: us },
    };
  }

  return {
    ...empty,
    answer,
    ratesLine,
    zero: false,
    total,
    compare,
    verdict: personal ? verdict(result, headlinePct) : null,
    basis: basisText,
    top: main.slice(0, TOP_ROWS),
    main,
    smaller,
    rest,
    allCount: main.length + (rest ? 1 : 0),
    prompts,
  };
}

/** The lede under the headline. Returning visitors see the folded one-liner. */
export function ledeText({ headlinePct, referenceMonth, returning }) {
  const month = monthLabel(referenceMonth);
  if (returning) return `Updated with ${month} prices.`;
  const first = headlinePct == null ? "" : `Prices overall ${movePhrase(headlinePct)} in the year to ${month}. `;
  return `${first}How much that costs you depends on how you live. Answer four questions to see your estimate.`;
}

/** "Rent, gas car, natural gas heat, health insurance through work. Paying for daycare. About $3,950 a month." */
export function summaryText(answers, rows) {
  const choices = effectiveChoices(answers);
  const phrases = QUESTIONS.map((q) => SUMMARY_PHRASES[q.id][choices[q.id]]).join(", ");
  let s = `${phrases[0].toUpperCase()}${phrases.slice(1)}.`;
  const also = ALSO.filter((a) => answers.also[a.id]).map((a) => a.phrase);
  if (also.length > 0) s += ` Paying for ${joinAnd(also)}.`;
  return `${s} About ${formatDollars(roundToStep(monthlyTotal(rows), 50))} a month.`;
}

/** Fine-print sentences under the panel: source month, stale values, missing data, yoyGap. */
export function finePrint({ mode, rows, data }) {
  const out = [
    `Estimates based on BLS consumer price data for ${monthLabel(data.referenceMonth)}. Dollar amounts are rounded.`,
  ];
  const list = rows ?? [];
  if (mode === "average") {
    if (list.some((r) => r.stale)) out.push("Using the last known value for the average household.");
  } else {
    const stale = list.filter((r) => r.stale).map((r) => r.label.toLowerCase());
    if (stale.length > 0) out.push(`Using the last known value for ${joinAnd(stale)}.`);
    const missing = list.filter((r) => r.missing === "data").map((r) => r.label.toLowerCase());
    if (missing.length > 0) {
      out.push(`No recent price data for ${joinAnd(missing)}, so ${missing.length === 1 ? "it is" : "they are"} left out.`);
    }
  }
  if (data.yoyGap) {
    out.push(
      `The newest price data is for ${data.yoyGap.latestMonthLabel}, but no figures were published for ${data.yoyGap.missingMonthLabel}, so these estimates use ${monthLabel(data.referenceMonth)}.`,
    );
  }
  return out;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test src/calculator/panel.test.mjs`
Expected: `pass 11`, `fail 0`.

- [ ] **Step 5: Full suite and commit**

Run: `npm test` → expect `pass 111`, `fail 0`.

```bash
git add src/calculator/panel.js src/calculator/panel.test.mjs
git commit -m "feat(calculator): result panel, lede, summary and fine print as data

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Saved answers (`storage.js`)

**Files:**
- Create: `src/calculator/storage.js`
- Test: `src/calculator/storage.test.mjs`

**Interfaces:**
- Consumes: Task 3 `QUESTIONS`, `ALSO`, `LINES`, `emptyAnswers`, `isPersonal`; Task 2 `clampAmount`, `clampRenewal`.
- Produces: `STORAGE_KEY` (`"inflation-reality:answers:v1"`), `STORAGE_VERSION` (1), `serializeAnswers(answers)→string`, `parseSaved(raw)→answers|null`, `getStorage()→Storage|null`, `storageAvailable(storage)→boolean`, `loadAnswers(storage)→answers|null`, `saveAnswers(storage, answers)→boolean` (saves when personal, removes the key otherwise). None of them throw.

- [ ] **Step 1: Write the failing test** — create `src/calculator/storage.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyAnswers } from "./model.js";
import {
  STORAGE_KEY, serializeAnswers, parseSaved, storageAvailable, loadAnswers, saveAnswers,
} from "./storage.js";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}
const throwing = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
  removeItem() { throw new Error("blocked"); },
};

test("round trip keeps answers, checkboxes, amount edits and renewal rates", () => {
  const answers = {
    answered: { home: "mortgage", health: "own" },
    also: { daycare: true, tuition: false },
    amounts: { mortgage: 2100, gasoline: 0 },
    renewals: { health: 12.5, homeIns: null },
  };
  assert.deepEqual(parseSaved(serializeAnswers(answers)), answers);
});

test("unparseable, non-object, or other version is discarded", () => {
  assert.equal(parseSaved(null), null);
  assert.equal(parseSaved("{not json"), null);
  assert.equal(parseSaved("[1,2]"), null);
  assert.equal(parseSaved(JSON.stringify({ version: 2, answered: { home: "rent" } })), null);
  assert.equal(parseSaved(JSON.stringify({ answered: { home: "rent" } })), null);
});

test("unknown ids, options and bad values are ignored one by one", () => {
  const raw = JSON.stringify({
    version: 1,
    answered: { home: "castle", car: "none", pets: "dog" },
    also: { daycare: "yes", tuition: true, boat: true },
    amounts: { rent: 250000, doctor: "90", yacht: 5, ["__proto__"]: 1, groceries: -3 },
    renewals: { health: 400, homeIns: "6", rent: 5 },
  });
  assert.deepEqual(parseSaved(raw), {
    answered: { car: "none" },
    also: { daycare: false, tuition: true },
    amounts: { rent: 100000, groceries: 0 },
    renewals: { health: 100 },
  });
});

test("saveAnswers stores personal answers and clears otherwise", () => {
  const s = memoryStorage();
  const personal = { ...emptyAnswers(), answered: { car: "gas" } };
  assert.equal(saveAnswers(s, personal), true);
  assert.deepEqual(loadAnswers(s), personal);
  assert.equal(saveAnswers(s, emptyAnswers()), true);
  assert.equal(s.getItem(STORAGE_KEY), null);
  assert.equal(loadAnswers(s), null);
});

test("blocked storage never throws", () => {
  assert.equal(storageAvailable(throwing), false);
  assert.equal(storageAvailable(null), false);
  assert.equal(storageAvailable(memoryStorage()), true);
  assert.equal(loadAnswers(throwing), null);
  assert.equal(loadAnswers(null), null);
  assert.equal(saveAnswers(throwing, { ...emptyAnswers(), answered: { car: "gas" } }), false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/calculator/storage.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `storage.js`.

- [ ] **Step 3: Implement** — create `src/calculator/storage.js`:

```js
// Saved answers, in this browser only (spec "States": inflation-reality:answers:v1).
// parseSaved is pure and does all validation; the rest wrap localStorage and never throw.

import { QUESTIONS, ALSO, LINES } from "./config.js";
import { emptyAnswers, isPersonal } from "./model.js";
import { clampAmount, clampRenewal } from "./format.js";

export const STORAGE_KEY = "inflation-reality:answers:v1";
export const STORAGE_VERSION = 1;

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

export function serializeAnswers(answers) {
  const { answered, also, amounts, renewals } = answers;
  return JSON.stringify({ version: STORAGE_VERSION, answered, also, amounts, renewals });
}

/**
 * Raw stored string → answers, or null when unparseable or another version.
 * Unknown questions, options, line ids and bad values are dropped one by one;
 * the rest is kept.
 */
export function parseSaved(raw) {
  if (typeof raw !== "string") return null;
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(saved) || saved.version !== STORAGE_VERSION) return null;

  const answers = emptyAnswers();
  const answered = isObject(saved.answered) ? saved.answered : {};
  for (const q of QUESTIONS) {
    if (q.options.some((o) => o.id === answered[q.id])) answers.answered[q.id] = answered[q.id];
  }
  const also = isObject(saved.also) ? saved.also : {};
  for (const a of ALSO) if (also[a.id] === true) answers.also[a.id] = true;
  if (isObject(saved.amounts)) {
    for (const [id, v] of Object.entries(saved.amounts)) {
      if (Object.hasOwn(LINES, id) && isNumber(v)) answers.amounts[id] = clampAmount(v);
    }
  }
  if (isObject(saved.renewals)) {
    for (const [id, v] of Object.entries(saved.renewals)) {
      if (!Object.hasOwn(LINES, id) || !LINES[id].renewal) continue;
      if (v === null) answers.renewals[id] = null;
      else if (isNumber(v)) answers.renewals[id] = clampRenewal(v);
    }
  }
  return answers;
}

/** window.localStorage, or null when the browser blocks access. */
export function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** True when writes actually work (Safari private mode and blocked site data fail here). */
export function storageAvailable(storage) {
  if (!storage) return false;
  try {
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function loadAnswers(storage) {
  try {
    return parseSaved(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

/** Saves personal answers; clears the key otherwise (Average, or after Start over). */
export function saveAnswers(storage, answers) {
  try {
    if (isPersonal(answers)) storage.setItem(STORAGE_KEY, serializeAnswers(answers));
    else storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test src/calculator/storage.test.mjs`
Expected: `pass 5`, `fail 0`.

- [ ] **Step 5: Full suite and commit**

Run: `npm test` → expect `pass 116`, `fail 0`.

```bash
git add src/calculator/storage.js src/calculator/storage.test.mjs
git commit -m "feat(calculator): versioned saved answers with per-entry validation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Tokens, controls and the font

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/controls.css`
- Modify: `index.html`
- Test: `src/styles/tokens.test.mjs`

**Interfaces:**
- Consumes: spec "Visual system" token table (values copied verbatim below).
- Produces: CSS custom properties `--ground --surface --ink --ink-2 --ink-3 --rule --control-edge --control-hover --accent --accent-ink --accent-soft --bar-us --bar-line --dock --dock-ink --shadow --font`; control classes `.btn .opt .opt.guess .guess-tag .text-btn .text-link .check .disclosure .money .sections .section-link .sr`. The stylesheets are imported by `src/main.jsx` in Task 7.

- [ ] **Step 1: Write the failing test** — create `src/styles/tokens.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..");
const css = readFileSync(resolve(here, "tokens.css"), "utf8");

// Hex color tokens inside the first block matching `selector {`.
function tokens(selectorPattern) {
  const m = new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(m, `block ${selectorPattern} exists`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].map((x) => [x[1], x[2]]));
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

const light = tokens(":root");
const darkMedia = tokens(':root:not\\(\\[data-theme="light"\\]\\)');
const darkAttr = tokens(':root\\[data-theme="dark"\\]');

test("both dark blocks are identical and every theme defines the same tokens", () => {
  assert.deepEqual(darkMedia, darkAttr);
  assert.deepEqual(Object.keys(darkAttr).sort(), Object.keys(light).sort());
  assert.equal(Object.keys(light).length, 15);
});

// Design rule 7.
for (const [name, t] of [["light", light], ["dark", darkAttr]]) {
  test(`contrast (${name}): text pairs at least 4.5:1`, () => {
    const pairs = [
      ["ink", "ground"], ["ink", "surface"], ["ink-2", "ground"], ["ink-2", "surface"],
      ["ink-3", "ground"], ["ink-3", "surface"], ["accent-ink", "accent"], ["dock-ink", "dock"],
    ];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= 4.5, `--${fg} on --${bg} is ${ratio.toFixed(2)}`);
    }
  });

  test(`contrast (${name}): non-text pairs at least 3:1`, () => {
    const pairs = [
      ["control-edge", "surface"], ["accent", "surface"], ["bar-us", "surface"], ["bar-line", "surface"],
      ["accent", "ground"],
    ];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= 3, `--${fg} on --${bg} is ${ratio.toFixed(2)}`);
    }
  });
}

// "Components never use literal colors." Scans the new UI files that exist so far.
test("no literal colors outside tokens.css in the new UI", () => {
  const files = [];
  for (const dir of ["styles", "components"]) {
    const full = join(src, dir);
    if (!existsSync(full)) continue;
    for (const f of readdirSync(full)) {
      if (/\.(css|jsx|js)$/.test(f) && f !== "tokens.css") files.push(join(full, f));
    }
  }
  for (const f of ["views/YourCosts.jsx", "App.jsx"]) {
    if (existsSync(join(src, f))) files.push(join(src, f));
  }
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/.test(text), `literal color in ${file}`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/styles/tokens.test.mjs`
Expected: FAIL with `ENOENT` reading `tokens.css`.

- [ ] **Step 3: Create the tokens** — `src/styles/tokens.css`:

```css
/* Visual system tokens (spec "Visual system"). Components never use literal colors:
   every color below is the only place it is written. Light first, then dark for
   the system setting, then dark for an explicit data-theme="dark". The two dark
   blocks must stay identical (tokens.test.mjs checks). */
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

- [ ] **Step 4: Create the controls** — `src/styles/controls.css`:

```css
/* Controls (spec "Visual system": Controls, Navigation, Motion). Colors come only from tokens.css. */

[hidden] { display: none !important; }

.btn,
.opt,
.check,
.disclosure {
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--control-edge);
  border-radius: 6px;
  min-height: 44px;
  cursor: pointer;
}

.btn { font-weight: 600; padding: 11px 16px; }
.opt { font-weight: 600; padding: 11px 14px; text-align: left; }

.btn:hover,
.opt:hover,
.check:hover,
.disclosure:hover {
  background: var(--control-hover);
  border-color: var(--ink);
}

.btn:active,
.opt:active { background: var(--accent-soft); }

/* Selected: accent fill, check mark prefix, aria-pressed="true" (never color alone). */
.opt[aria-pressed="true"] {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}
.opt[aria-pressed="true"]::before { content: "\2713\00a0"; }

/* Guessed: dashed accent border, soft fill, "our guess" tag; stays aria-pressed="false". */
.opt.guess {
  border-style: dashed;
  border-color: var(--accent);
  background: var(--accent-soft);
}
.guess-tag { font-weight: 500; font-size: 13px; color: var(--ink-2); margin-left: 6px; }

.text-btn,
.text-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0;
  font-weight: 600;
  font-size: 15px;
  color: var(--ink);
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  justify-self: start;
}
.text-btn:hover,
.text-link:hover { text-decoration-thickness: 2px; }

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  padding: 10px 14px;
}
.check input { width: 20px; height: 20px; margin: 0; accent-color: var(--accent); }
.check:has(input:checked) { border-color: var(--accent); background: var(--accent-soft); }

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

.money { display: inline-flex; align-items: center; gap: 6px; }
.money input {
  width: 6.5em;
  min-height: 44px;
  padding: 9px 10px;
  font-weight: 600;
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--control-edge);
  border-radius: 6px;
}
.money input:hover { border-color: var(--ink); }
.money input.pct { width: 4.4em; }

/* Section links: plain links, current one underlined with aria-current="page". */
.sections { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; list-style: none; }
.section-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 12px;
  font-weight: 600;
  font-size: 15px;
  color: var(--ink-2);
  text-decoration: none;
  border-radius: 6px 6px 0 0;
}
.section-link:hover { color: var(--ink); background: var(--control-hover); }
.section-link[aria-current="page"] { color: var(--ink); box-shadow: inset 0 -3px 0 var(--ink); }

.btn:focus-visible,
.opt:focus-visible,
.text-btn:focus-visible,
.text-link:focus-visible,
.disclosure:focus-visible,
.section-link:focus-visible,
.brand:focus-visible,
.money input:focus-visible,
.check:has(input:focus-visible),
[tabindex="-1"]:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
.check input:focus-visible { outline: none; }

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `node --test src/styles/tokens.test.mjs`
Expected: `pass 6`, `fail 0`. (If a contrast pair fails, a token value was mistyped: compare with the spec table. Do not change a token to make the test pass.)

- [ ] **Step 6: Add the font** — replace `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inflation Reality</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400..800&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Full suite, build and commit**

Run: `npm test` → expect `pass 122`, `fail 0`. Run: `npx vite build` → expect `✓ built` (the pre-existing "chunks are larger than 500 kB" warning is expected).

```bash
git add src/styles/tokens.css src/styles/controls.css src/styles/tokens.test.mjs index.html
git commit -m "feat(styles): design tokens, control states and Libre Franklin

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Shell: routing, section nav, legacy views

**Files:**
- Create: `src/routes.js`, `src/data/payload.js`, `src/components/SectionNav.jsx`, `src/views/YourCostsIntro.jsx`, `src/views/YourCosts.jsx` (first version), `src/styles/calculator.css`
- Move + modify: `src/App.jsx` → `src/views/LegacyDashboard.jsx`
- Create (replacing the moved file): `src/App.jsx`
- Modify: `src/main.jsx`, `src/index.css`
- Test: `src/routes.test.mjs`, `src/data/payload.test.mjs`

**Interfaces:**
- Consumes: Task 1 `buildViewData`; Task 4 `ledeText`; Task 6 CSS.
- Produces:
  - `routes.js`: `ROUTES` (`{id,label}[]`: `your-costs`, `national-numbers`, `price-check`, `sources`), `routeFromHash(hash)→id`, `hrefFor(id, base)→string`, `isPlainClick(event)→boolean`.
  - `payload.js`: `isPlausiblePayload(json)→boolean` (the check formerly inline in `App.jsx`, unchanged).
  - `LegacyDashboard({ dynamic, view: "dashboard"|"prices"|"methodology" })`.
  - `SectionNav({ route, base, onNavigate(id) })`, `YourCostsIntro({ data, base, onNavigate, returning })`.
  - `YourCosts({ data, base, onNavigate })` (Task 8 replaces its body).
  - `App` passes `data = buildViewData(catalog, dynamic)` and `navigate(id)` (pushState + route state).

- [ ] **Step 1: Write the failing tests** — create `src/routes.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUTES, routeFromHash, hrefFor, isPlainClick } from "./routes.js";

test("routeFromHash: known hashes, empty, unknown", () => {
  assert.equal(routeFromHash(""), "your-costs");
  assert.equal(routeFromHash(undefined), "your-costs");
  assert.equal(routeFromHash("#national-numbers"), "national-numbers");
  assert.equal(routeFromHash("#price-check"), "price-check");
  assert.equal(routeFromHash("#sources"), "sources");
  assert.equal(routeFromHash("#your-costs"), "your-costs");
  assert.equal(routeFromHash("#nope"), "your-costs");
});

test("hrefFor: Your costs is the bare base path, the rest are hashes", () => {
  const base = "/inflation-reality/";
  assert.equal(hrefFor("your-costs", base), "/inflation-reality/");
  assert.equal(hrefFor("price-check", base), "/inflation-reality/#price-check");
  assert.deepEqual(ROUTES.map((r) => r.label), ["Your costs", "National numbers", "Price check", "Sources"]);
});

test("isPlainClick ignores modified and non-left clicks", () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  assert.equal(isPlainClick(click), true);
  assert.equal(isPlainClick({ ...click, metaKey: true }), false);
  assert.equal(isPlainClick({ ...click, button: 1 }), false);
});
```

and `src/data/payload.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { isPlausiblePayload } from "./payload.js";

test("isPlausiblePayload accepts trend + categories, lines and basket optional", () => {
  assert.equal(isPlausiblePayload({ trend: [], categories: {} }), true);
  assert.equal(isPlausiblePayload({ trend: [], categories: {}, lines: {}, basket: { stale: true } }), true);
});

test("isPlausiblePayload rejects null, arrays and missing keys", () => {
  assert.equal(isPlausiblePayload(null), false);
  assert.equal(isPlausiblePayload([]), false);
  assert.equal(isPlausiblePayload({ trend: [] }), false);
  assert.equal(isPlausiblePayload({ trend: {}, categories: {} }), false);
  assert.equal(isPlausiblePayload({ trend: [], categories: [] }), false);
  assert.equal(isPlausiblePayload({ trend: [], categories: null }), false);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test src/routes.test.mjs src/data/payload.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `routes.js` and `payload.js`.

- [ ] **Step 3: Implement the pure modules** — create `src/routes.js`:

```js
// Section routes (spec "Other tabs"): Your costs has no hash; the others are hashes.
// Pure helpers; App.jsx owns the history and event wiring.

export const ROUTES = [
  { id: "your-costs", label: "Your costs" },
  { id: "national-numbers", label: "National numbers" },
  { id: "price-check", label: "Price check" },
  { id: "sources", label: "Sources" },
];

/** location.hash → route id. No hash or an unknown hash renders Your costs. */
export function routeFromHash(hash) {
  const id = String(hash ?? "").replace(/^#/, "");
  return id !== "your-costs" && ROUTES.some((r) => r.id === id) ? id : "your-costs";
}

/** Link target for a route under the site base path ("/inflation-reality/"). */
export function hrefFor(id, base) {
  return id === "your-costs" ? base : `${base}#${id}`;
}

/** A plain left click with no modifier: safe to handle in-page instead of letting the browser navigate. */
export function isPlainClick(e) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
```

and `src/data/payload.js`:

```js
// Shape check for a fetched cpi.json before it replaces the bundled fallback.
// Deliberately loose: only the keys the legacy views cannot render without.
// The calculator's `lines` and `basket` are optional here; buildViewData turns
// their absence into nulls, and the page says the data is missing.

export function isPlausiblePayload(json) {
  return json !== null && typeof json === "object"
    && Array.isArray(json.trend)
    && json.categories !== null && typeof json.categories === "object" && !Array.isArray(json.categories);
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `node --test src/routes.test.mjs src/data/payload.test.mjs`
Expected: `pass 5`, `fail 0`.

- [ ] **Step 5: Move the old dashboard**

```bash
mkdir -p src/views
git mv src/App.jsx src/views/LegacyDashboard.jsx
```

Then edit `src/views/LegacyDashboard.jsx` so that it matches this diff exactly (paths fixed, data loading and the internal tab bar removed, component renamed and given `dynamic` and `view` props; nothing else changes):

```diff
@@ -1,8 +1,7 @@
-import { useState, useMemo, useCallback, useEffect } from "react";
+import { useState, useMemo, useCallback } from "react";
 import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } from "recharts";
-import * as catalog from "./data/catalog.js";
-import { buildViewData, staleLabels } from "./data/merge.js";
-import fallbackDynamic from "./data/fallback.json";
+import * as catalog from "../data/catalog.js";
+import { buildViewData, staleLabels } from "../data/merge.js";
 
 const PRESETS = {
   bls: { label: "BLS Default", desc: "Official CPI-U weights", icon: "📊" },
@@ -153,33 +152,14 @@
 // ═══════════════════════════════════════════════════════════════
 // MAIN DASHBOARD
 // ═══════════════════════════════════════════════════════════════
-export default function InflationTracker() {
-  const [dynamic, setDynamic] = useState(fallbackDynamic);
-
-  useEffect(() => {
-    let cancelled = false;
-    fetch(`${import.meta.env.BASE_URL}cpi.json`)
-      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`cpi.json HTTP ${r.status}`))))
-      .then(json => {
-        if (cancelled) return;
-        const isPlausible = json !== null && typeof json === "object"
-          && Array.isArray(json.trend)
-          && json.categories !== null && typeof json.categories === "object" && !Array.isArray(json.categories);
-        if (!isPlausible) {
-          console.warn("Using bundled fallback data: cpi.json payload failed shape check (missing/invalid trend or categories)");
-          return;
-        }
-        setDynamic(json);
-      })
-      .catch(err => { console.warn("Using bundled fallback data:", err.message); });
-    return () => { cancelled = true; };
-  }, []);
-
+// The pre-redesign dashboard, kept whole so the National numbers, Price check and
+// Sources sections work until Phase 2b rebuilds them. App.jsx owns data loading and
+// picks the view; the old internal tab bar is gone.
+export default function LegacyDashboard({ dynamic, view }) {
   const data = useMemo(() => buildViewData(catalog, dynamic), [dynamic]);
 
   const [weights, setWeights] = useState(presetWeights.bls);
   const [activePreset, setActivePreset] = useState("bls");
-  const [view, setView] = useState("dashboard");
 
   const totalWeight = useMemo(() => Object.values(weights).reduce((a, b) => a + b, 0), [weights]);
 
@@ -449,20 +429,6 @@
               Live FRED data · updated {formatUpdated(data.generatedAt)}
             </div>
           )}
-          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
-            {[
-              { key: "dashboard", label: "Dashboard" },
-              { key: "prices", label: "Price Check" },
-              { key: "methodology", label: "Sources & Method" },
-            ].map(tab => (
-              <button key={tab.key} onClick={() => setView(tab.key)} style={{
-                padding: "6px 16px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12,
-                fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: 0.3,
-                background: view === tab.key ? "#415A77" : "transparent",
-                color: view === tab.key ? "#fff" : "#778DA9",
-              }}>{tab.label}</button>
-            ))}
-          </div>
         </div>
       </header>
 
```

Check: `grep -n "setView\|useEffect\|fallbackDynamic\|InflationTracker" src/views/LegacyDashboard.jsx` prints nothing.

- [ ] **Step 6: Create the shell** — `src/App.jsx`:

```jsx
import { useEffect, useMemo, useState } from "react";
import * as catalog from "./data/catalog.js";
import { buildViewData } from "./data/merge.js";
import { isPlausiblePayload } from "./data/payload.js";
import fallbackDynamic from "./data/fallback.json";
import { routeFromHash, hrefFor } from "./routes.js";
import SectionNav from "./components/SectionNav.jsx";
import YourCosts from "./views/YourCosts.jsx";
import LegacyDashboard from "./views/LegacyDashboard.jsx";

const BASE = import.meta.env.BASE_URL;

// Until Phase 2b rebuilds them, the other sections render the old dashboard's views.
const LEGACY_VIEW = { "national-numbers": "dashboard", "price-check": "prices", sources: "methodology" };

/** Shell only: data loading (bundled fallback, then cpi.json), hash routing, section nav. */
export default function App() {
  const [dynamic, setDynamic] = useState(fallbackDynamic);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}cpi.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`cpi.json HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled) return;
        if (!isPlausiblePayload(json)) {
          console.warn("Using bundled fallback data: cpi.json payload failed shape check (missing/invalid trend or categories)");
          return;
        }
        setDynamic(json);
      })
      .catch((err) => { console.warn("Using bundled fallback data:", err.message); });
    return () => { cancelled = true; };
  }, []);

  const data = useMemo(() => buildViewData(catalog, dynamic), [dynamic]);

  const [route, setRoute] = useState(() => routeFromHash(window.location.hash));
  useEffect(() => {
    const sync = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  // Section links push a normal history entry. pushState (not a bare href) because
  // leaving a hash for the bare base path would otherwise reload the page.
  const navigate = (id) => {
    if (id !== route) {
      window.history.pushState(null, "", hrefFor(id, BASE));
      setRoute(id);
    }
    window.scrollTo(0, 0);
  };

  return (
    <div className="wrap">
      <SectionNav route={route} base={BASE} onNavigate={navigate} />
      <main>
        {route === "your-costs"
          ? <YourCosts data={data} base={BASE} onNavigate={navigate} />
          : <LegacyDashboard dynamic={dynamic} view={LEGACY_VIEW[route]} />}
      </main>
    </div>
  );
}
```

`src/components/SectionNav.jsx`:

```jsx
import { ROUTES, hrefFor, isPlainClick } from "../routes.js";

/** Site header: brand plus the four section links. Links are real hrefs; plain clicks route in-page. */
export default function SectionNav({ route, base, onNavigate }) {
  const go = (id) => (e) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    onNavigate(id);
  };
  return (
    <header className="site">
      <a className="brand" href={base} onClick={go("your-costs")}>Inflation Reality</a>
      <nav aria-label="Sections">
        <ul className="sections">
          {ROUTES.map((r) => (
            <li key={r.id}>
              <a
                className="section-link"
                href={hrefFor(r.id, base)}
                aria-current={route === r.id ? "page" : undefined}
                onClick={go(r.id)}
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
```

`src/views/YourCostsIntro.jsx`:

```jsx
import { ledeText } from "../calculator/panel.js";
import { hrefFor, isPlainClick } from "../routes.js";

/** Headline, lede and the skip link to National numbers. */
export default function YourCostsIntro({ data, base, onNavigate, returning }) {
  return (
    <div className="intro">
      <h1>How much more are you paying than a year ago?</h1>
      <p className="lede">
        {ledeText({ headlinePct: data.headline.yoy, referenceMonth: data.referenceMonth, returning })}
      </p>
      <a
        className="text-link"
        href={hrefFor("national-numbers", base)}
        onClick={(e) => {
          if (!isPlainClick(e)) return;
          e.preventDefault();
          onNavigate("national-numbers");
        }}
      >
        Just want the national numbers?
      </a>
    </div>
  );
}
```

`src/views/YourCosts.jsx` (first version; Task 8 replaces it):

```jsx
import YourCostsIntro from "./YourCostsIntro.jsx";

/** The Your costs tab. Task 8 of the Phase 2a plan replaces this with the calculator. */
export default function YourCosts({ data, base, onNavigate }) {
  return (
    <section className="calc" aria-label="Your costs">
      <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={false} />
    </section>
  );
}
```

- [ ] **Step 7: Layout CSS and imports** — create `src/styles/calculator.css`:

```css
/* Page shell and Your costs layout. Colors come only from tokens.css. */

.wrap { max-width: 1080px; margin: 0 auto; padding-inline: 16px; padding-block: 0 120px; }

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

/* Phone: intro, questions, result, amounts. Desktop: questions and amounts left, panel sticky right. */
.calc {
  display: grid;
  gap: 30px;
  padding-block: 28px 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "intro" "questions" "result" "amounts";
}
.intro { grid-area: intro; display: grid; gap: 12px; }
.questions-area { grid-area: questions; display: grid; gap: 26px; }
.result-col { grid-area: result; align-self: start; }
.amounts { grid-area: amounts; }
@media (min-width: 900px) {
  .calc {
    grid-template-columns: minmax(0, 1fr) 400px;
    column-gap: 56px;
    grid-template-rows: auto auto 1fr; /* the tall sticky panel's extra height goes below the amounts */
    grid-template-areas: "intro result" "questions result" "amounts result";
    align-items: start;
  }
  .result-col { position: sticky; top: 16px; }
  .dock { display: none !important; }
  .toast { bottom: 24px; }
}

h1 {
  margin: 0;
  max-width: 17em;
  font-weight: 800;
  font-size: clamp(30px, 7.6vw, 44px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.lede { margin: 0; max-width: 34em; font-size: 18px; color: var(--ink-2); }

.questions { display: grid; gap: 26px; }
.questions:focus { outline: none; }
fieldset.q { min-width: 0; margin: 0; padding: 0; border: 0; }
fieldset.q legend { margin-bottom: 10px; padding: 0; font-weight: 700; font-size: 18px; }
.opts,
.checks { display: flex; flex-wrap: wrap; gap: 8px; }
.help { margin: 10px 0 0; max-width: 36em; font-size: 15px; color: var(--ink-2); }
.saved { margin: 0; font-size: 15px; color: var(--ink-2); }

/* Returning summary: NOT a raised surface, just a section under a rule. */
.summary { display: grid; gap: 10px; padding-top: 18px; border-top: 1px solid var(--rule); }
.summary h2 { margin: 0; font-weight: 700; font-size: 18px; }
.summary p { margin: 0; }
.summary .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; }

/* The one raised surface per view. */
.result { padding: 22px 20px 20px; background: var(--surface); border: 1px solid var(--rule); border-radius: 10px; }
.result h2 { margin: 0; font-weight: 700; font-size: 17px; }
.answer, .compare, .line, .dock, .money, .amt-value { font-variant-numeric: tabular-nums; }
.answer {
  margin: 6px 0 0;
  font-weight: 800;
  font-size: clamp(34px, 9.4vw, 46px);
  line-height: 1.04;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.rates { margin: 10px 0 0; color: var(--ink-2); }

.compare {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 8px 12px;
  margin-top: 14px;
  font-size: 15px;
}
.bar-track { position: relative; height: 10px; }
.bar { position: absolute; top: 0; height: 100%; border-radius: 2px; }
.bar.you { background: var(--accent); }
.bar.us { background: var(--bar-us); }
.cmp-val { text-align: right; font-weight: 700; }

.verdict { margin: 14px 0 0; font-weight: 600; font-size: 17px; line-height: 1.4; }
.basis { margin: 6px 0 0; font-size: 15px; color: var(--ink-2); }

.lines-title { margin: 22px 0 4px; font-weight: 700; font-size: 16px; }
.lines { margin: 0; padding: 0; list-style: none; }
.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 4.4em 5.2em;
  column-gap: 12px;
  align-items: baseline;
  padding-block: 10px;
  border-top: 1px solid var(--rule);
}
.line-name { font-weight: 500; overflow-wrap: anywhere; }
.line-note { display: block; font-weight: 400; font-size: 13px; color: var(--ink-3); }
.line-rate { text-align: right; color: var(--ink-2); }
.line-amt { text-align: right; font-weight: 700; }
.line .bar-track { grid-column: 1 / -1; height: 4px; margin-top: 8px; }
.line .bar { background: var(--bar-line); }
.line.quiet .line-name,
.line.quiet .line-amt { font-weight: 500; color: var(--ink-2); }
.prompts { margin: 8px 0 0; padding: 0; list-style: none; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin-top: 16px; }
.fine { margin-top: 16px; font-size: 13px; color: var(--ink-3); }
.fine p { margin: 0 0 6px; }

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

/* Phone dock and Undo toast: the only shadows; motion only in response to actions. */
.dock {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 10px 10px 16px;
  color: var(--dock-ink);
  background: var(--dock);
  border-radius: 10px;
  box-shadow: var(--shadow);
  transition: transform 200ms ease;
}
.dock.away { transform: translateY(160%); }
.dock-text { display: grid; min-width: 0; line-height: 1.25; }
.dock-label { font-size: 15px; }
.dock-amt { font-weight: 800; font-size: 20px; }
.dock-btn {
  min-height: 44px;
  padding: 12px 14px;
  font-weight: 700;
  font-size: 15px;
  color: var(--dock);
  background: var(--dock-ink);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}
.toast {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(86px + env(safe-area-inset-bottom, 0px));
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
.toast .text-btn { color: var(--dock-ink); }
.dock-btn:focus-visible,
.toast .text-btn:focus-visible { outline: 3px solid var(--dock-ink); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .dock { transition: none; }
}
```

Replace `src/main.jsx` with:

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./styles/tokens.css";
import "./styles/controls.css";
import "./styles/calculator.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Replace `src/index.css` with (the body font now comes from `tokens.css`):

```css
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 8: Full suite, build, look at it**

Run: `npm test` → expect `pass 127`, `fail 0` (this includes `tokens.test.mjs` now scanning `SectionNav.jsx`, `calculator.css` and `App.jsx` for literal colors).
Run: `npx vite build` → `✓ built`.
Run: `npx vite preview --port 4719 --strictPort` and open `http://localhost:4719/inflation-reality/`: the header shows "Inflation Reality" and four section links with "Your costs" underlined; the headline, lede ("Prices overall rose 3.4% in the year to August 2026. …") and "Just want the national numbers?" render; clicking "Price check" shows the old average-prices view with the URL ending `#price-check`; Back returns to Your costs with no reload. The console shows only the expected "Using bundled fallback data: cpi.json HTTP 404" warning (there is no local `public/cpi.json`). Stop the preview server.

- [ ] **Step 9: Commit**

```bash
git add -A src/App.jsx src/views src/components/SectionNav.jsx src/routes.js src/routes.test.mjs src/data/payload.js src/data/payload.test.mjs src/styles/calculator.css src/main.jsx src/index.css
git commit -m "feat(shell): section links with hash routing; old dashboard moves to legacy views

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The Your costs tab

**Files:**
- Create: `src/components/NumberField.jsx`, `src/components/Questions.jsx`, `src/components/Summary.jsx`, `src/components/Amounts.jsx`, `src/components/ResultPanel.jsx`, `src/components/Dock.jsx`, `src/components/Toast.jsx`, `src/components/LiveRegion.jsx`
- Replace: `src/views/YourCosts.jsx`

**Interfaces:**
- Consumes: Task 3 (`emptyAnswers`, `isPersonal`, `effectiveChoices`, `personalRows`, `averageRows`, `QUESTIONS`, `ALSO`, `COMMON`, `EXPLANATIONS`, `LINES`); Task 4 (`panelModel`, `summaryText`, `finePrint`); Task 5 (`getStorage`, `storageAvailable`, `loadAnswers`, `saveAnswers`); Task 2 (`formatDollars`, `parseAmountInput`, `parseRenewalInput`); Task 7 (`YourCostsIntro`, CSS classes); catalog `BASKET.ceMonthlyMean`.
- Produces: the finished tab. DOM ids other code relies on: `questions` (focus target for "Change answers" / "Answer the questions"), `amount-<lineId>`, `renewal-<lineId>` (focus target for renewal prompts), `amounts-body`.

Behavior this task must produce (spec "States", "Order", "Result panel", "Accessibility"):
- First visit: Average state, nothing selected, panel shows title/answer/rates line/lines, **Answer the questions**; no bars, verdict or basis.
- Any answer or checkbox: Personal; unanswered questions show dashed guesses with "our guess"; panel adds bars, verdict and basis; everything updates live.
- Load with saved personal answers: folded (lede "Updated with August 2026 prices.", unboxed summary with **Change answers** and **Start over**). Never folds while answering.
- **Start over** clears answers and storage and shows the toast; **Undo** restores them. The toast's 8-second timer pauses on hover and focus.
- An empty renewal line shows a prompt row; its button opens "Adjust monthly amounts" and focuses that renewal box.
- Phone dock shows while the panel is off screen; **See details** scrolls to the panel. Hidden at ≥ 900px, where the panel is sticky.
- A persistent visually hidden `aria-live="polite"` region announces title, answer and verdict, debounced 1 second.

- [ ] **Step 1: Input components** — create `src/components/NumberField.jsx`:

```jsx
import { useState } from "react";

/**
 * A text box for a number. Keeps what the person is typing ("4.", "-") as a draft
 * while every keystroke commits the parsed, clamped value, so nothing is lost if the
 * box unmounts mid-edit. On blur the box shows the committed value again.
 */
export default function NumberField({ id, value, parse, onCommit, inputMode, className, describedBy }) {
  const [draft, setDraft] = useState(null);
  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      aria-describedby={describedBy}
      value={draft ?? (value == null ? "" : String(value))}
      onChange={(e) => {
        setDraft(e.target.value);
        onCommit(parse(e.target.value));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
```

`src/components/Questions.jsx`:

```jsx
import { QUESTIONS, ALSO, COMMON, EXPLANATIONS } from "../calculator/config.js";
import { effectiveChoices } from "../calculator/model.js";

/**
 * The four questions plus "Also paying for". In Personal, unanswered questions show
 * the common answer as a guess (dashed, "our guess", aria-pressed="false").
 */
export default function Questions({ answers, personal, onAnswer, onAlso }) {
  const choices = effectiveChoices(answers);
  return (
    <div className="questions" id="questions" tabIndex={-1}>
      {QUESTIONS.map((q) => {
        const answered = answers.answered[q.id];
        const explanation = personal ? EXPLANATIONS[q.id]?.[choices[q.id]] : null;
        return (
          <fieldset className="q" key={q.id}>
            <legend>{q.legend}</legend>
            <div className="opts">
              {q.options.map((o) => {
                const guessed = personal && !answered && COMMON[q.id] === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={guessed ? "opt guess" : "opt"}
                    aria-pressed={answered === o.id ? "true" : "false"}
                    onClick={() => onAnswer(q.id, o.id)}
                  >
                    {o.label}
                    {guessed && <span className="guess-tag">our guess</span>}
                  </button>
                );
              })}
            </div>
            {explanation && <p className="help">{explanation}</p>}
          </fieldset>
        );
      })}
      <fieldset className="q">
        <legend>Also paying for</legend>
        <div className="checks">
          {ALSO.map((a) => (
            <label className="check" key={a.id}>
              <input
                type="checkbox"
                checked={answers.also[a.id]}
                onChange={(e) => onAlso(a.id, e.target.checked)}
              />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
```

`src/components/Summary.jsx`:

```jsx
/** Returning visitor's folded answers. Deliberately unboxed (not a raised surface). */
export default function Summary({ text, canSave, onChangeAnswers, onStartOver }) {
  return (
    <section className="summary" aria-labelledby="summary-title">
      <h2 id="summary-title">Your answers</h2>
      <p>{text}</p>
      {canSave && <p className="saved">Saved in this browser only.</p>}
      <div className="row">
        <button type="button" className="btn" onClick={onChangeAnswers}>Change answers</button>
        <button type="button" className="text-btn" onClick={onStartOver}>Start over</button>
      </div>
    </section>
  );
}
```

`src/components/Amounts.jsx`:

```jsx
import { LINES } from "../calculator/config.js";
import { formatDollars, parseAmountInput, parseRenewalInput } from "../calculator/format.js";
import NumberField from "./NumberField.jsx";

/**
 * "Adjust monthly amounts" (Personal, editable) or "See the monthly amounts"
 * (Average, read-only), collapsed by default. Renewal lines also take the
 * increase from the person's renewal notice.
 */
export default function Amounts({ rows, personal, monthlyMean, open, onToggle, onAmount, onRenewal }) {
  return (
    <section className="amounts" aria-label="Monthly amounts">
      <button
        type="button"
        className="disclosure"
        aria-expanded={open ? "true" : "false"}
        aria-controls="amounts-body"
        onClick={onToggle}
      >
        {personal ? "Adjust monthly amounts" : "See the monthly amounts"}
      </button>
      <div className="amounts-body" id="amounts-body" hidden={!open}>
        {rows == null ? (
          <p>Average household figures are not available right now.</p>
        ) : (
          <>
            <p>
              {personal
                ? "These are starting estimates. Change any amount to match what you pay."
                : `The average U.S. household spends about ${formatDollars(monthlyMean)} a month. Answer the questions to enter your own amounts.`}
            </p>
            <div className="amt-list">
              {rows.map((r) => {
                const line = Object.hasOwn(LINES, r.id) ? LINES[r.id] : null;
                const hintId = line?.hint ? `hint-${r.id}` : undefined;
                return (
                  <div className="amt-row" key={r.id}>
                    {personal ? (
                      <label className="amt-label" htmlFor={`amount-${r.id}`}>
                        {r.label}
                        {line?.hint && <span className="amt-hint" id={hintId}>{line.hint}</span>}
                      </label>
                    ) : (
                      <span className="amt-label">{r.label}</span>
                    )}
                    {personal ? (
                      <span className="money">
                        $
                        <NumberField
                          id={`amount-${r.id}`}
                          value={r.monthly}
                          parse={parseAmountInput}
                          onCommit={(v) => onAmount(r.id, v)}
                          inputMode="numeric"
                          describedBy={hintId}
                        />
                        <span className="per">a month</span>
                      </span>
                    ) : (
                      <span className="amt-value">
                        {formatDollars(r.monthly)} <span className="per">a month</span>
                      </span>
                    )}
                    {personal && line?.renewal && (
                      <div className="amt-sub">
                        <label htmlFor={`renewal-${r.id}`}>Increase on your renewal notice</label>
                        <span className="money">
                          <NumberField
                            id={`renewal-${r.id}`}
                            className="pct"
                            value={r.rate}
                            parse={parseRenewalInput}
                            onCommit={(v) => onRenewal(r.id, v)}
                            inputMode="decimal"
                          />
                          %
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Output components** — create `src/components/ResultPanel.jsx`:

```jsx
import { forwardRef } from "react";

function Bar({ bar, kind }) {
  return (
    <span className="bar-track" aria-hidden="true">
      <span className={kind ? `bar ${kind}` : "bar"} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
    </span>
  );
}

function LineRow({ row, showBars }) {
  return (
    <li className={row.quiet ? "line quiet" : "line"}>
      <span className="line-name">
        {row.label}
        {row.note && <span className="line-note">{row.note}</span>}
      </span>
      <span className="line-rate">{row.rateText}</span>
      <span className="line-amt">{row.dollarText}</span>
      {showBars && <Bar bar={row.bar} />}
    </li>
  );
}

/**
 * The result panel (spec "Result panel"): title, answer, rates line, bars, verdict,
 * basis, where the extra money goes, renewal prompts, actions, fine print.
 * Lays out panelModel() output; computes nothing.
 */
const ResultPanel = forwardRef(function ResultPanel(
  { model, fine, showAll, onToggleShowAll, onAction, onPrompt }, ref,
) {
  const rows = showAll ? model.main : model.top;
  return (
    <section className="result" ref={ref} aria-labelledby="result-title">
      <h2 id="result-title">{model.title}</h2>
      <p className="answer">{model.answer}</p>
      {model.ratesLine && <p className="rates">{model.ratesLine}</p>}
      {model.compare && (
        <div className="compare">
          <span>Your costs</span>
          <Bar bar={model.compare.you.bar} kind="you" />
          <span className="cmp-val">{model.compare.you.text}</span>
          <span>National</span>
          <Bar bar={model.compare.us.bar} kind="us" />
          <span className="cmp-val">{model.compare.us.text}</span>
        </div>
      )}
      {model.verdict && <p className="verdict">{model.verdict}</p>}
      {model.basis && <p className="basis">{model.basis}</p>}
      {model.main.length > 0 && (
        <>
          <h3 className="lines-title">Where the extra money goes</h3>
          <ul className="lines">
            {rows.map((r) => <LineRow key={r.id} row={r} showBars={model.bars} />)}
            {!showAll && model.smaller && (
              <li className="line">
                <span className="line-name">{model.smaller.text}</span>
                <span className="line-rate" />
                <span className="line-amt">{model.smaller.dollarText}</span>
              </li>
            )}
            {model.rest && <LineRow row={model.rest} showBars={model.bars} />}
          </ul>
        </>
      )}
      {model.prompts.length > 0 && (
        <ul className="prompts">
          {model.prompts.map((p) => (
            <li key={p.id}>
              <button type="button" className="text-btn" onClick={() => onPrompt(p.id)}>{p.text}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button type="button" className="btn" onClick={onAction}>{model.actionLabel}</button>
        {model.smaller && (
          <button type="button" className="text-btn" aria-expanded={showAll ? "true" : "false"} onClick={onToggleShowAll}>
            {showAll ? "Show fewer items" : `Show all ${model.allCount} items`}
          </button>
        )}
      </div>
      <div className="fine">
        {fine.map((text) => <p key={text}>{text}</p>)}
      </div>
    </section>
  );
});

export default ResultPanel;
```

`src/components/Dock.jsx`:

```jsx
/** Phone dock: shows the answer while the result panel is off screen (hidden by CSS at ≥ 900px). */
export default function Dock({ label, answer, away, onSeeDetails }) {
  return (
    <div className={away ? "dock away" : "dock"} aria-hidden={away ? "true" : undefined}>
      <div className="dock-text">
        <span className="dock-label">{label}</span>
        <span className="dock-amt">{answer}</span>
      </div>
      <button type="button" className="dock-btn" tabIndex={away ? -1 : undefined} onClick={onSeeDetails}>
        See details
      </button>
    </div>
  );
}
```

`src/components/Toast.jsx`:

```jsx
import { useEffect, useRef } from "react";

/**
 * "Answers cleared. [Undo]" for 8 seconds. The timer pauses while the pointer is
 * over the toast or focus is inside it, and resumes with the time that was left.
 */
export default function Toast({ onUndo, onClose, duration = 8000 }) {
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const timer = useRef(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Run the timer only while neither hovered nor focused.
  const sync = () => {
    const shouldRun = !hovered.current && !focused.current;
    if (shouldRun && timer.current == null) {
      startedAt.current = Date.now();
      timer.current = setTimeout(() => closeRef.current(), remaining.current);
    } else if (!shouldRun && timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
      remaining.current -= Date.now() - startedAt.current;
    }
  };
  const set = (flag, value) => () => {
    flag.current = value;
    sync();
  };

  useEffect(() => {
    sync();
    return () => {
      clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);

  return (
    <div
      className="toast"
      role="status"
      onMouseEnter={set(hovered, true)}
      onMouseLeave={set(hovered, false)}
      onFocus={set(focused, true)}
      onBlur={set(focused, false)}
    >
      <span>Answers cleared.</span>
      <button type="button" className="text-btn" onClick={onUndo}>Undo</button>
    </div>
  );
}
```

`src/components/LiveRegion.jsx`:

```jsx
import { useEffect, useState } from "react";

/**
 * Persistent, visually hidden aria-live region. Announces `text` one second after it
 * stops changing, so typing an amount doesn't flood a screen reader.
 */
export default function LiveRegion({ text, delay = 1000 }) {
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSpoken(text), delay);
    return () => clearTimeout(t);
  }, [text, delay]);
  return <p className="sr" aria-live="polite">{spoken}</p>;
}
```

- [ ] **Step 3: Wire the view** — replace `src/views/YourCosts.jsx` with:

```jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASKET } from "../data/catalog.js";
import { emptyAnswers, isPersonal, personalRows, averageRows } from "../calculator/model.js";
import { panelModel, summaryText, finePrint } from "../calculator/panel.js";
import { getStorage, storageAvailable, loadAnswers, saveAnswers } from "../calculator/storage.js";
import YourCostsIntro from "./YourCostsIntro.jsx";
import Questions from "../components/Questions.jsx";
import Summary from "../components/Summary.jsx";
import ResultPanel from "../components/ResultPanel.jsx";
import Amounts from "../components/Amounts.jsx";
import Dock from "../components/Dock.jsx";
import Toast from "../components/Toast.jsx";
import LiveRegion from "../components/LiveRegion.jsx";

const withPeriod = (s) => (s.endsWith(".") ? s : `${s}.`);
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * The Your costs tab. States (spec "States"): Average until any answer or checkbox,
 * then Personal; a load with saved personal answers starts folded (Returning).
 * Folding happens only on load, never while someone is answering.
 */
export default function YourCosts({ data, base, onNavigate }) {
  const storage = useMemo(getStorage, []);
  const canSave = useMemo(() => storageAvailable(storage), [storage]);
  const [answers, setAnswers] = useState(() => loadAnswers(storage) ?? emptyAnswers());
  const [folded, setFolded] = useState(() => isPersonal(answers));
  const [amountsOpen, setAmountsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [cleared, setCleared] = useState(null); // { answers, key } while the Undo toast is up
  const [panelOnScreen, setPanelOnScreen] = useState(true);
  const [pendingFocus, setPendingFocus] = useState(null);
  const panelRef = useRef(null);

  const personal = isPersonal(answers);
  const mode = personal ? "personal" : "average";
  const rows = useMemo(
    () => (personal ? personalRows(answers, data) : averageRows(data, BASKET.ceMonthlyMean)),
    [personal, answers, data],
  );
  const model = useMemo(
    () => panelModel({ mode, rows, headlinePct: data.headline.yoy, referenceMonth: data.referenceMonth, answers }),
    [mode, rows, data, answers],
  );
  const fine = useMemo(() => finePrint({ mode, rows, data }), [mode, rows, data]);

  useEffect(() => {
    if (canSave) saveAnswers(storage, answers);
  }, [answers, canSave, storage]);

  // The dock shows only while the panel is off screen.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setPanelOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Move focus after the render that makes the target exist (unfolded questions, opened amounts).
  useEffect(() => {
    if (!pendingFocus) return;
    const el = document.getElementById(pendingFocus);
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  const update = (fn) => setAnswers((prev) => fn(prev));
  const onAnswer = (qid, option) => update((a) => ({ ...a, answered: { ...a.answered, [qid]: option } }));
  const onAlso = (id, checked) => update((a) => ({ ...a, also: { ...a.also, [id]: checked } }));
  const onAmount = (id, value) => update((a) => ({ ...a, amounts: { ...a.amounts, [id]: value } }));
  const onRenewal = (id, value) => update((a) => ({ ...a, renewals: { ...a.renewals, [id]: value } }));

  const toQuestions = () => {
    setFolded(false);
    setPendingFocus("questions");
  };
  const startOver = () => {
    setCleared((c) => ({ answers, key: (c?.key ?? 0) + 1 }));
    setAnswers(emptyAnswers());
    setFolded(false);
    setShowAll(false);
  };
  const undo = () => {
    if (cleared) setAnswers(cleared.answers);
    setCleared(null);
  };
  const closeToast = useCallback(() => setCleared(null), []);
  const openRenewal = (id) => {
    setAmountsOpen(true);
    setPendingFocus(`renewal-${id}`);
  };
  const seeDetails = () =>
    panelRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  const liveText = [model.title, model.answer, model.verdict].filter(Boolean).map(withPeriod).join(" ");

  return (
    <>
      <section className="calc" aria-label="Your costs">
        <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={folded} />
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
        <div className="result-col">
          <ResultPanel
            ref={panelRef}
            model={model}
            fine={fine}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((v) => !v)}
            onAction={toQuestions}
            onPrompt={openRenewal}
          />
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
      </section>
      <LiveRegion text={liveText} />
      <Dock
        label={personal ? "Your costs" : "Average U.S. household"}
        answer={model.answer}
        away={panelOnScreen}
        onSeeDetails={seeDetails}
      />
      {cleared && <Toast key={cleared.key} onUndo={undo} onClose={closeToast} />}
    </>
  );
}
```

- [ ] **Step 4: Full suite and build**

Run: `npm test` → expect `pass 127`, `fail 0` (`tokens.test.mjs` now also scans the new components and `YourCosts.jsx` for literal colors).
Run: `npx vite build` → `✓ built`.

- [ ] **Step 5: Look at it**

Run `npx vite preview --port 4719 --strictPort`, open `http://localhost:4719/inflation-reality/` at phone width (390px) and desktop (1280px), and check by hand: Average panel "About $2,250 more a year" with 6 rows, "2 smaller items" and Everything else; tap "Mortgage, fixed rate" and see three dashed "our guess" answers, the mortgage explanation, the verdict and "Based on 1 answer and 3 guesses. Monthly amounts are starting estimates."; tap "Home insurance: add your renewal increase" and land in the renewal box; reload and see the folded summary; Start over then Undo. Stop the preview server. (The controller runs the scripted version of these checks in Task 9.)

- [ ] **Step 6: Commit**

```bash
git add src/components src/views/YourCosts.jsx
git commit -m "feat(your-costs): questions, live result panel, amounts, saved answers, dock and undo

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Browser smoke check and handoff (controller)

Run by the controller after the final whole-branch review, not by an implementer subagent. Nothing in this task is committed except the docs in Step 4.

**Files:**
- Create (scratchpad, not committed): `smoke-2a.py`
- Modify: `docs/SESSIONS.md` (handoff), `docs/BACKLOG.md` via `ledger idea`

- [ ] **Step 1: Build and serve**

```bash
cd ~/projects/inflation-reality
npm test && npx vite build
npx vite preview --port 4719 --strictPort   # run in the background
```

- [ ] **Step 2: Run the smoke script** — save to the session scratchpad as `smoke-2a.py` and run `python3 <scratchpad>/smoke-2a.py` (Python Playwright is installed on the owner's machine). Use a separate browser like this script does: the Playwright MCP browser is shared with other sessions.

```python
"""Phase 2a browser smoke check (not committed; Phase 2b builds the real audit).

Run from the repo root after `npm run build`, with
`npx vite preview --port 4719 --strictPort` running in the background.
"""
import re
import sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:4719/inflation-reality/"
BANNED = ["—", "·", "→", "!", "CPI", "YoY"]


def check(cond, msg):
    if not cond:
        print("FAIL:", msg)
        sys.exit(1)
    print("ok:", msg)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    text = lambda sel: page.locator(sel).first.inner_text()

    page.goto(URL)
    page.wait_for_timeout(800)
    check(text(".result h2").startswith("The average U.S. household vs. "), "Average title")
    check(re.fullmatch(r"About \$[\d,]+ (more|less) a year|About the same as a year ago", text(".answer")), "Average answer")
    check(page.locator(".verdict").count() == 0 and page.locator(".compare").count() == 0, "Average has no verdict or bars")
    check(page.locator(".line").count() >= 3, "Average lists lines")
    check(not page.evaluate("document.documentElement.scrollWidth > innerWidth"), "no horizontal scroll at 390px")

    page.get_by_role("button", name=re.compile("^Mortgage")).click()
    page.wait_for_timeout(200)
    check(page.locator(".opt.guess").count() == 3, "three guessed answers")
    check("national rate" in text(".verdict"), "Personal verdict")
    check(text(".basis").startswith("Based on 1 answer and 3 guesses."), "basis wording")
    check(page.locator(".help").first.inner_text().startswith("A fixed-rate payment"), "mortgage explanation")

    calc_text = page.locator(".calc").inner_text()
    for banned in BANNED:
        check(banned not in calc_text, f"no {banned!r} in Your costs text")

    page.get_by_role("button", name="Home insurance: add your renewal increase").click()
    page.wait_for_timeout(300)
    check(page.evaluate("document.activeElement.id") == "renewal-homeIns", "prompt focuses the renewal box")
    page.keyboard.type("8")
    page.wait_for_timeout(200)
    check(page.locator(".prompts").count() == 0, "prompt row leaves once a rate is typed")
    saved = page.evaluate("localStorage.getItem('inflation-reality:answers:v1')")
    check(saved and '"version":1' in saved, "answers saved")

    page.reload()
    page.wait_for_timeout(600)
    check(text(".lede").startswith("Updated with "), "returning lede")
    check(text(".summary p").startswith("Fixed-rate mortgage, gas car"), "returning summary")
    page.get_by_role("button", name="Start over").click()
    page.wait_for_timeout(200)
    check(text(".toast").startswith("Answers cleared."), "Undo toast")
    check(text(".result h2").startswith("The average U.S. household"), "Start over returns to Average")
    page.get_by_role("button", name="Undo").click()
    page.wait_for_timeout(200)
    check(text(".result h2").startswith("Your costs vs. "), "Undo restores answers")

    page.get_by_role("link", name="Price check").click()
    page.wait_for_timeout(400)
    check(page.url.endswith("#price-check"), "section link sets the hash")
    check(page.locator("[aria-current=page]").inner_text() == "Price check", "aria-current follows the route")
    page.go_back()
    page.wait_for_timeout(400)
    check(page.url == URL and page.locator("[aria-current=page]").inner_text() == "Your costs", "Back returns to Your costs")
    page.goto(URL + "#unknown")
    page.wait_for_timeout(400)
    check(page.locator("[aria-current=page]").inner_text() == "Your costs", "unknown hash renders Your costs")

    page.set_viewport_size({"width": 1280, "height": 900})
    page.goto(URL)
    page.wait_for_timeout(500)
    gap = page.evaluate(
        "document.querySelector('.questions-area').getBoundingClientRect().top"
        " - document.querySelector('.text-link').getBoundingClientRect().bottom"
    )
    check(gap < 60, f"desktop: questions sit under the intro (gap {gap:.0f}px)")
    check(page.evaluate("getComputedStyle(document.querySelector('.result-col')).position") == "sticky", "desktop panel is sticky")

    real_errors = [e for e in errors if "cpi.json" not in e]
    check(real_errors == [], f"no console errors {real_errors}")
    browser.close()
print("smoke check passed")
```

Expected: 30 `ok:` lines, then `smoke check passed`. Stop the preview server afterwards.

- [ ] **Step 3: Check dark mode and reduced motion by eye** — in a browser with `prefers-color-scheme: dark`, confirm the page uses the dark tokens (dark ground, light ink, green accent) and that the dock does not animate under `prefers-reduced-motion: reduce`.

- [ ] **Step 4: Capture state** — run the `session-checkpoint` skill: a `#### Handoff` in `docs/SESSIONS.md` naming the branch, commits, test count and smoke result, and the next step (Phase 2b plan: National numbers, Price check, Sources, .xlsx export, the committed audit script, link previews, then the merge gate). Log with `ledger idea inflation-reality --tag redesign "…"`: (a) the 5-second test is still owed before merge; (b) replace `LegacyDashboard` in Phase 2b and delete it; (c) the whole-basket fallback decision is still open. **Do not** `ledger ship` (nothing is live until the branch merges), and **do not push**.
