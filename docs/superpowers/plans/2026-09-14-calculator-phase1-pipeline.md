# Calculator Phase 1 (Data Pipeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the build-time data pipeline so `public/cpi.json` carries a 12-month rate for every calculator line (including BLS-only series) and an average-household basket whose "Everything else" rate reproduces the headline, without changing anything visible on the live site.

**Architecture:** Series metadata lives in `src/data/catalog.js`; FRED series are fetched as today, BLS-only series come from one BLS API v2 POST parsed into the same raw observation shape FRED returns, so the pure `compute.mjs` / `assemble.mjs` layer stays source-agnostic. New pure math rolls December relative-importance weights forward to the reference month and solves the residual rate. The fetch script logs GitHub Actions annotations, falls back to the currently deployed `cpi.json`, and a post-deploy check turns the run red if any BLS line is stale.

**Tech Stack:** Node 22 ESM scripts (`.mjs`), built-in `node --test` + `node:assert/strict`, GitHub Actions, FRED API, BLS Public Data API v2. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-10-calculator-first-redesign-design.md` (sections *Calculation model*, *Rolled weights*, *Average household*, *Data pipeline (Phase 1)*, *Testing*, *Verified facts*).

## Global Constraints

- No new npm dependencies. Tests use `node --test` (run all with `npm test`).
- Phase 1 must not change the UI: do not edit `src/App.jsx`, `index.html`, or anything under `src/` except `src/data/catalog.js`, `src/data/catalog.test.mjs`, `src/data/merge.test.mjs`, `src/data/fallback.json`.
- Series ids, relative-importance values and CE figures are copied verbatim from the spec (tables below repeat them).
- `lines[id].yoy`, `basket.weights`, `basket.rates`, `basket.restWeight`, `basket.residualYoy`, `basket.headlineYoy` are rounded to **6 decimals**.
- `lines` and `basket` are **always** computed at the reference month (`refDate` from `yoyAnchorDate`), never at each series' own latest month.
- The existing headline/core fatal guard (`staleMacroKeys`) and the `FRED_API_KEY` fatal check stay exactly as they are.
- Build annotations use `::warning title=<Title>::<message>` and `::error title=<Title>::<message>`. Never print `BLS_API_KEY` or `FRED_API_KEY`.
- Pushing to `main` deploys the site. Only Task 5 pushes, after all tests pass.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AGWPxJCZkAmd2g5o6AKF3R
  ```

**Reference data (from the spec's Verified facts):**

| Item | Series | Source | RI Dec 2025 |
|---|---|---|---|
| Physicians' services | `CUUR0000SEMC01` | BLS | 1.684 |
| Prescription drugs | `CUUR0000SEMF01` | BLS | 0.973 |
| Housing (Shelter) | `CUUR0000SAH1` | FRED | 35.625 |
| Groceries (Food at home) | `CUUR0000SAF11` | FRED | 8.325 |
| Eating out (Food away from home) | `CUUR0000SEFV` | FRED | 5.373 |
| Home energy (Household energy) | `CUUR0000SAH21` | FRED | 3.402 |
| Gas for the car (Gasoline) | `CUUR0000SETB01` | FRED | 2.895 |
| Health care (Medical care) | `CPIMEDNS` | FRED | 8.423 |
| Clothing (Apparel) | `CPIAPPNS` | FRED | 2.368 |
| Entertainment (Recreation) | `CPIRECNS` | FRED | 5.137 |

CE 2024: $78,535 − $9,797 = $68,738 a year → `ceMonthlyMean: 5750`.

---

### Task 1: Calculator series manifest in the catalog

**Files:**
- Modify: `src/data/catalog.js` (add exports above `allSeries()`, extend `allSeries()`, add `blsSeries()`)
- Test: `src/data/catalog.test.mjs`

**Interfaces:**
- Produces:
  - `CALC_LINES: Array<{ id: string, label: string, seriesId: string, source: "fred" | "bls" }>`
  - `CALC_COMBOS: Array<{ id: string, label: string, source: "bls", parts: Array<{ seriesId: string, label: string, riDec: number }> }>`
  - `BASKET: { riYear: 2025, riSourceUrl: string, visible: Array<{ id, label, seriesId, riDec }>, ceYear: 2024, ceSourceUrl: string, ceMonthlyMean: 5750 }`
  - `allSeries()` now also returns FRED-sourced `CALC_LINES` ids and every `BASKET.visible` id (kind `"level"`), still de-duplicated and still **FRED-only**.
  - `blsSeries(): string[]` — every BLS-sourced series id (lines + combo parts), de-duplicated.

- [ ] **Step 1: Write the failing tests**

In `src/data/catalog.test.mjs`, change the import line to:

```js
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, allSeries, WEEKLY_PRICES, CALC_LINES, CALC_COMBOS, BASKET, blsSeries } from "./catalog.js";
```

Append:

```js
test("calculator lines: unique ids, known sources, CUUR or CPI series ids", () => {
  const ids = [...CALC_LINES.map(l => l.id), ...CALC_COMBOS.map(c => c.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const l of CALC_LINES) {
    assert.ok(["fred", "bls"].includes(l.source), `${l.id} has a known source`);
    assert.match(l.seriesId, /^(CUUR0000|CPI)/);
    assert.ok(l.label);
  }
  for (const c of CALC_COMBOS) {
    assert.ok(c.parts.length >= 2, `${c.id} combines at least two parts`);
    for (const p of c.parts) assert.ok(p.riDec > 0 && /^CUUR0000/.test(p.seriesId) && p.label);
  }
});

test("allSeries stays FRED-only; blsSeries lists every BLS-only id once", () => {
  const fred = new Set(allSeries().map(s => s.id));
  const bls = blsSeries();
  assert.equal(new Set(bls).size, bls.length);
  assert.deepEqual([...bls].sort(), [
    "CUUR0000SEEB01", "CUUR0000SEEB03", "CUUR0000SEHE01", "CUUR0000SEMC01",
    "CUUR0000SEMF01", "CUUR0000SETE", "CUUR0000SETG02",
  ]);
  for (const id of bls) assert.ok(!fred.has(id), `${id} must not be requested from FRED`);
  for (const l of CALC_LINES.filter(l => l.source === "fred")) assert.ok(fred.has(l.seriesId), `${l.seriesId} is fetched from FRED`);
  for (const v of BASKET.visible) assert.ok(fred.has(v.seriesId), `${v.seriesId} is fetched from FRED`);
});

test("basket: December 2025 weights leave 28.452 (at least 10) for everything else", () => {
  assert.equal(BASKET.riYear, 2025);
  assert.equal(new Set(BASKET.visible.map(v => v.id)).size, BASKET.visible.length);
  const visible = BASKET.visible.reduce((s, v) => s + v.riDec, 0);
  assert.ok(100 - visible >= 10);
  assert.equal(Number((100 - visible).toFixed(3)), 28.452);
  assert.equal(BASKET.ceMonthlyMean, 5750);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test src/data/catalog.test.mjs`
Expected: FAIL — `SyntaxError: The requested module './catalog.js' does not provide an export named 'CALC_LINES'`.

- [ ] **Step 3: Implement**

In `src/data/catalog.js`, insert above the `// The de-duplicated list of FRED series…` comment:

```js
// ── Calculator (redesign, Phase 1) ─────────────────────────────────────────
// The 12-month rate behind each line of the "Your costs" calculator. source "fred" series are
// fetched with FRED_API_KEY like everything above. source "bls" series are NOT mirrored on FRED
// (checked 2026-09-10/14) and come from the BLS Public Data API v2 with BLS_API_KEY.
// Lines without a series (mortgage = 0%, insurance = the person's renewal increase, charging =
// the electricity rate, everything else = the basket residual) are handled in the front end.
export const CALC_LINES = [
  { id: "rent",      label: "Rent",                seriesId: "CUUR0000SEHA",   source: "fred" },
  { id: "upkeep",    label: "Home repairs",        seriesId: "CUUR0000SAH3",   source: "fred" },
  { id: "groceries", label: "Groceries",           seriesId: "CUUR0000SAF11",  source: "fred" },
  { id: "dining",    label: "Eating out",          seriesId: "CUUR0000SEFV",   source: "fred" },
  { id: "gasoline",  label: "Gas for the car",     seriesId: "CUUR0000SETB01", source: "fred" },
  { id: "carIns",    label: "Car insurance",       seriesId: "CUUR0000SETE",   source: "bls" },
  { id: "carUpkeep", label: "Car repairs",         seriesId: "CUUR0000SETD",   source: "fred" },
  { id: "transit",   label: "Bus and train fares", seriesId: "CUUR0000SETG02", source: "bls" },
  { id: "electric",  label: "Electricity",         seriesId: "CUUR0000SEHF01", source: "fred" },
  { id: "heatGas",   label: "Natural gas bill",    seriesId: "CUUR0000SEHF02", source: "fred" },
  { id: "heatOil",   label: "Heating oil",         seriesId: "CUUR0000SEHE01", source: "bls" },
  { id: "daycare",   label: "Daycare",             seriesId: "CUUR0000SEEB03", source: "bls" },
  { id: "tuition",   label: "College tuition",     seriesId: "CUUR0000SEEB01", source: "bls" },
  { id: "clothing",  label: "Clothing",            seriesId: "CPIAPPNS",       source: "fred" },
  { id: "fun",       label: "Entertainment",       seriesId: "CPIRECNS",       source: "fred" },
];

// Lines built from several series, combined with weights rolled forward from December
// relative importance (BLS, December 2025) — see combineRates in scripts/compute.mjs.
export const CALC_COMBOS = [
  {
    id: "doctor", label: "Doctor and pharmacy", source: "bls",
    parts: [
      { seriesId: "CUUR0000SEMC01", label: "Physicians' services", riDec: 1.684 },
      { seriesId: "CUUR0000SEMF01", label: "Prescription drugs",   riDec: 0.973 },
    ],
  },
];

// The average U.S. household: visible lines with December 2025 relative importance (percent of
// all items, 2024 weights). Everything else is the remaining weight, and its rate is solved so
// the basket reproduces the headline (residualRate in scripts/compute.mjs). Update yearly.
export const BASKET = {
  riYear: 2025,
  riSourceUrl: "https://www.bls.gov/cpi/tables/relative-importance/2025.htm",
  visible: [
    { id: "housing",   label: "Housing",         seriesId: "CUUR0000SAH1",   riDec: 35.625 },
    { id: "groceries", label: "Groceries",       seriesId: "CUUR0000SAF11",  riDec: 8.325 },
    { id: "dining",    label: "Eating out",      seriesId: "CUUR0000SEFV",   riDec: 5.373 },
    { id: "energy",    label: "Home energy",     seriesId: "CUUR0000SAH21",  riDec: 3.402 },
    { id: "gasoline",  label: "Gas for the car", seriesId: "CUUR0000SETB01", riDec: 2.895 },
    { id: "health",    label: "Health care",     seriesId: "CPIMEDNS",       riDec: 8.423 },
    { id: "clothing",  label: "Clothing",        seriesId: "CPIAPPNS",       riDec: 2.368 },
    { id: "fun",       label: "Entertainment",   seriesId: "CPIRECNS",       riDec: 5.137 },
  ],
  // Consumer Expenditure Survey 2024: $78,535 average annual expenditures minus $9,797 personal
  // insurance and pensions = $68,738 a year, rounded to $5,750 a month.
  ceYear: 2024,
  ceSourceUrl: "https://www.bls.gov/news.release/cesan.nr0.htm",
  ceMonthlyMean: 5750,
};

// BLS-only series ids the fetch script requests from the BLS API (never from FRED).
export function blsSeries() {
  const ids = new Set();
  for (const l of CALC_LINES) if (l.source === "bls") ids.add(l.seriesId);
  for (const c of CALC_COMBOS) if (c.source === "bls") for (const p of c.parts) ids.add(p.seriesId);
  return [...ids];
}
```

In `allSeries()`, add these two lines just before `return [...seen.values()];`:

```js
  for (const l of CALC_LINES) if (l.source === "fred") add(l.seriesId, "level");
  for (const v of BASKET.visible) add(v.seriesId, "level");
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests (46 existing + 3 new = 49).

- [ ] **Step 5: Commit**

```bash
git add src/data/catalog.js src/data/catalog.test.mjs
git commit -m "feat(catalog): calculator lines, doctor combo and average-household basket manifest

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGWPxJCZkAmd2g5o6AKF3R"
```

---

### Task 2: BLS API request body and response parser

**Files:**
- Create: `scripts/bls.mjs`
- Test: `scripts/bls.test.mjs`

**Interfaces:**
- Consumes: `parseObservations(raw)` from `scripts/compute.mjs` (test only).
- Produces:
  - `BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"`
  - `blsRequestBody(seriesIds: string[], { startYear: number, endYear: number, registrationKey: string }) → { seriesid, startyear, endyear, registrationkey }` (years as strings)
  - `parseBlsResponse(json, requestedIds: string[]) → { ok: boolean, error: string | null, bySeries: { [seriesId]: Array<{ date: "YYYY-MM-01", value: string }> }, missing: string[] }` — rows oldest first, `M13` dropped, `"-"` → `"."`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/bls.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { blsRequestBody, parseBlsResponse } from "./bls.mjs";
import { parseObservations } from "./compute.mjs";

// Shape of a live v2 response (checked 2026-09-14): series newest first; "-" for a month BLS
// never published (October 2025); M13 annual averages appear only if annualaverage is requested.
const ok = {
  status: "REQUEST_SUCCEEDED",
  message: ["No Data Available for Series CUUR0000XXXX Year: 2026"],
  Results: {
    series: [
      {
        seriesID: "CUUR0000SETE",
        data: [
          { year: "2026", period: "M08", periodName: "August", latest: "true", value: "912.345", footnotes: [{}] },
          { year: "2025", period: "M13", periodName: "Annual", value: "900.000", footnotes: [{}] },
          { year: "2025", period: "M11", periodName: "November", value: "901.000", footnotes: [{}] },
          { year: "2025", period: "M10", periodName: "October", value: "-", footnotes: [{ code: "X", text: "Data unavailable." }] },
          { year: "2025", period: "M08", periodName: "August", value: "955.100", footnotes: [{}] },
        ],
      },
      { seriesID: "CUUR0000XXXX", data: [] },
    ],
  },
};

test("blsRequestBody uses the exact v2 field names, years as strings", () => {
  assert.deepEqual(
    blsRequestBody(["A", "B"], { startYear: 2024, endYear: 2026, registrationKey: "k" }),
    { seriesid: ["A", "B"], startyear: "2024", endyear: "2026", registrationkey: "k" },
  );
});

test("parseBlsResponse returns FRED-shaped rows, oldest first, without annual averages", () => {
  const r = parseBlsResponse(ok, ["CUUR0000SETE", "CUUR0000XXXX"]);
  assert.equal(r.ok, true);
  assert.equal(r.error, null);
  assert.deepEqual(r.bySeries.CUUR0000SETE, [
    { date: "2025-08-01", value: "955.100" },
    { date: "2025-10-01", value: "." },
    { date: "2025-11-01", value: "901.000" },
    { date: "2026-08-01", value: "912.345" },
  ]);
  assert.deepEqual(r.missing, ["CUUR0000XXXX"]);
});

test('a "-" month reads as null through parseObservations, never as zero', () => {
  const obs = parseObservations(parseBlsResponse(ok, ["CUUR0000SETE"]).bySeries.CUUR0000SETE);
  assert.equal(obs.find(o => o.date === "2025-10-01").value, null);
});

test("a requested id BLS does not mention at all is missing too", () => {
  assert.deepEqual(parseBlsResponse(ok, ["CUUR0000SETE", "CUUR0000ZZZZ"]).missing, ["CUUR0000ZZZZ"]);
});

test("any status other than REQUEST_SUCCEEDED fails the whole request", () => {
  const r = parseBlsResponse(
    { status: "REQUEST_NOT_PROCESSED", message: ["The daily threshold for total number of requests has been reached."], Results: {} },
    ["CUUR0000SETE"],
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /daily threshold/);
  assert.deepEqual(r.bySeries, {});
  assert.deepEqual(r.missing, ["CUUR0000SETE"]);
  assert.equal(parseBlsResponse(null, ["A"]).ok, false);
  assert.match(parseBlsResponse({ status: "REQUEST_FAILED", message: [] }, ["A"]).error, /REQUEST_FAILED/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/bls.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/bls.mjs'`.

- [ ] **Step 3: Implement**

Create `scripts/bls.mjs`:

```js
// scripts/bls.mjs
// BLS Public Data API v2: request body and response parsing. Pure — the network call lives in
// fetch-fred.mjs. Rows come out in the raw FRED observation shape ({ date: "YYYY-MM-01",
// value: "123.456" | "." }, oldest first), so parseObservations/compute/assemble need no
// BLS-specific logic. A missing month must become "." (not null): parseObservations turns "."
// into null, but Number(null) would be a real zero.

export const BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

export function blsRequestBody(seriesIds, { startYear, endYear, registrationKey }) {
  return {
    seriesid: seriesIds,
    startyear: String(startYear),
    endyear: String(endYear),
    registrationkey: registrationKey,
  };
}

const MONTHLY_PERIOD = /^M(0[1-9]|1[0-2])$/; // M01–M12; drops M13 annual averages

// ok:false → the whole request failed (quota, bad key, malformed): every requested id is missing.
// ok:true  → `missing` lists requested ids that came back with no monthly rows.
export function parseBlsResponse(json, requestedIds) {
  if (!json || json.status !== "REQUEST_SUCCEEDED") {
    const detail = Array.isArray(json?.message) && json.message.length
      ? json.message.join(" ")
      : `status ${json?.status ?? "missing"}`;
    return { ok: false, error: detail, bySeries: {}, missing: [...requestedIds] };
  }
  const bySeries = {};
  for (const s of json.Results?.series ?? []) {
    const rows = (s.data ?? [])
      .filter((d) => MONTHLY_PERIOD.test(d.period))
      .map((d) => ({
        date: `${d.year}-${d.period.slice(1)}-01`,
        value: d.value === "-" || d.value === "" || d.value == null ? "." : String(d.value),
      }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (rows.length) bySeries[s.seriesID] = rows;
  }
  return { ok: true, error: null, bySeries, missing: requestedIds.filter((id) => !bySeries[id]) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (49 + 5 = 54).

- [ ] **Step 5: Commit**

```bash
git add scripts/bls.mjs scripts/bls.test.mjs
git commit -m "feat(pipeline): parse BLS API v2 responses into FRED-shaped observations

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGWPxJCZkAmd2g5o6AKF3R"
```

---

### Task 3: Weight math — rolled weights, combined rates, residual

**Files:**
- Modify: `scripts/compute.mjs` (append exports)
- Test: `scripts/compute.test.mjs` (extend import, append tests)

**Interfaces:**
- Produces (all pure; rates are **percent**, e.g. `3.4`):
  - `valueAt(observations, date: "YYYY-MM-01") → number | null`
  - `yoyAt(observations, date) → number | null` — unrounded 12-month % change at exactly `date`.
  - `round6(n: number) → number`
  - `rolledWeights(parts: Array<{ key, riDec, levelDec, levelT }>, { allDec, allT }) → { [key]: number } | null` — `riDec × (levelT/levelDec) ÷ (allT/allDec)`; null if any level is missing or not positive.
  - `combineRates(weights: { [key]: number }, rates: { [key]: number | null }) → number | null` — `1/(Σ s_i/(1+r_i)) − 1` with `s_i` = weights normalized to sum 1.
  - `residualRate(headlinePct, weights (percent of all items, visible only), rates, minRest = 10) → number | null` — rate for the remaining `100 − Σ weights` that reproduces the headline; null if rest < `minRest`, any rate is null, or no positive solution.

- [ ] **Step 1: Write the failing tests**

In `scripts/compute.test.mjs`, change the import to:

```js
import {
  parseObservations, shiftMonths, computeYoY, computeMoM,
  computeMoMAnnualized, buildTrend, avgPrice, monthLabel, referenceMonthLabel,
  latestValue, weeklyPrice, weekLabel, yoyAnchorDate,
  valueAt, yoyAt, round6, rolledWeights, combineRates, residualRate,
} from "./compute.mjs";
```

Append:

```js
// ── Calculator weights ────────────────────────────────────────────────────
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("valueAt and yoyAt read one exact month; null when either side is missing", () => {
  const obs = parseObservations(raw);
  assert.equal(valueAt(obs, "2026-03-01"), 104.3);
  assert.equal(valueAt(obs, "2025-10-01"), null);      // "." in the fixture
  assert.equal(valueAt(obs, "2030-01-01"), null);      // not in the series at all
  close(yoyAt(obs, "2026-03-01"), (104.3 / 101.0 - 1) * 100);
  assert.equal(yoyAt(obs, "2026-10-01"), null);
  assert.equal(round6(1.23456789), 1.234568);
});

test("rolledWeights moves December weights by each part's price change relative to all items", () => {
  const w = rolledWeights(
    [
      { key: "gas", riDec: 10, levelDec: 100, levelT: 120 },
      { key: "rent", riDec: 30, levelDec: 200, levelT: 206 },
    ],
    { allDec: 300, allT: 309 },
  );
  close(w.gas, 10 * (120 / 100) / (309 / 300));
  close(w.rent, 30);                                   // rose exactly as much as all items
  assert.equal(rolledWeights([{ key: "x", riDec: 1, levelDec: null, levelT: 1 }], { allDec: 1, allT: 1 }), null);
  assert.equal(rolledWeights([{ key: "x", riDec: 1, levelDec: 1, levelT: 1 }], { allDec: null, allT: 1 }), null);
});

test("combineRates weights 12-month changes by current-month shares (harmonic)", () => {
  // equal shares of a flat part and a doubled part: 1 / (0.5/1 + 0.5/2) − 1 = 33.33%
  close(combineRates({ a: 1, b: 1 }, { a: 0, b: 100 }), 100 / 3);
  close(combineRates({ a: 3, b: 1 }, { a: -10, b: 10 }), (1 / (0.75 / 0.9 + 0.25 / 1.1) - 1) * 100);
  assert.equal(combineRates({ a: 1 }, { a: null }), null);
  assert.equal(combineRates({}, {}), null);
});

test("residualRate solves everything else so the basket reproduces the headline", () => {
  const weights = { gas: 20, food: 30 };               // rest = 50
  const rates = { gas: 25, food: 4 };
  const headline = (1 / (0.2 / 1.25 + 0.3 / 1.04 + 0.5 / 1.025) - 1) * 100;
  close(residualRate(headline, weights, rates), 2.5);
});

test("residualRate refuses a rest under 10, a missing rate, or an impossible solution", () => {
  assert.equal(residualRate(3, { a: 95 }, { a: 3 }), null);
  assert.equal(residualRate(3, { a: 50 }, { a: null }), null);
  // the visible half alone already implies a deflator above the headline's
  assert.equal(residualRate(0, { a: 50 }, { a: -60 }), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/compute.test.mjs`
Expected: FAIL — `does not provide an export named 'valueAt'`.

- [ ] **Step 3: Implement**

Append to `scripts/compute.mjs`:

```js
// ── Calculator weights ────────────────────────────────────────────────────
export function round6(n) { return Math.round(n * 1e6) / 1e6; }

export function valueAt(observations, date) {
  const v = toMap(observations).get(date);
  return v == null ? null : v;
}

// Unrounded 12-month change at exactly `date` (no fallback to another month).
export function yoyAt(observations, date) {
  const map = toMap(observations);
  const now = map.get(date);
  const prior = map.get(shiftMonths(date, -12));
  if (now == null || prior == null || prior === 0) return null;
  return (now / prior - 1) * 100;
}

// BLS publishes relative importance for December. A component's weight in a later month t is
// its December weight moved by its own price change relative to all items:
//   w_i(t) = w_i(Dec) × (I_i,t / I_i,Dec) ÷ (I_all,t / I_all,Dec)
// Using December weights unrolled was off by 0.7 points for the basket residual in Aug 2026.
export function rolledWeights(parts, { allDec, allT }) {
  if (!(allDec > 0) || !(allT > 0)) return null;
  const allMove = allT / allDec;
  const out = {};
  for (const p of parts) {
    if (!(p.levelDec > 0) || !(p.levelT > 0)) return null;
    out[p.key] = p.riDec * (p.levelT / p.levelDec) / allMove;
  }
  return out;
}

// Combine parts' 12-month changes using their current-month shares: 1/(1+R) = Σ s_i/(1+r_i).
// Exact for a fixed basket across the window; approximate when it crosses January's reweighting.
export function combineRates(weights, rates) {
  const keys = Object.keys(weights);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  if (!(total > 0)) return null;
  let inverse = 0;
  for (const k of keys) {
    if (rates[k] == null) return null;
    inverse += (weights[k] / total) / (1 + rates[k] / 100);
  }
  return (1 / inverse - 1) * 100;
}

// The rate for "everything else" (weight 100 − Σ visible) that makes the visible parts plus the
// rest reproduce the headline: 1+r_rest = s_rest ÷ (1/(1+R) − Σ s_i/(1+r_i)).
export function residualRate(headlinePct, weights, rates, minRest = 10) {
  const keys = Object.keys(weights);
  const rest = 100 - keys.reduce((s, k) => s + weights[k], 0);
  if (rest < minRest) return null;
  let visibleInverse = 0;
  for (const k of keys) {
    if (rates[k] == null) return null;
    visibleInverse += (weights[k] / 100) / (1 + rates[k] / 100);
  }
  const restInverse = 1 / (1 + headlinePct / 100) - visibleInverse;
  if (!(restInverse > 0)) return null;
  return ((rest / 100) / restInverse - 1) * 100;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (54 + 5 = 59).

- [ ] **Step 5: Commit**

```bash
git add scripts/compute.mjs scripts/compute.test.mjs
git commit -m "feat(pipeline): rolled relative-importance weights, combined rates and basket residual

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGWPxJCZkAmd2g5o6AKF3R"
```

---

### Task 4: Assemble `lines` and `basket`, plus warning and gate helpers

**Files:**
- Modify: `scripts/assemble.mjs`
- Test: `scripts/assemble.test.mjs` (extend imports, append tests at the end of the file)

**Interfaces:**
- Consumes: `valueAt`, `yoyAt`, `round6`, `rolledWeights`, `combineRates`, `residualRate` (Task 3); `CALC_LINES`, `CALC_COMBOS`, `BASKET` shapes (Task 1).
- Produces:
  - `assemblePayload(...)` adds, only when the catalog defines them:
    - `payload.lines: { [id]: { yoy: number } | { yoy: number | null, stale: true } }` for every `CALC_LINES` and `CALC_COMBOS` id.
    - `payload.basket: { month: "YYYY-MM", weights: { [visibleId]: number }, rates: { [visibleId]: number }, restWeight: number, residualYoy: number, headlineYoy: number }` or `{ ...lastKnown, stale: true }`.
  - `staleBlsLines(payload, catalog) → string[]` — ids of BLS-sourced lines/combos that are stale or absent.
  - `calculatorWarnings(payload, maxResidualGap = 3) → string[]`.

- [ ] **Step 1: Write the failing tests**

In `scripts/assemble.test.mjs`, change the first import to:

```js
import { assemblePayload, staleMacroKeys, staleBlsLines, calculatorWarnings } from "./assemble.mjs";
```

Append at the **end** of the file (after the `yoyGap` tests, so `gapSeries` is defined):

```js
// ── Calculator lines and basket ──────────────────────────────────────────
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

const calcCatalog = {
  ...catalog,
  CALC_LINES: [
    { id: "carIns", label: "Car insurance", seriesId: "CUUR0000SETE", source: "bls" },
    { id: "rent", label: "Rent", seriesId: "CUUR0000SEHA", source: "fred" },
  ],
  CALC_COMBOS: [
    { id: "doctor", label: "Doctor and pharmacy", source: "bls", parts: [
      { seriesId: "CUUR0000SEMC01", label: "Physicians' services", riDec: 2 },
      { seriesId: "CUUR0000SEMF01", label: "Prescription drugs", riDec: 1 },
    ] },
  ],
  BASKET: {
    riYear: 2025,
    visible: [
      { id: "gasoline", label: "Gas for the car", seriesId: "CUUR0000SETB01", riDec: 20 },
      { id: "housing", label: "Housing", seriesId: "CUUR0000SEHA", riDec: 40 },
    ],
    ceMonthlyMean: 5750,
  },
};

// series(start, step): Feb 2025 (i=0) … Dec 2025 (i=10) … Mar 2026 (i=13)
const calcObs = {
  ...observationsBySeries,               // CPIAUCNS series(100, 0.3), CUUR0000SETB01 series(200, 1)
  CUUR0000SETE: series(300, -1),         // falling prices
  CUUR0000SEHA: series(200, 0.6),
  CUUR0000SEMC01: series(100, 0.4),
  CUUR0000SEMF01: series(100, -0.2),
};

test("lines: 12-month rates at the reference month, 6 decimals, negatives kept", () => {
  const p = assemblePayload({ observationsBySeries: calcObs, catalog: calcCatalog, fallback: null, generatedAt: "T" });
  near(p.lines.carIns.yoy, (287 / 299 - 1) * 100);   // Mar 2026 vs Mar 2025
  assert.equal(p.lines.carIns.stale, undefined);
  near(p.lines.rent.yoy, (207.8 / 200.6 - 1) * 100);
  assert.equal(p.lines.carIns.yoy, Math.round(p.lines.carIns.yoy * 1e6) / 1e6);
});

test("lines: a combo uses shares rolled from December by each part's own prices", () => {
  const p = assemblePayload({ observationsBySeries: calcObs, catalog: calcCatalog, fallback: null, generatedAt: "T" });
  const w1 = 2 * (105.2 / 104.0), w2 = 1 * (97.4 / 98.0);      // Mar 2026 ÷ Dec 2025 levels
  const s1 = w1 / (w1 + w2), s2 = w2 / (w1 + w2);
  const r1 = 105.2 / 100.4 - 1, r2 = 97.4 / 99.8 - 1;           // Mar 2026 vs Mar 2025
  near(p.lines.doctor.yoy, (1 / (s1 / (1 + r1) + s2 / (1 + r2)) - 1) * 100);
});

test("lines: always pinned to the reference month, even when a series has a later month", () => {
  const obsWithApril = { ...calcObs, CUUR0000SETE: [...series(300, -1), { date: "2026-04-01", value: "250" }] };
  const p = assemblePayload({ observationsBySeries: obsWithApril, catalog: calcCatalog, fallback: null, generatedAt: "T" });
  near(p.lines.carIns.yoy, (287 / 299 - 1) * 100);
});

test("basket: rolled weights and a residual that reproduces the headline exactly", () => {
  const p = assemblePayload({ observationsBySeries: calcObs, catalog: calcCatalog, fallback: null, generatedAt: "T" });
  const b = p.basket;
  assert.equal(b.month, "2026-03");
  const allMove = 103.9 / 103.0;                                  // CPIAUCNS Mar 2026 ÷ Dec 2025
  near(b.weights.gasoline, 20 * (213 / 210) / allMove);
  near(b.weights.housing, 40 * (207.8 / 206) / allMove);
  near(b.restWeight, 100 - b.weights.gasoline - b.weights.housing);
  near(b.headlineYoy, (103.9 / 100.3 - 1) * 100);
  const inverse = (b.weights.gasoline / 100) / (1 + b.rates.gasoline / 100)
    + (b.weights.housing / 100) / (1 + b.rates.housing / 100)
    + (b.restWeight / 100) / (1 + b.residualYoy / 100);
  near(1 / inverse - 1, b.headlineYoy / 100, 1e-5);
  assert.equal(b.stale, undefined);
});

test("stale lines and basket carry last known values from the fallback", () => {
  const fallback = { lines: { carIns: { yoy: -1.5 } }, basket: { residualYoy: 2.2, headlineYoy: 3.1 } };
  const p = assemblePayload({
    observationsBySeries: { ...calcObs, CUUR0000SETE: [], CUUR0000SETB01: [] },
    catalog: calcCatalog, fallback, generatedAt: "T",
  });
  assert.deepEqual(p.lines.carIns, { yoy: -1.5, stale: true });
  assert.deepEqual(p.basket, { residualYoy: 2.2, headlineYoy: 3.1, stale: true });
  assert.equal(p.lines.rent.stale, undefined);
});

test("lines and basket follow the yoyGap reference month", () => {
  const gapObs = {
    ...calcObs,
    CPIAUCNS: gapSeries(100, 0.3), CPIAUCSL: gapSeries(100, 0.3),
    CPILFENS: gapSeries(100, 0.2), CPILFESL: gapSeries(100, 0.2),
    CUUR0000SETB01: gapSeries(200, 1), CUUR0000SEHA: gapSeries(200, 0.6),
    CUUR0000SETE: gapSeries(300, -1),
    CUUR0000SEMC01: gapSeries(100, 0.4), CUUR0000SEMF01: gapSeries(100, -0.2),
  };
  const p = assemblePayload({ observationsBySeries: gapObs, catalog: calcCatalog, fallback: null, generatedAt: "T" });
  assert.equal(p.referenceMonth, "2026-09");
  assert.equal(p.basket.month, "2026-09");
  near(p.lines.carIns.yoy, (287 / 299 - 1) * 100);                // Sep 2026 vs Sep 2025
  assert.equal(p.basket.stale, undefined);
});

test("catalogs without calculator entries produce no lines or basket keys", () => {
  const p = assemblePayload({ observationsBySeries, catalog, fallback: null, generatedAt: "T" });
  assert.equal("lines" in p, false);
  assert.equal("basket" in p, false);
});

test("staleBlsLines: only BLS-sourced lines and combos, stale or absent", () => {
  const payload = { lines: { carIns: { yoy: 1, stale: true }, rent: { yoy: 2, stale: true } } };
  assert.deepEqual(staleBlsLines(payload, calcCatalog), ["carIns", "doctor"]);
  assert.deepEqual(staleBlsLines({ lines: { carIns: { yoy: 1 }, doctor: { yoy: 2 } } }, calcCatalog), []);
});

test("calculatorWarnings: stale lines, a stale basket, an implausible residual", () => {
  assert.deepEqual(calculatorWarnings({ lines: { a: { yoy: 1 } }, basket: { residualYoy: 3, headlineYoy: 3.4 } }), []);
  const w = calculatorWarnings({ lines: { carIns: { yoy: 1, stale: true } }, basket: { stale: true } });
  assert.equal(w.length, 2);
  assert.match(w[0], /carIns/);
  assert.match(w[1], /basket/);
  assert.match(calculatorWarnings({ lines: {}, basket: { residualYoy: 7.5, headlineYoy: 3.4 } })[0], /more than 3 points/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/assemble.test.mjs`
Expected: FAIL — `does not provide an export named 'staleBlsLines'`.

- [ ] **Step 3: Implement**

In `scripts/assemble.mjs`, replace the import block with:

```js
import {
  parseObservations, computeYoY, computeMoM, computeMoMAnnualized,
  buildTrend, avgPrice, latestValue, referenceMonthLabel, weeklyPrice, weekLabel,
  yoyAnchorDate, shiftMonths,
  valueAt, yoyAt, round6, rolledWeights, combineRates, residualRate,
} from "./compute.mjs";
```

In `assemblePayload`, replace the final `return { … };` with:

```js
  const lines = catalog.CALC_LINES || catalog.CALC_COMBOS
    ? calculatorLines(obs, catalog, refDate, fb.lines)
    : null;
  const basket = catalog.BASKET ? averageBasket(obs, catalog.BASKET, refDate, headObs, fb.basket) : null;

  return {
    generatedAt,
    referenceMonth,
    referenceMonthLabel: referenceMonthLabelStr,
    ...(yoyGap ? { yoyGap } : {}),
    headline: macro(catalog.HEADLINE, fb.headline),
    core: macro(catalog.CORE, fb.core),
    categories,
    avgPrices,
    altMeasures,
    weeklyPrices,
    trend,
    ...(lines ? { lines } : {}),
    ...(basket ? { basket } : {}),
  };
```

Add below `assemblePayload` (above `staleMacroKeys`):

```js
// ── Calculator lines and the average-household basket ─────────────────────
// Unlike categories (pinned to the reference month only when there is a yoyGap), these are
// ALWAYS computed at the reference month: the basket residual combines them with the headline,
// so every rate must describe the same month — BLS can post a month before FRED mirrors it.
// No value for that month (or its year-ago) means stale, carrying the last known value.
function calculatorLines(obs, catalog, refDate, fbLines) {
  const lines = {};
  const set = (id, yoy) => {
    lines[id] = yoy == null
      ? { yoy: fbLines?.[id]?.yoy ?? null, stale: true }
      : { yoy: round6(yoy) };
  };
  for (const l of catalog.CALC_LINES || []) set(l.id, refDate ? yoyAt(obs(l.seriesId), refDate) : null);

  const decDate = catalog.BASKET ? `${catalog.BASKET.riYear}-12-01` : null;
  for (const c of catalog.CALC_COMBOS || []) {
    let yoy = null;
    if (refDate && decDate) {
      // The parts form one aggregate, so the all-items factor cancels: roll by their own prices.
      const weights = rolledWeights(
        c.parts.map((p) => ({
          key: p.seriesId,
          riDec: p.riDec,
          levelDec: valueAt(obs(p.seriesId), decDate),
          levelT: valueAt(obs(p.seriesId), refDate),
        })),
        { allDec: 1, allT: 1 },
      );
      const rates = Object.fromEntries(c.parts.map((p) => [p.seriesId, yoyAt(obs(p.seriesId), refDate)]));
      yoy = weights ? combineRates(weights, rates) : null;
    }
    set(c.id, yoy);
  }
  return lines;
}

const mapValues = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));

function averageBasket(obs, basket, refDate, headObs, fbBasket) {
  if (refDate) {
    const decDate = `${basket.riYear}-12-01`;
    const weights = rolledWeights(
      basket.visible.map((v) => ({
        key: v.id,
        riDec: v.riDec,
        levelDec: valueAt(obs(v.seriesId), decDate),
        levelT: valueAt(obs(v.seriesId), refDate),
      })),
      { allDec: valueAt(headObs, decDate), allT: valueAt(headObs, refDate) },
    );
    const rates = Object.fromEntries(basket.visible.map((v) => [v.id, yoyAt(obs(v.seriesId), refDate)]));
    const headlineYoy = yoyAt(headObs, refDate);
    const residualYoy = weights && headlineYoy != null ? residualRate(headlineYoy, weights, rates) : null;
    if (residualYoy != null) {
      const visibleTotal = Object.values(weights).reduce((s, w) => s + w, 0);
      return {
        month: refDate.slice(0, 7),
        weights: mapValues(weights, round6),
        rates: mapValues(rates, round6),
        restWeight: round6(100 - visibleTotal),
        residualYoy: round6(residualYoy),
        headlineYoy: round6(headlineYoy),
      };
    }
  }
  return { ...(fbBasket || {}), stale: true };
}

// Ids of BLS-sourced calculator lines that are stale or missing. scripts/check-lines.mjs fails
// the run (after deploy) when this is non-empty, so an expired BLS key can't go unnoticed.
export function staleBlsLines(payload, catalog) {
  const ids = [
    ...(catalog.CALC_LINES || []).filter((l) => l.source === "bls").map((l) => l.id),
    ...(catalog.CALC_COMBOS || []).filter((c) => c.source === "bls").map((c) => c.id),
  ];
  return ids.filter((id) => !payload?.lines?.[id] || payload.lines[id].stale === true);
}

// Build-log warnings for calculator data; fetch-fred.mjs prints each as a ::warning:: annotation.
export function calculatorWarnings(payload, maxResidualGap = 3) {
  const out = [];
  const stale = Object.entries(payload?.lines || {}).filter(([, v]) => v.stale).map(([id]) => id);
  if (stale.length) out.push(`Calculator lines on a last known value: ${stale.join(", ")}`);
  const b = payload?.basket;
  if (!b || b.stale) {
    out.push("Average-household basket fell back to a last known value");
  } else if (Math.abs(b.residualYoy - b.headlineYoy) > maxResidualGap) {
    out.push(`Everything else rate ${b.residualYoy.toFixed(2)}% is more than ${maxResidualGap} points from the headline ${b.headlineYoy.toFixed(2)}%`);
  }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (59 + 9 = 68). If "basket: rolled weights…" fails only on the final `near(1 / inverse - 1, …)`, the cause is rounding to 6 decimals; the tolerance `1e-5` already allows for it — do not loosen further, look for a wrong date (`decDate` must be `2025-12-01`).

- [ ] **Step 5: Commit**

```bash
git add scripts/assemble.mjs scripts/assemble.test.mjs
git commit -m "feat(pipeline): assemble calculator lines and the average-household basket

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGWPxJCZkAmd2g5o6AKF3R"
```

---

### Task 5: Fetch BLS series, layer the deployed payload as fallback, annotate, gate, deploy

**Files:**
- Modify: `scripts/fetch-fred.mjs`
- Create: `scripts/check-lines.mjs`
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `blsSeries()`, `BASKET.riYear` (Task 1); `BLS_API_URL`, `blsRequestBody`, `parseBlsResponse` (Task 2); `calculatorWarnings`, `staleBlsLines` (Task 4).
- Produces: `public/cpi.json` with `lines` and `basket` in CI; a red run when any BLS line is stale.

- [ ] **Step 1: Update `scripts/fetch-fred.mjs`**

Replace the import of `assemble.mjs` with:

```js
import { assemblePayload, staleMacroKeys, calculatorWarnings } from "./assemble.mjs";
import { BLS_API_URL, blsRequestBody, parseBlsResponse } from "./bls.mjs";
```

Below `const OBSERVATION_START = …;` add:

```js
const DEPLOYED_CPI_URL = "https://derektm17.github.io/inflation-reality/cpi.json";

// GitHub Actions annotation: shows on the run summary, not only in the log.
const warn = (title, message) => console.log(`::warning title=${title}::${message}`);

// BLS-only series in one POST. Never throws: a failed request returns ok:false and every id
// missing, so those lines fall back and check-lines.mjs turns the run red after deploy.
async function fetchBls(ids, registrationKey) {
  const year = new Date().getUTCFullYear();
  // Reach back to the basket's December weights month as well as a full year of history.
  const startYear = Math.min(year - 2, catalog.BASKET.riYear);
  try {
    const res = await fetch(BLS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blsRequestBody(ids, { startYear, endYear: year, registrationKey })),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, bySeries: {}, missing: [...ids] };
    return parseBlsResponse(await res.json(), ids);
  } catch (err) {
    return { ok: false, error: err.message, bySeries: {}, missing: [...ids] };
  }
}

// What production serves right now: fresher last-known values than the bundled snapshot.
async function loadDeployedPayload() {
  try {
    const res = await fetch(DEPLOYED_CPI_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === "object" && json.headline ? json : null;
  } catch {
    return null;
  }
}
```

In `main()`, change the fallback line from `const fallback = JSON.parse(...)` to:

```js
  const bundledFallback = JSON.parse(readFileSync(resolve(ROOT, "src/data/fallback.json"), "utf8"));
```

After the `if (successes === 0) { … }` block, add:

```js
  // BLS-only calculator series (not mirrored on FRED). Non-fatal here by design.
  const blsIds = catalog.blsSeries();
  let blsLive = 0;
  const blsKey = process.env.BLS_API_KEY;
  if (!blsKey) {
    warn("BLS API", "BLS_API_KEY is not set, so BLS calculator lines will use last known values.");
  } else {
    const bls = await fetchBls(blsIds, blsKey);
    if (!bls.ok) warn("BLS API", `Request failed: ${bls.error}. BLS keys must be renewed every year.`);
    else if (bls.missing.length) warn("BLS API", `No data for ${bls.missing.join(", ")}.`);
    for (const id of blsIds) observationsBySeries[id] = bls.bySeries[id] || [];
    blsLive = blsIds.length - bls.missing.length;
  }

  // Last known values: production's current cpi.json layered over the bundled snapshot.
  const deployed = await loadDeployedPayload();
  const fallback = { ...bundledFallback, ...(deployed || {}) };
```

The existing `assemblePayload({ observationsBySeries, catalog, fallback, … })` call stays as is (it now receives the layered `fallback`).

Replace the final `console.log(\`Wrote public/cpi.json …\`)` line with:

```js
  console.log(`Wrote public/cpi.json — reference month ${payload.referenceMonth}, ${successes + blsLive}/${series.length + blsIds.length} series live (FRED + BLS).`);
  for (const message of calculatorWarnings(payload)) warn("Calculator data", message);
```

(Keep the existing `if (payload.yoyGap) { … }` note after it.)

- [ ] **Step 2: Create `scripts/check-lines.mjs`**

```js
// scripts/check-lines.mjs
// Post-deploy gate: exit 1 when any BLS-sourced calculator line in public/cpi.json is on a last
// known value. The site has already deployed with those values; a red run (and GitHub's email)
// is how an expired BLS_API_KEY or a dead series id gets noticed.
import { readFileSync } from "node:fs";
import { staleBlsLines } from "./assemble.mjs";
import * as catalog from "../src/data/catalog.js";

const payload = JSON.parse(readFileSync(new URL("../public/cpi.json", import.meta.url), "utf8"));
const stale = staleBlsLines(payload, catalog);
if (stale.length) {
  console.log(`::error title=BLS calculator lines stale::${stale.join(", ")} used a last known value. Check the BLS_API_KEY secret (renew yearly) and the series ids.`);
  process.exit(1);
}
console.log("Calculator BLS lines are live.");
```

- [ ] **Step 3: Check the gate locally with a throwaway payload**

Run:

```bash
mkdir -p public
node -e 'require("fs").writeFileSync("public/cpi.json", JSON.stringify({ lines: { carIns: { yoy: 1, stale: true } } }))'
node scripts/check-lines.mjs; echo "exit $?"
node -e 'const ids=["carIns","transit","heatOil","daycare","tuition","doctor"];require("fs").writeFileSync("public/cpi.json", JSON.stringify({ lines: Object.fromEntries(ids.map(i=>[i,{yoy:1}])) }))'
node scripts/check-lines.mjs; echo "exit $?"
rm public/cpi.json
node --check scripts/fetch-fred.mjs && echo "fetch-fred parses"
npm test
git status --short
```

Expected: first run prints `::error title=BLS calculator lines stale::carIns, transit, heatOil, daycare, tuition, doctor used…` and `exit 1`; second prints `Calculator BLS lines are live.` and `exit 0`; `fetch-fred parses`; all 68 tests pass; `git status` shows only the three files from this task (no `public/cpi.json`).

- [ ] **Step 4: Update `.github/workflows/deploy.yml`**

Replace the fetch step with:

```yaml
      - name: Fetch price data (FRED + BLS)
        run: node scripts/fetch-fred.mjs
        env:
          FRED_API_KEY: ${{ secrets.FRED_API_KEY }}
          BLS_API_KEY: ${{ secrets.BLS_API_KEY }}
```

Append after the `Deploy to gh-pages` step:

```yaml
      - name: Check calculator BLS lines are live
        # After deploy on purpose: the site ships with last known values, but the run turns red.
        run: node scripts/check-lines.mjs
```

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-fred.mjs scripts/check-lines.mjs .github/workflows/deploy.yml
git commit -m "feat(pipeline): fetch BLS-only series, fall back to production, gate stale BLS lines

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGWPxJCZkAmd2g5o6AKF3R"
```

- [ ] **Step 6: Push and verify production** (this deploys; the UI ignores the new keys)

```bash
git push origin main
sleep 10
RUN=$(gh run list -w deploy.yml -L1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN" --exit-status; echo "run exit $?"
gh run view "$RUN" --log | grep -E "::warning|::error|Wrote public/cpi.json|Calculator BLS lines|FATAL" | sed 's/^.*Z //'
curl -sS --http1.1 "https://derektm17.github.io/inflation-reality/cpi.json?t=$(date +%s)" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const p=JSON.parse(s);
  const ids=["rent","upkeep","groceries","dining","gasoline","carIns","carUpkeep","transit","electric","heatGas","heatOil","daycare","tuition","clothing","fun","doctor"];
  const missing=ids.filter(i=>!p.lines||typeof p.lines[i]?.yoy!=="number");
  const stale=ids.filter(i=>p.lines?.[i]?.stale);
  console.log("reference", p.referenceMonth, "| missing", missing, "| stale", stale);
  console.log("basket", p.basket?.month, "rest", p.basket?.restWeight, "residual", p.basket?.residualYoy, "headline", p.basket?.headlineYoy, "stale", p.basket?.stale ?? false);
  for (const i of ids) console.log(i.padEnd(10), p.lines?.[i]?.yoy);
})'
```

Expected: `run exit 0`; the log shows `… series live (FRED + BLS).` with N equal to M, no `::warning title=Calculator data`, no `::error`, and `Calculator BLS lines are live.`; the live payload has **no missing and no stale** ids, `basket.month` equals `referenceMonth` with `-` separators, `restWeight` between 25 and 35, and `residualYoy` within 3 points of `headlineYoy`. Record the printed rates in the Task 6 handoff.

If a series id is reported missing: stop, verify it on bls.gov / FRED, and fix `catalog.js` in a follow-up commit (with a test update) before Task 6.

---

### Task 6: Refresh the bundled fallback from production; record the work

**Files:**
- Modify: `src/data/fallback.json` (replaced with production `cpi.json`)
- Modify: `src/data/merge.test.mjs`
- Modify: `docs/CHANGELOG.md`, `docs/BACKLOG.md` (via `ledger`), `docs/SESSIONS.md`

**Interfaces:**
- Consumes: the live payload verified in Task 5.
- Produces: a bundled fallback containing `lines` for every calculator id and a fresh `basket`, enforced by a test.

- [ ] **Step 1: Write the failing test and loosen value-pinned assertions**

In `src/data/merge.test.mjs`, change the catalog import to:

```js
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, WEEKLY_PRICES, CALC_LINES, CALC_COMBOS } from "./catalog.js";
```

Replace the first test (`"buildViewData merges static metadata with dynamic values"`) with:

```js
test("buildViewData merges static metadata with dynamic values", () => {
  const view = buildViewData(catalog, dynamic);
  assert.equal(typeof view.headline.yoy, "number");
  assert.equal(view.headline.yoy, dynamic.headline.yoy);
  assert.equal(view.headline.seriesId, "CPIAUCNS");   // from catalog
  assert.equal(typeof view.headline.mom, "number");
  assert.equal(view.core.yoy, dynamic.core.yoy);

  assert.equal(view.categories.length, 10);
  const gas = view.categories.find(c => c.id === "gas");
  assert.equal(gas.yoy, dynamic.categories.gas.yoy);
  assert.equal(gas.color, "#E76F51");                 // from catalog
  assert.equal(gas.icon, "⛽");

  assert.equal(view.avgPrices.length, 21);
  const eggs = view.avgPrices.find(p => p.item === "Eggs, Grade A Large");
  assert.equal(eggs.current, dynamic.avgPrices.APU0000708111.current);
  assert.equal(eggs.unit, "/doz");                    // from catalog

  assert.equal(view.trend.length, 12);
  assert.match(view.referenceMonthLabel, /^[A-Z][a-z]+ \d{4}$/);
});
```

In `"buildViewData exposes altMeasures merged with catalog metadata"`, replace `assert.equal(pce.yoy, 3.4);` with:

```js
  assert.equal(pce.yoy, dynamic.altMeasures.corePce.yoy);
```

Append:

```js
test("fallback.json is a healthy production snapshot with every calculator line and the basket", () => {
  for (const id of [...CALC_LINES.map(l => l.id), ...CALC_COMBOS.map(c => c.id)]) {
    assert.equal(typeof dynamic.lines?.[id]?.yoy, "number", `${id} in fallback.lines`);
    assert.notEqual(dynamic.lines[id].stale, true, `${id} is not stale`);
  }
  assert.equal(typeof dynamic.basket?.residualYoy, "number");
  assert.notEqual(dynamic.basket.stale, true);
});
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `node --test src/data/merge.test.mjs`
Expected: only `fallback.json is a healthy production snapshot…` FAILS (`rent in fallback.lines`); the loosened tests still pass against the old March fallback.

- [ ] **Step 3: Replace the fallback with the verified production payload**

```bash
curl -sS --http1.1 "https://derektm17.github.io/inflation-reality/cpi.json?t=$(date +%s)" -o /tmp/cpi-prod.json
node -e 'const p=require("/tmp/cpi-prod.json"); let n=0; const walk=o=>{if(o&&typeof o==="object"){if(o.stale)n++;Object.values(o).forEach(walk)}}; walk(p); if(n||!p.lines||!p.basket){console.error("NOT HEALTHY: stale nodes",n);process.exit(1)} console.log("healthy", p.referenceMonth)'
node -e 'const fs=require("fs"); fs.writeFileSync("src/data/fallback.json", JSON.stringify(require("/tmp/cpi-prod.json"), null, 2) + "\n")'
```

Expected: `healthy 2026-08` (or the current reference month). If it prints `NOT HEALTHY`, stop and fix the cause in Task 5's follow-up; never commit a stale snapshot as the fallback.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS (68 + 1 = 69). `npm run build` also succeeds (`✓ built in …`).

- [ ] **Step 5: Commit and push**

```bash
git add src/data/fallback.json src/data/merge.test.mjs
git commit -m "chore(data): refresh bundled fallback from production with calculator lines and basket

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGWPxJCZkAmd2g5o6AKF3R"
git push origin main
```

- [ ] **Step 6: Record the work**

```bash
ledger ship inflation-reality 'Calculator price lines and average-household basket in the pipeline' --why 'The calculator-first redesign needs a 12-month rate for every spending line and an average household that matches the headline. cpi.json now carries lines (16 ids, 7 from the BLS API because FRED does not mirror them) and a basket whose Everything else rate is solved from the headline with December 2025 relative-importance weights rolled forward to the reference month (unrolled weights were 0.7 points off). Lines and basket are always pinned to the reference month; BLS "-" months parse as missing, not zero. The build falls back to production cpi.json before the bundled snapshot, annotates problems, and a post-deploy check turns the run red if any BLS line is stale. Invisible to the current UI; Phase 2 builds on it.'
ledger idea inflation-reality --tag ops 'Yearly (after BLS publishes December relative importance, around February, and the Consumer Expenditure release): update BASKET and CALC_COMBOS riDec values, riYear, and ceMonthlyMean in src/data/catalog.js, and re-run the basket tests. Stale weights make the Everything else rate drift.'
```

Append a `#### Handoff — Phase 1 pipeline shipped` block to `docs/SESSIONS.md` under today's date with: commits, the Task 5 production numbers (every line's rate, basket rest weight, residual vs headline), anything that deviated from this plan, and **Next: write the Phase 2a plan (shell + Your costs) from the spec.** Then:

```bash
git add docs/SESSIONS.md
git commit -m "docs(sessions): handoff after calculator Phase 1

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGWPxJCZkAmd2g5o6AKF3R"
git push origin main
```
