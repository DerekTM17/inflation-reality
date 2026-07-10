# FRED Live Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded CPI constants in `src/App.jsx` with data fetched from FRED at build time, and add a month-over-month (MoM) reading for headline and core alongside the existing year-over-year (YoY) numbers.

**Architecture:** A Node script (`scripts/fetch-fred.mjs`) runs inside GitHub Actions using a key from an Actions secret, fetches raw index levels from FRED (server-side → no CORS, key never shipped), computes YoY/MoM/trend, and writes a **dynamic-only** `public/cpi.json`. Static presentation metadata (labels, icons, colors, weights, series IDs) lives in `src/data/catalog.js`. At runtime the app fetches `cpi.json`, falls back to a bundled `src/data/fallback.json` on failure, and a tested `buildViewData()` merges catalog + dynamic values into render-ready objects.

**Tech Stack:** Node 20 (built-in `fetch` + `node --test`), Vite, React 18, GitHub Actions. **No new npm dependencies.**

## Global Constraints

- Node version floor: **20** (uses global `fetch` and `node:test`). Matches `.github/workflows/deploy.yml` (`node-version: 20`).
- **No new npm dependencies.** Tests use the built-in `node --test` runner; date math is hand-rolled.
- The site is static GitHub Pages; the FRED API key must **never** appear in client code or committed files — only as the Actions secret `FRED_API_KEY`.
- Vite `base` is `/inflation-reality/`; runtime fetches must use `import.meta.env.BASE_URL` so paths resolve in production.
- YoY uses NSA series, MoM uses SA series (verbatim from spec): headline `CPIAUCNS`/`CPIAUCSL`, core `CPILFESNS`/`CPILFESL`.
- Preserve the dashboard's provenance ethos: every value keeps a `seriesId`; the UI shows a live "data as of" stamp.
- Percentages round to 1 decimal; average prices keep raw FRED precision (no rounding).

---

## File structure

- Create `src/data/catalog.js` — static metadata + FRED series manifest (headline, core, 11 categories, 20 avg-price items). Imported by the app and (for the series list) by the fetch script.
- Create `src/data/merge.js` — `buildViewData(catalog, dynamic)` merges static + dynamic into render-ready objects.
- Create `src/data/fallback.json` — dynamic-only snapshot of current values (last-known-good).
- Create `scripts/compute.mjs` — pure compute functions (parse observations, YoY, MoM, annualized, trend, avg price).
- Create `scripts/assemble.mjs` — `assemblePayload({ observationsBySeries, catalog, fallback, generatedAt })` → dynamic payload object.
- Create `scripts/fetch-fred.mjs` — thin I/O entry: read key, fetch series, call `assemblePayload`, write `public/cpi.json`.
- Create `scripts/compute.test.mjs`, `scripts/assemble.test.mjs`, `src/data/merge.test.mjs` — `node --test` suites.
- Modify `src/App.jsx` — remove `CPI_DATA`/`TREND_DATA`/`AVG_PRICES`; load + merge dynamic data; rename `.rate`→`.yoy`; add MoM UI.
- Modify `package.json` — add `test` and `fetch:fred` scripts.
- Modify `.github/workflows/deploy.yml` — add fetch step, schedule cron, `workflow_dispatch`.
- Modify `README.md`, `docs/CHANGELOG.md`, `docs/BACKLOG.md` — document the change.

**Dynamic payload shape (`cpi.json` / `fallback.json`):**

```json
{
  "generatedAt": "2026-07-13T14:00:00.000Z",
  "referenceMonth": "2026-03",
  "referenceMonthLabel": "March 2026",
  "headline": { "yoy": 3.3, "mom": 0.3, "momAnnualized": 3.7 },
  "core": { "yoy": 2.6, "mom": 0.2, "momAnnualized": 2.4 },
  "categories": { "groceries": { "yoy": 3.1 }, "dining": { "yoy": 3.8 } },
  "avgPrices": { "APU0000708111": { "current": 6.23, "yearAgo": 3.56 } },
  "trend": [ { "month": "Apr 25", "headline": 2.3 }, { "month": "Oct 25", "headline": null, "gap": true } ]
}
```

Category values are keyed by catalog `id`; avg-price values by FRED `seriesId`. A failed series may carry `"stale": true` on its entry (preserved through merge; not rendered yet — reserved for future UI).

---

### Task 1: Static catalog + series manifest

**Files:**
- Create: `src/data/catalog.js`
- Test: `src/data/catalog.test.mjs`

**Interfaces:**
- Produces:
  - `HEADLINE`, `CORE`: `{ key, label, code, relImportance, seriesId, momSeriesId }`
  - `CATEGORIES`: array of `{ id, label, seriesId, code, weight, icon, color }`
  - `AVG_PRICE_ITEMS`: array of `{ item, unit, seriesId, category }`
  - `allSeries()`: returns `Array<{ id, kind }>` where `kind` ∈ `"level"` (for YoY/trend/price) or `"levelSA"` (for MoM) — the full de-duplicated list the fetch script must request.

- [ ] **Step 1: Write the failing test**

```js
// src/data/catalog.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, allSeries } from "./catalog.js";

test("headline and core use NSA for yoy and SA for mom", () => {
  assert.equal(HEADLINE.seriesId, "CPIAUCNS");
  assert.equal(HEADLINE.momSeriesId, "CPIAUCSL");
  assert.equal(CORE.seriesId, "CPILFESNS");
  assert.equal(CORE.momSeriesId, "CPILFESL");
});

test("catalog has 11 categories and 20 avg-price items, all with series ids", () => {
  assert.equal(CATEGORIES.length, 11);
  assert.equal(AVG_PRICE_ITEMS.length, 20);
  for (const c of CATEGORIES) assert.match(c.seriesId, /^CUUR/);
  for (const p of AVG_PRICE_ITEMS) assert.match(p.seriesId, /^APU/);
});

test("allSeries de-duplicates and includes SA mom series", () => {
  const ids = allSeries().map(s => s.id);
  assert.equal(new Set(ids).size, ids.length); // no dupes
  assert.ok(ids.includes("CPIAUCNS"));
  assert.ok(ids.includes("CPIAUCSL"));
  assert.ok(allSeries().some(s => s.id === "CPIAUCSL" && s.kind === "levelSA"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/data/catalog.test.mjs`
Expected: FAIL — cannot find module `./catalog.js`.

- [ ] **Step 3: Write the catalog**

```js
// src/data/catalog.js
// Static presentation metadata + FRED series manifest.
// Dynamic values (yoy/mom/prices/trend) come from cpi.json; this file never changes at build time.

export const HEADLINE = {
  key: "headline",
  label: "All Items (CPI-U)",
  code: "SA0",
  relImportance: 100.0,
  seriesId: "CPIAUCNS",   // NSA — 12-month (YoY) change, as BLS headline is reported
  momSeriesId: "CPIAUCSL", // SA — 1-month (MoM) change
};

export const CORE = {
  key: "core",
  label: "All Items Less Food & Energy",
  code: "SA0L1E",
  relImportance: 79.6,
  seriesId: "CPILFESNS",
  momSeriesId: "CPILFESL",
};

// id/label/code/weight/icon/color are presentation-only; seriesId (NSA CUUR) drives YoY.
export const CATEGORIES = [
  { id: "groceries",    label: "Groceries",           seriesId: "CUUR0000SAF11",  code: "SAF11",  weight: 8.2, icon: "🛒", color: "#2D6A4F" },
  { id: "dining",       label: "Dining Out",          seriesId: "CUUR0000SEFV",   code: "SEFV",   weight: 5.3, icon: "🍽️", color: "#52796F" },
  { id: "shelter",      label: "Rent / Housing",      seriesId: "CUUR0000SAH1",   code: "SAH1",   weight: 36.4, icon: "🏠", color: "#1B4965" },
  { id: "energy",       label: "Home Energy",         seriesId: "CUUR0000SAH21",  code: "SAH21",  weight: 3.2, icon: "💡", color: "#F4A261" },
  { id: "gas",          label: "Gasoline",            seriesId: "CUUR0000SETB01", code: "SETB01", weight: 3.0, icon: "⛽", color: "#E76F51" },
  { id: "carInsurance", label: "Car Insurance",       seriesId: "CUUR0000SETE",   code: "SETE",   weight: 2.9, icon: "🚗", color: "#E63946" },
  { id: "healthcare",   label: "Healthcare",          seriesId: "CUUR0000SAM",    code: "SAM",    weight: 8.1, icon: "🏥", color: "#457B9D" },
  { id: "tuition",      label: "Tuition & Childcare", seriesId: "CUUR0000SEEB",   code: "SEEB",   weight: 3.0, icon: "🎓", color: "#6D597A" },
  { id: "apparel",      label: "Clothing",            seriesId: "CUUR0000SAA",    code: "SAA",    weight: 2.5, icon: "👔", color: "#936639" },
  { id: "recreation",   label: "Recreation",          seriesId: "CUUR0000SAR",    code: "SAR",    weight: 5.3, icon: "🎬", color: "#3A86A5" },
  { id: "other",        label: "Other",               seriesId: "CUUR0000SAS",    code: "SAS",    weight: 3.6, icon: "📦", color: "#8D99AE" },
];

export const AVG_PRICE_ITEMS = [
  { item: "Eggs, Grade A Large",       unit: "/doz",    seriesId: "APU0000708111", category: "Protein" },
  { item: "Ground Beef, 100%",         unit: "/lb",     seriesId: "APU0000703112", category: "Protein" },
  { item: "Chicken Breast, Boneless",  unit: "/lb",     seriesId: "APU0000706111", category: "Protein" },
  { item: "Bacon, Sliced",             unit: "/lb",     seriesId: "APU0000704111", category: "Protein" },
  { item: "Whole Milk",                unit: "/gal",    seriesId: "APU0000709112", category: "Dairy" },
  { item: "Butter, Stick",             unit: "/lb",     seriesId: "APU0000FS1101", category: "Dairy" },
  { item: "Cheddar Cheese",            unit: "/lb",     seriesId: "APU0000710212", category: "Dairy" },
  { item: "White Bread",               unit: "/lb",     seriesId: "APU0000702111", category: "Staples" },
  { item: "White Rice",                unit: "/lb",     seriesId: "APU0000701111", category: "Staples" },
  { item: "Flour, All Purpose",        unit: "/lb",     seriesId: "APU0000701312", category: "Staples" },
  { item: "Sugar, White",              unit: "/lb",     seriesId: "APU0000715211", category: "Staples" },
  { item: "Bananas",                   unit: "/lb",     seriesId: "APU0000711211", category: "Produce" },
  { item: "Tomatoes",                  unit: "/lb",     seriesId: "APU0000712311", category: "Produce" },
  { item: "Potatoes, White",           unit: "/lb",     seriesId: "APU0000712112", category: "Produce" },
  { item: "Coffee, Ground Roast",      unit: "/lb",     seriesId: "APU0000717311", category: "Beverages" },
  { item: "Orange Juice",              unit: "/16oz",   seriesId: "APU0000FJ4101", category: "Beverages" },
  { item: "Potato Chips",              unit: "/16oz",   seriesId: "APU0000FN1101", category: "Snacks" },
  { item: "Gasoline, Regular",         unit: "/gal",    seriesId: "APU000074714",  category: "Energy" },
  { item: "Electricity",               unit: "/kWh",    seriesId: "APU000072610",  category: "Energy" },
  { item: "Natural Gas",               unit: "/therm",  seriesId: "APU000072620",  category: "Energy" },
];

// The de-duplicated list of FRED series the fetch script must request.
// kind "level"   → used for YoY / trend / avg-price (NSA levels)
// kind "levelSA" → used for MoM (seasonally adjusted levels)
export function allSeries() {
  const seen = new Map();
  const add = (id, kind) => { if (!seen.has(id)) seen.set(id, { id, kind }); };
  add(HEADLINE.seriesId, "level");
  add(HEADLINE.momSeriesId, "levelSA");
  add(CORE.seriesId, "level");
  add(CORE.momSeriesId, "levelSA");
  for (const c of CATEGORIES) add(c.seriesId, "level");
  for (const p of AVG_PRICE_ITEMS) add(p.seriesId, "level");
  return [...seen.values()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/data/catalog.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/catalog.js src/data/catalog.test.mjs
git commit -m "feat: add FRED series catalog and static metadata"
```

---

### Task 2: Pure compute functions

**Files:**
- Create: `scripts/compute.mjs`
- Test: `scripts/compute.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces (all operate on FRED observation arrays `[{ date: "YYYY-MM-01", value: "312.3" | "." }]`):
  - `parseObservations(raw)` → `[{ date, value: number|null }]` sorted ascending; `"."` → `null`.
  - `shiftMonths(dateStr, n)` → `"YYYY-MM-01"` shifted by `n` months (negative = earlier).
  - `computeYoY(observations)` → number (1 dp) | `null`.
  - `computeMoM(observations)` → number (1 dp) | `null`.
  - `computeMoMAnnualized(observations)` → number (1 dp) | `null`.
  - `buildTrend(observations, count = 12)` → `[{ month: "Mmm yy", headline: number|null, gap?: true }]` (length `count`, ending at latest observation month).
  - `avgPrice(observations)` → `{ current: number|null, yearAgo: number|null }`.
  - `monthLabel(dateStr)` → `"Mmm yy"` (e.g. `"Mar 26"`); `referenceMonthLabel(dateStr)` → `"March 2026"`.

- [ ] **Step 1: Write the failing test**

```js
// scripts/compute.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseObservations, shiftMonths, computeYoY, computeMoM,
  computeMoMAnnualized, buildTrend, avgPrice, monthLabel, referenceMonthLabel,
} from "./compute.mjs";

// 14 monthly points; Oct/Nov 2025 missing (".") to exercise gap handling.
const raw = [
  { date: "2024-12-01", value: "100.0" },
  { date: "2025-01-01", value: "100.5" },
  { date: "2025-02-01", value: "100.8" },
  { date: "2025-03-01", value: "101.0" },
  { date: "2025-04-01", value: "101.2" },
  { date: "2025-05-01", value: "101.5" },
  { date: "2025-06-01", value: "101.7" },
  { date: "2025-07-01", value: "101.9" },
  { date: "2025-08-01", value: "102.1" },
  { date: "2025-09-01", value: "102.3" },
  { date: "2025-10-01", value: "." },
  { date: "2025-11-01", value: "." },
  { date: "2025-12-01", value: "102.7" },
  { date: "2026-01-01", value: "103.0" },
  { date: "2026-02-01", value: "103.2" },
  { date: "2026-03-01", value: "104.3" },
];

test("parseObservations drops '.' to null and sorts ascending", () => {
  const obs = parseObservations([{ date: "2025-02-01", value: "2" }, { date: "2025-01-01", value: "." }]);
  assert.deepEqual(obs, [{ date: "2025-01-01", value: null }, { date: "2025-02-01", value: 2 }]);
});

test("shiftMonths handles year boundaries", () => {
  assert.equal(shiftMonths("2026-03-01", -12), "2025-03-01");
  assert.equal(shiftMonths("2026-01-01", -1), "2025-12-01");
  assert.equal(shiftMonths("2025-12-01", 1), "2026-01-01");
});

test("computeYoY uses latest month vs 12 months prior", () => {
  // 104.3 / 101.0 - 1 = 3.267...% → 3.3
  assert.equal(computeYoY(parseObservations(raw)), 3.3);
});

test("computeMoM uses latest vs prior month", () => {
  // 104.3 / 103.2 - 1 = 1.066...% → 1.1
  assert.equal(computeMoM(parseObservations(raw)), 1.1);
});

test("computeMoMAnnualized compounds the monthly change", () => {
  // (104.3/103.2)^12 - 1 = 13.6%
  assert.equal(computeMoMAnnualized(parseObservations(raw)), 13.6);
});

test("buildTrend returns 12 months ending at latest, with gaps as null", () => {
  const trend = buildTrend(parseObservations(raw), 12);
  assert.equal(trend.length, 12);
  assert.equal(trend[trend.length - 1].month, "Mar 26");
  const oct = trend.find(t => t.month === "Oct 25");
  assert.equal(oct.headline, null);
  assert.equal(oct.gap, true);
});

test("avgPrice returns latest and 12-months-prior levels", () => {
  assert.deepEqual(avgPrice(parseObservations(raw)), { current: 104.3, yearAgo: 101.0 });
});

test("labels format correctly", () => {
  assert.equal(monthLabel("2026-03-01"), "Mar 26");
  assert.equal(referenceMonthLabel("2026-03-01"), "March 2026");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/compute.test.mjs`
Expected: FAIL — cannot find module `./compute.mjs`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/compute.mjs
// Pure functions over FRED observation arrays. No network, no side effects.

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function parseObservations(raw) {
  return raw
    .map(o => ({ date: o.date, value: o.value === "." ? null : Number(o.value) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function shiftMonths(dateStr, n) {
  const [y, m] = dateStr.split("-").map(Number);
  const zero = (y * 12 + (m - 1)) + n;          // months since year 0
  const ny = Math.floor(zero / 12);
  const nm = (zero % 12) + 1;
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-01`;
}

function toMap(observations) {
  const map = new Map();
  for (const o of observations) map.set(o.date, o.value);
  return map;
}

function latestDate(observations) {
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value != null) return observations[i].date;
  }
  return null;
}

function round1(n) { return Math.round(n * 10) / 10; }

export function computeYoY(observations) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prior = map.get(shiftMonths(d, -12));
  if (now == null || prior == null || prior === 0) return null;
  return round1((now / prior - 1) * 100);
}

export function computeMoM(observations) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prev = map.get(shiftMonths(d, -1));
  if (now == null || prev == null || prev === 0) return null;
  return round1((now / prev - 1) * 100);
}

export function computeMoMAnnualized(observations) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prev = map.get(shiftMonths(d, -1));
  if (now == null || prev == null || prev === 0) return null;
  return round1(((now / prev) ** 12 - 1) * 100);
}

export function buildTrend(observations, count = 12) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return [];
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = shiftMonths(d, -i);
    const now = map.get(month);
    const prior = map.get(shiftMonths(month, -12));
    const yoy = (now == null || prior == null || prior === 0) ? null : round1((now / prior - 1) * 100);
    const entry = { month: monthLabel(month), headline: yoy };
    if (yoy === null) entry.gap = true;
    out.push(entry);
  }
  return out;
}

export function avgPrice(observations) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return { current: null, yearAgo: null };
  const current = map.get(d) ?? null;
  const yearAgo = map.get(shiftMonths(d, -12)) ?? null;
  return { current, yearAgo };
}

export function monthLabel(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(-2)}`;
}

export function referenceMonthLabel(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/compute.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/compute.mjs scripts/compute.test.mjs
git commit -m "feat: add pure FRED compute functions (yoy, mom, trend, avg price)"
```

---

### Task 3: Assemble dynamic payload

**Files:**
- Create: `scripts/assemble.mjs`
- Test: `scripts/assemble.test.mjs`

**Interfaces:**
- Consumes: `compute.mjs` (all functions), `../src/data/catalog.js` (`HEADLINE`, `CORE`, `CATEGORIES`, `AVG_PRICE_ITEMS`).
- Produces: `assemblePayload({ observationsBySeries, catalog, fallback, generatedAt })` → dynamic payload object (shape in File Structure). `observationsBySeries` is `{ [seriesId]: rawObservationArray }`. `catalog` is `{ HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS }`. `fallback` is a prior dynamic payload used per-entry when a series is missing/empty (sets `stale: true`). `generatedAt` is an ISO string (injected — the script owns the clock).

- [ ] **Step 1: Write the failing test**

```js
// scripts/assemble.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePayload } from "./assemble.mjs";

const catalog = {
  HEADLINE: { key: "headline", seriesId: "CPIAUCNS", momSeriesId: "CPIAUCSL" },
  CORE: { key: "core", seriesId: "CPILFESNS", momSeriesId: "CPILFESL" },
  CATEGORIES: [{ id: "gas", seriesId: "CUUR0000SETB01" }],
  AVG_PRICE_ITEMS: [{ item: "Eggs", seriesId: "APU0000708111" }],
};

const series = (start, step) =>
  Array.from({ length: 14 }, (_, i) => ({
    date: `2025-${String(i + 2).padStart(2, "0")}-01`.replace("2025-13", "2026-01").replace("2025-14", "2026-02").replace("2025-15", "2026-03"),
    value: String(start + i * step),
  }));

const observationsBySeries = {
  CPIAUCNS: series(100, 0.3),
  CPIAUCSL: series(100, 0.3),
  CPILFESNS: series(100, 0.2),
  CPILFESL: series(100, 0.2),
  CUUR0000SETB01: series(200, 1),
  APU0000708111: series(5, 0.05),
};

test("assemblePayload produces headline yoy/mom and keyed maps", () => {
  const p = assemblePayload({
    observationsBySeries, catalog, fallback: null, generatedAt: "2026-07-13T14:00:00.000Z",
  });
  assert.equal(p.generatedAt, "2026-07-13T14:00:00.000Z");
  assert.equal(typeof p.headline.yoy, "number");
  assert.equal(typeof p.headline.mom, "number");
  assert.equal(typeof p.headline.momAnnualized, "number");
  assert.ok("gas" in p.categories);
  assert.ok("APU0000708111" in p.avgPrices);
  assert.equal(typeof p.avgPrices.APU0000708111.current, "number");
  assert.ok(Array.isArray(p.trend) && p.trend.length === 12);
  assert.match(p.referenceMonth, /^\d{4}-\d{2}$/);
});

test("missing series falls back to prior value and marks stale", () => {
  const fallback = { categories: { gas: { yoy: 9.9 } } };
  const p = assemblePayload({
    observationsBySeries: { ...observationsBySeries, CUUR0000SETB01: [] },
    catalog, fallback, generatedAt: "2026-07-13T14:00:00.000Z",
  });
  assert.equal(p.categories.gas.yoy, 9.9);
  assert.equal(p.categories.gas.stale, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/assemble.test.mjs`
Expected: FAIL — cannot find module `./assemble.mjs`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/assemble.mjs
// Turn raw FRED observations into the dynamic-only payload the app consumes.
import {
  parseObservations, computeYoY, computeMoM, computeMoMAnnualized,
  buildTrend, avgPrice, latestDateLabel, referenceMonthLabel,
} from "./compute.mjs";

// latestDateLabel isn't exported by compute; derive reference month from the headline series here.
function latestNonNullDate(observations) {
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value != null) return observations[i].date;
  }
  return null;
}

export function assemblePayload({ observationsBySeries, catalog, fallback, generatedAt }) {
  const obs = (id) => parseObservations(observationsBySeries[id] || []);
  const fb = fallback || {};

  const headObs = obs(catalog.HEADLINE.seriesId);
  const refDate = latestNonNullDate(headObs);
  const referenceMonth = refDate ? refDate.slice(0, 7) : (fb.referenceMonth || "");
  const referenceMonthLabelStr = refDate ? referenceMonthLabel(refDate) : (fb.referenceMonthLabel || "");

  const macro = (spec, fbNode = {}) => {
    const level = obs(spec.seriesId);
    const sa = obs(spec.momSeriesId);
    const yoy = computeYoY(level);
    const mom = computeMoM(sa);
    const momAnnualized = computeMoMAnnualized(sa);
    if (yoy == null && mom == null) {
      return { yoy: fbNode.yoy ?? null, mom: fbNode.mom ?? null, momAnnualized: fbNode.momAnnualized ?? null, stale: true };
    }
    return { yoy: yoy ?? fbNode.yoy ?? null, mom: mom ?? fbNode.mom ?? null, momAnnualized: momAnnualized ?? fbNode.momAnnualized ?? null };
  };

  const categories = {};
  for (const c of catalog.CATEGORIES) {
    const yoy = computeYoY(obs(c.seriesId));
    if (yoy == null) categories[c.id] = { yoy: fb.categories?.[c.id]?.yoy ?? null, stale: true };
    else categories[c.id] = { yoy };
  }

  const avgPrices = {};
  for (const p of catalog.AVG_PRICE_ITEMS) {
    const { current, yearAgo } = avgPrice(obs(p.seriesId));
    if (current == null) avgPrices[p.seriesId] = { ...(fb.avgPrices?.[p.seriesId] || { current: null, yearAgo: null }), stale: true };
    else avgPrices[p.seriesId] = { current, yearAgo };
  }

  const trend = headObs.length ? buildTrend(headObs, 12) : (fb.trend || []);

  return {
    generatedAt,
    referenceMonth,
    referenceMonthLabel: referenceMonthLabelStr,
    headline: macro(catalog.HEADLINE, fb.headline),
    core: macro(catalog.CORE, fb.core),
    categories,
    avgPrices,
    trend,
  };
}
```

> Note: `assemble.mjs` imports `referenceMonthLabel` from `compute.mjs` (already exported in Task 2). Remove the unused `latestDateLabel` import — it is not exported; the local `latestNonNullDate` covers it.

- [ ] **Step 4: Fix the import line**

Edit the import in `scripts/assemble.mjs` to drop the non-existent `latestDateLabel`:

```js
import {
  parseObservations, computeYoY, computeMoM, computeMoMAnnualized,
  buildTrend, avgPrice, referenceMonthLabel,
} from "./compute.mjs";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/assemble.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/assemble.mjs scripts/assemble.test.mjs
git commit -m "feat: assemble FRED observations into dynamic payload with per-series fallback"
```

---

### Task 4: Fetch entry script + package scripts

**Files:**
- Create: `scripts/fetch-fred.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `assemble.mjs` (`assemblePayload`), `../src/data/catalog.js` (`allSeries`, `HEADLINE`, `CORE`, `CATEGORIES`, `AVG_PRICE_ITEMS`), `../src/data/fallback.json` (as fallback).
- Produces: writes `public/cpi.json`. Exit 1 on missing key or total fetch failure.

- [ ] **Step 1: Write the fetch script**

There is no unit test for this file (it is thin network/FS I/O; all logic lives in the tested `compute.mjs`/`assemble.mjs`). It is verified by the smoke run in Step 3.

```js
// scripts/fetch-fred.mjs
// Build-time entry: fetch FRED series server-side (key from env), assemble, write public/cpi.json.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { assemblePayload } from "./assemble.mjs";
import { allSeries, HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS } from "../src/data/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OBSERVATION_START = "2019-01-01"; // enough history for trailing-12 YoY on any month

async function fetchSeries(id, apiKey) {
  const url = `https://api.stlouisfed.org/fred/series/observations`
    + `?series_id=${id}&api_key=${apiKey}&file_type=json&observation_start=${OBSERVATION_START}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${id} → HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json.observations)) throw new Error(`FRED ${id} → no observations`);
  return json.observations.map(o => ({ date: o.date, value: o.value }));
}

async function main() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error("FATAL: FRED_API_KEY is not set. Add it as a GitHub Actions secret.");
    process.exit(1);
  }

  const fallback = JSON.parse(readFileSync(resolve(ROOT, "src/data/fallback.json"), "utf8"));
  const series = allSeries();
  const observationsBySeries = {};
  let successes = 0;

  for (const { id } of series) {
    try {
      observationsBySeries[id] = await fetchSeries(id, apiKey);
      successes++;
    } catch (err) {
      console.warn(`WARN: ${err.message} — will fall back for this series.`);
      observationsBySeries[id] = [];
    }
  }

  if (successes === 0) {
    console.error("FATAL: every FRED request failed. Not overwriting cpi.json.");
    process.exit(1);
  }

  const payload = assemblePayload({
    observationsBySeries,
    catalog: { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS },
    fallback,
    generatedAt: new Date().toISOString(),
  });

  mkdirSync(resolve(ROOT, "public"), { recursive: true });
  writeFileSync(resolve(ROOT, "public/cpi.json"), JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote public/cpi.json — reference month ${payload.referenceMonth}, ${successes}/${series.length} series live.`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add package scripts**

Modify `package.json` `"scripts"` block to add `test` and `fetch:fred` (keep existing dev/build/preview):

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "fetch:fred": "node scripts/fetch-fred.mjs",
    "test": "node --test"
  },
```

- [ ] **Step 3: Smoke-test the missing-key guard (no real key needed)**

Run: `node scripts/fetch-fred.mjs`
Expected: prints `FATAL: FRED_API_KEY is not set.` and exits non-zero. (Confirms the guard; requires `src/data/fallback.json` from Task 5 to exist for the full path — this step only exercises the early guard, which runs before the fallback read.)

> Note: the guard runs before the fallback file is read, so this step passes even though Task 5 creates `fallback.json`. A full live run happens in Task 8.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-fred.mjs package.json
git commit -m "feat: add FRED fetch entry script and npm scripts"
```

---

### Task 5: Fallback snapshot + merge function

**Files:**
- Create: `src/data/fallback.json`
- Create: `src/data/merge.js`
- Test: `src/data/merge.test.mjs`

**Interfaces:**
- Consumes: `catalog.js` (`HEADLINE`, `CORE`, `CATEGORIES`, `AVG_PRICE_ITEMS`).
- Produces: `buildViewData(catalog, dynamic)` → `{ generatedAt, referenceMonthLabel, headline, core, categories, avgPrices, trend }` where `headline`/`core` are `{ ...staticMeta, yoy, mom, momAnnualized }`, `categories` is an array of `{ ...staticMeta, yoy }`, `avgPrices` is an array of `{ ...staticMeta, current, yearAgo }`, `trend` passes through.

- [ ] **Step 1: Create the fallback snapshot**

This is the current hardcoded data as a dynamic-only payload. MoM values are seed estimates (only shown if the live fetch ever fails).

```json
{
  "generatedAt": "2026-03-01T00:00:00.000Z",
  "referenceMonth": "2026-03",
  "referenceMonthLabel": "March 2026",
  "headline": { "yoy": 3.3, "mom": 0.3, "momAnnualized": 3.7 },
  "core": { "yoy": 2.6, "mom": 0.2, "momAnnualized": 2.4 },
  "categories": {
    "groceries": { "yoy": 3.1 },
    "dining": { "yoy": 3.8 },
    "shelter": { "yoy": 3.0 },
    "energy": { "yoy": 4.8 },
    "gas": { "yoy": 12.5 },
    "carInsurance": { "yoy": 8.2 },
    "healthcare": { "yoy": 3.1 },
    "tuition": { "yoy": 4.2 },
    "apparel": { "yoy": 1.8 },
    "recreation": { "yoy": 2.2 },
    "other": { "yoy": 2.8 }
  },
  "avgPrices": {
    "APU0000708111": { "current": 6.23, "yearAgo": 3.56 },
    "APU0000703112": { "current": 5.98, "yearAgo": 5.11 },
    "APU0000706111": { "current": 4.65, "yearAgo": 4.28 },
    "APU0000704111": { "current": 7.45, "yearAgo": 6.82 },
    "APU0000709112": { "current": 4.32, "yearAgo": 4.15 },
    "APU0000FS1101": { "current": 5.18, "yearAgo": 4.72 },
    "APU0000710212": { "current": 6.05, "yearAgo": 5.81 },
    "APU0000702111": { "current": 2.14, "yearAgo": 2.05 },
    "APU0000701111": { "current": 1.12, "yearAgo": 1.04 },
    "APU0000701312": { "current": 0.62, "yearAgo": 0.57 },
    "APU0000715211": { "current": 0.89, "yearAgo": 0.84 },
    "APU0000711211": { "current": 0.66, "yearAgo": 0.65 },
    "APU0000712311": { "current": 2.28, "yearAgo": 2.12 },
    "APU0000712112": { "current": 1.39, "yearAgo": 1.21 },
    "APU0000717311": { "current": 8.47, "yearAgo": 7.15 },
    "APU0000FJ4101": { "current": 3.85, "yearAgo": 3.24 },
    "APU0000FN1101": { "current": 6.62, "yearAgo": 6.15 },
    "APU000074714": { "current": 3.52, "yearAgo": 3.14 },
    "APU000072610": { "current": 0.179, "yearAgo": 0.168 },
    "APU000072620": { "current": 1.48, "yearAgo": 1.35 }
  },
  "trend": [
    { "month": "Apr 25", "headline": 2.3 },
    { "month": "May 25", "headline": 2.4 },
    { "month": "Jun 25", "headline": 2.5 },
    { "month": "Jul 25", "headline": 2.6 },
    { "month": "Aug 25", "headline": 2.5 },
    { "month": "Sep 25", "headline": 2.4 },
    { "month": "Oct 25", "headline": null, "gap": true },
    { "month": "Nov 25", "headline": null, "gap": true },
    { "month": "Dec 25", "headline": 2.7 },
    { "month": "Jan 26", "headline": 2.4 },
    { "month": "Feb 26", "headline": 2.4 },
    { "month": "Mar 26", "headline": 3.3 }
  ]
}
```

- [ ] **Step 2: Write the failing merge test**

```js
// src/data/merge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS } from "./catalog.js";
import { buildViewData } from "./merge.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dynamic = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fallback.json"), "utf8"),
);
const catalog = { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS };

test("buildViewData merges static metadata with dynamic values", () => {
  const view = buildViewData(catalog, dynamic);
  assert.equal(view.headline.yoy, 3.3);
  assert.equal(view.headline.seriesId, "CPIAUCNS");   // from catalog
  assert.equal(view.headline.mom, 0.3);
  assert.equal(view.core.yoy, 2.6);

  assert.equal(view.categories.length, 11);
  const gas = view.categories.find(c => c.id === "gas");
  assert.equal(gas.yoy, 12.5);
  assert.equal(gas.color, "#E76F51");                 // from catalog
  assert.equal(gas.icon, "⛽");

  assert.equal(view.avgPrices.length, 20);
  const eggs = view.avgPrices.find(p => p.item === "Eggs, Grade A Large");
  assert.equal(eggs.current, 6.23);
  assert.equal(eggs.unit, "/doz");                    // from catalog

  assert.equal(view.trend.length, 12);
  assert.equal(view.referenceMonthLabel, "March 2026");
});

test("buildViewData tolerates a missing dynamic entry (yoy null)", () => {
  const stripped = { ...dynamic, categories: { ...dynamic.categories, gas: undefined } };
  const view = buildViewData(catalog, stripped);
  const gas = view.categories.find(c => c.id === "gas");
  assert.equal(gas.yoy, null);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test src/data/merge.test.mjs`
Expected: FAIL — cannot find module `./merge.js`.

- [ ] **Step 4: Write the merge function**

```js
// src/data/merge.js
// Merge static catalog metadata with a dynamic payload (from cpi.json or fallback.json)
// into render-ready objects for the app. Pure; no side effects.

export function buildViewData(catalog, dynamic) {
  const { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS } = catalog;

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

  return {
    generatedAt: dynamic.generatedAt ?? null,
    referenceMonth: dynamic.referenceMonth ?? null,
    referenceMonthLabel: dynamic.referenceMonthLabel ?? "",
    headline: macro(HEADLINE, dynamic.headline),
    core: macro(CORE, dynamic.core),
    categories,
    avgPrices,
    trend: dynamic.trend ?? [],
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test src/data/merge.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — all suites (catalog, compute, assemble, merge) green.

- [ ] **Step 7: Commit**

```bash
git add src/data/fallback.json src/data/merge.js src/data/merge.test.mjs
git commit -m "feat: add fallback snapshot and catalog+dynamic merge function"
```

---

### Task 6: Wire the app to loaded data

**Files:**
- Modify: `src/App.jsx` (imports + data loading + all `CPI_DATA`/`TREND_DATA`/`AVG_PRICES` references)

**Interfaces:**
- Consumes: `buildViewData` (Task 5), `catalog.js` exports, `fallback.json`.
- Produces: a `data` view object in the component with `.headline.yoy`, `.core.yoy`, `.categories[]`, `.avgPrices[]`, `.trend`, `.referenceMonthLabel`, `.generatedAt`.

This task is a mechanical swap plus a data-loading effect. There is no isolated unit test; it is verified by the build + browser check in Step 9.

- [ ] **Step 1: Delete the hardcoded constants**

In `src/App.jsx`, delete the three constant blocks:
- `CPI_DATA` (currently lines ~9–25)
- `TREND_DATA` (currently lines ~27–40)
- `AVG_PRICES` (currently lines ~42–63)

Leave `PRESETS`, `presetWeights`, and everything else intact.

- [ ] **Step 2: Update imports and add data loading**

Change the React import (line 1) to include `useEffect`, and add the data imports below the existing `import * as XLSX` line:

```jsx
import { useState, useMemo, useCallback, useEffect } from "react";
```

Add after the `import * as XLSX from "xlsx";` line:

```jsx
import * as catalog from "./data/catalog.js";
import { buildViewData } from "./data/merge.js";
import fallbackDynamic from "./data/fallback.json";
```

- [ ] **Step 3: Load cpi.json with fallback inside the component**

Immediately after `export default function InflationTracker() {` (line ~135), add:

```jsx
  const [dynamic, setDynamic] = useState(fallbackDynamic);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}cpi.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`cpi.json HTTP ${r.status}`))))
      .then(json => { if (!cancelled) setDynamic(json); })
      .catch(err => { console.warn("Using bundled fallback data:", err.message); });
    return () => { cancelled = true; };
  }, []);

  const data = useMemo(() => buildViewData(catalog, dynamic), [dynamic]);
```

- [ ] **Step 4: Swap all data references**

Apply these exact replacements throughout `src/App.jsx` (line numbers are pre-edit approximations):

| Old | New |
|---|---|
| `CPI_DATA.categories` | `data.categories` |
| `CPI_DATA.headline.rate` | `data.headline.yoy` |
| `CPI_DATA.headline.label` | `data.headline.label` |
| `CPI_DATA.headline.seriesId` | `data.headline.seriesId` |
| `CPI_DATA.core.label` | `data.core.label` |
| `CPI_DATA.core.seriesId` | `data.core.seriesId` |
| `CPI_DATA.core.rate` | `data.core.yoy` |
| `CPI_DATA.headline` (as object, line ~784) | `data.headline` |
| `CPI_DATA.core` (as object, line ~784) | `data.core` |
| `CPI_DATA.categories` (spread, line ~784) | `data.categories` |
| `TREND_DATA` | `data.trend` |
| `AVG_PRICES` | `data.avgPrices` |

Also update the hardcoded reference-month strings to use `data.referenceMonthLabel`:
- Line ~187 export row: `["Reference Month", "March 2026 (BLS release USDL-26-0599, April 10, 2026)"]` → `["Reference Month", data.referenceMonthLabel], ["Data fetched", data.generatedAt]`
- Line ~223: `"CPI-U SUB-INDEX DATA — March 2026"` → `` `CPI-U SUB-INDEX DATA — ${data.referenceMonthLabel}` ``
- Line ~227 relative-importance columns: replace the literal `100.0` with `data.headline.relImportance` and `"SA0"` with `data.headline.code`; line ~228 `79.6`→`data.core.relImportance`, `"SA0L1E"`→`data.core.code`.
- Line ~241: `"BLS AVERAGE PRICE DATA — March 2026 vs. March 2025"` → `` `BLS AVERAGE PRICE DATA — ${data.referenceMonthLabel} vs. one year prior` ``
- Line ~377 BigNumber sub: `sub="BLS All Items, Mar 2026"` → `` sub={`BLS All Items, ${data.referenceMonthLabel}`} ``
- Line ~557: `Actual dollar prices ... March 2026 vs. March 2025.` → replace `March 2026 vs. March 2025` with `{data.referenceMonthLabel} vs. one year prior`
- Line ~811 footer: `Reference month: March 2026 (released April 10, 2026).` → `Reference month: {data.referenceMonthLabel}. Data fetched {data.generatedAt}.`

- [ ] **Step 5: Make the shutdown footnotes generic**

The Oct/Nov 2025 gap is now data-driven, so soften the hardcoded shutdown copy:
- Line ~268 export: `"Source: BLS news release USDL-26-0599. Oct-Nov 2025 data not published due to lapse in federal funding."` → `"Source: BLS via FRED. Blank months indicate periods where BLS did not publish data."`
- Line ~453 chart footnote: `Source: BLS news release USDL-26-0599, footnote on Oct/Nov 2025 data availability` → `Source: BLS via FRED. Gaps indicate months with no published data.`

Leave the line ~265 per-row gap note (`"Data unavailable — ..."`) but change it to `d.gap ? "Data unavailable — not published by BLS" : ""`.

- [ ] **Step 6: Run the test suite (unaffected, sanity check)**

Run: `npm test`
Expected: PASS (App.jsx has no unit tests; this confirms nothing else broke).

- [ ] **Step 7: Generate a dev cpi.json so the app has live-shaped data (optional, needs key)**

If a FRED key is available locally:

Run: `FRED_API_KEY=xxxx npm run fetch:fred`
Expected: writes `public/cpi.json`, prints reference month.

If no key: skip — the app will use `fallback.json`, which is correct behavior to verify anyway.

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: build succeeds, no unresolved-import or undefined-variable errors.

- [ ] **Step 9: Verify in the browser**

Run: `npm run preview`
Open the served URL. Confirm: dashboard renders, headline number shows, trend chart renders with the Oct/Nov gap, average-price table populates, Excel export still downloads. (Uses fallback data if no `cpi.json`.)

- [ ] **Step 10: Commit**

```bash
git add src/App.jsx
git commit -m "feat: load CPI data from cpi.json with bundled fallback"
```

---

### Task 7: Add the MoM UI

**Files:**
- Modify: `src/App.jsx` (headline card, ~lines 376–378)

**Interfaces:**
- Consumes: `data.headline.{mom,momAnnualized}`, `data.core.{mom,momAnnualized}` from Task 6.

- [ ] **Step 1: Add the MoM readout under the headline BigNumber**

In the headline card (the `<div>` containing `<BigNumber value={data.headline.yoy} label="Headline CPI-U" .../>`, ~line 377), add a MoM block immediately after the `<BigNumber .../>`:

```jsx
                <BigNumber value={data.headline.yoy} label="Headline CPI-U" sub={`BLS All Items, ${data.referenceMonthLabel}`} color="#1B4965" />
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#666", lineHeight: 1.7 }}>
                  <div>
                    Headline{" "}
                    <strong style={{ color: (data.headline.mom ?? 0) >= 0 ? "#c1121f" : "#2D6A4F" }}>
                      {(data.headline.mom ?? 0) >= 0 ? "+" : ""}{data.headline.mom ?? "—"}%
                    </strong>{" "}
                    MoM · {data.headline.momAnnualized ?? "—"}% annualized
                  </div>
                  <div>
                    Core{" "}
                    <strong style={{ color: (data.core.mom ?? 0) >= 0 ? "#c1121f" : "#2D6A4F" }}>
                      {(data.core.mom ?? 0) >= 0 ? "+" : ""}{data.core.mom ?? "—"}%
                    </strong>{" "}
                    MoM · {data.core.momAnnualized ?? "—"}% annualized
                  </div>
                </div>
```

- [ ] **Step 2: Build and eyeball**

Run: `npm run build && npm run preview`
Open the URL. Confirm the headline card shows "Headline +0.3% MoM · 3.7% annualized" and a "Core …" line beneath the big headline number, colored red for positive / green for negative.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: show month-over-month change for headline and core"
```

---

### Task 8: GitHub Actions — fetch step + schedule

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: repo secret `FRED_API_KEY`, `scripts/fetch-fred.mjs`, `npm test`.

- [ ] **Step 1: Update triggers and add fetch + test steps**

Replace the top `on:` block and insert the test + fetch steps before `Build`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:
  schedule:
    # BLS releases CPI mid-month; run on the 13th and 16th (14:00 UTC) to catch
    # the release plus any immediate revision. cpi.json refreshes on each run.
    - cron: "0 14 13 * *"
    - cron: "0 14 16 * *"

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Fetch FRED data
        run: node scripts/fetch-fred.mjs
        env:
          FRED_API_KEY: ${{ secrets.FRED_API_KEY }}

      - name: Build
        run: npm run build

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

- [ ] **Step 2: Validate YAML locally**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/deploy.yml','utf8'); if(!/schedule:/.test(y)||!/FRED_API_KEY/.test(y)) throw new Error('missing pieces'); console.log('workflow OK')"`
Expected: prints `workflow OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: fetch FRED data at build time and refresh mid-month"
```

- [ ] **Step 4: User action — add the secret (manual, out of band)**

Tell the user to create a free FRED key at <https://fred.stlouisfed.org/docs/api/api_key.html> and add it as repo secret `FRED_API_KEY` (Settings → Secrets and variables → Actions → New repository secret). Until then, the scheduled/pushed workflow's "Fetch FRED data" step will fail loudly and the previously-deployed `cpi.json` (or the bundled fallback) keeps serving.

---

### Task 9: Docs

**Files:**
- Modify: `README.md`, `docs/CHANGELOG.md`, `docs/BACKLOG.md`

- [ ] **Step 1: Update README data section**

Add a "Data" section to `README.md` after the intro:

```markdown
## Data

CPI numbers are fetched from the [FRED API](https://fred.stlouisfed.org/) at build
time by `scripts/fetch-fred.mjs` and written to `public/cpi.json`. The app loads that
file at runtime and falls back to `src/data/fallback.json` if it is unavailable.
YoY figures use NSA series (e.g. `CPIAUCNS`); MoM figures use seasonally-adjusted
series (e.g. `CPIAUCSL`). A GitHub Actions schedule refreshes the data on the 13th
and 16th of each month. Set the `FRED_API_KEY` repo secret to enable fetching.
```

- [ ] **Step 2: Add CHANGELOG entry**

Prepend an entry to `docs/CHANGELOG.md` following the existing format, summarizing: FRED build-time integration, MoM for headline/core, data-driven trend/gaps, catalog+merge architecture, fallback resilience, mid-month cron, `node --test` suite.

- [ ] **Step 3: Note follow-ups in BACKLOG**

Add to `docs/BACKLOG.md`: (a) surface `stale` flags subtly in the UI when a series falls back; (b) optional daily cron if mid-month proves too sparse; (c) consider category MoM if SA `CUSR` series coverage is sufficient.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/CHANGELOG.md docs/BACKLOG.md
git commit -m "docs: document FRED live-data integration"
```

---

## Self-Review

**Spec coverage:**
- Build-time fetch via Actions with secret → Tasks 4, 8. ✓
- No CORS / key never shipped → server-side fetch in Task 4; secret in Task 8. ✓
- YoY=NSA, MoM=SA series (exact ids) → Task 1 catalog. ✓
- Headline + core MoM (+ annualized) → Tasks 2, 3, 7. ✓
- Categories YoY-only → Task 1/3 (no mom series for categories). ✓
- Average prices current + year-ago → Task 2 `avgPrice`, Task 3. ✓
- Trend auto-advances, data-driven gaps → Task 2 `buildTrend`, Task 6 Step 5. ✓
- Weights stay hardcoded → `presetWeights` untouched (Task 6 Step 1 leaves them). ✓
- cpi.json carries seriesId + generatedAt stamp → seriesId via catalog merge (Task 5); generatedAt in payload (Task 3); UI stamp in Task 6 Steps 4. ✓
- Per-series fallback + stale; whole-fetch fails loudly; client fallback → Task 3 (stale), Task 4 (exit 1), Task 6 (fetch catch). ✓
- Mid-month cron + workflow_dispatch + push → Task 8. ✓
- node --test, no new deps → Tasks 1–5, package.json Task 4. ✓
- User adds FRED_API_KEY → Task 8 Step 4. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `buildViewData(catalog, dynamic)` signature consistent across Tasks 5–6. `assemblePayload({...})` object arg consistent Tasks 3–4. `allSeries()` returns `{id,kind}` used in Task 4. Compute function names identical between Task 2 defs and Task 3 imports (dropped the non-existent `latestDateLabel` in Task 3 Step 4). Payload field names (`yoy`,`mom`,`momAnnualized`,`categories`,`avgPrices`,`trend`,`referenceMonthLabel`,`generatedAt`) identical across assemble/fallback/merge. ✓
```
