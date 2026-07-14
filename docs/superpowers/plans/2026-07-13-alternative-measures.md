# Alternative Measures Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "How Others Measure It" panel comparing Headline/Core CPI against four alternative official inflation gauges (Core PCE, Median CPI, Trimmed-Mean CPI, Sticky-Price CPI), all via the existing build-time FRED pipeline.

**Architecture:** Extends the existing catalog → fetch → assemble → merge → App flow. A new `ALT_MEASURES` list drives fetching; `assemble` writes a keyed `altMeasures` object into `cpi.json` (YoY per measure, with `stale` fallback); `merge` exposes `view.altMeasures`; App renders a horizontal bar comparison. No new deps, no new API keys.

**Tech Stack:** Node 20+ (built-in `fetch` + `node --test`), Vite, React 18, Recharts, `xlsx`.

## Global Constraints

- Node 20+; **NO new npm dependencies**; tests use built-in `node --test`.
- All four measures shown as **12-month (YoY) %**. Two source kinds: `kind:"index"` (compute YoY from the index) and `kind:"yoyRate"` (the observation value already IS the YoY — use the latest non-null value directly).
- Verified FRED series (exact, checked 2026-07-13): Core PCE `PCEPILFE` (index); Median CPI `MEDCPIM159SFRBCLE` (yoyRate); 16% Trimmed-Mean CPI `TRMMEANCPIM159SFRBCLE` (yoyRate); Sticky-Price Core CPI `CORESTICKM159SFRBATL` (yoyRate). Use these exact ids — the `…M158…` variants are 1-month annualized (wrong horizon).
- Percentages round to 1 decimal. Preserve provenance: every measure keeps a `seriesId`.
- Per-series resilience: missing/empty → fallback value + `stale:true`; never blank the panel.
- Plain-language copy (matches existing glossary voice).

---

## File structure
- Modify `src/data/catalog.js` — add `ALT_MEASURES`; extend `allSeries()`.
- Modify `scripts/compute.mjs` — add `latestValue(observations)`.
- Modify `scripts/assemble.mjs` — build `payload.altMeasures`.
- Modify `src/data/merge.js` — expose `view.altMeasures`.
- Modify `src/data/fallback.json` — add `altMeasures` snapshot.
- Modify `src/App.jsx` — new comparison card; export + glossary + series-list integration.
- Modify tests: `src/data/catalog.test.mjs`, `scripts/compute.test.mjs`, `scripts/assemble.test.mjs`, `src/data/merge.test.mjs`.
- Modify `README.md`, `docs/CHANGELOG.md`, `docs/BACKLOG.md`.

### Dynamic payload addition (`cpi.json` / `fallback.json`)
```json
"altMeasures": {
  "corePce":    { "yoy": 3.4 },
  "medianCpi":  { "yoy": 2.9 },
  "trimmedCpi": { "yoy": 2.9 },
  "stickyCpi":  { "yoy": 3.1 }
}
```
Keyed by measure `key`. Failed/empty series → `{ "yoy": <fallback>, "stale": true }`.

---

### Task 1: Catalog — ALT_MEASURES + allSeries

**Files:**
- Modify: `src/data/catalog.js`
- Test: `src/data/catalog.test.mjs`

**Interfaces:**
- Produces: `ALT_MEASURES` — array of `{ key, label, seriesId, kind, color, blurb }` (4 entries). `allSeries()` additionally emits each measure's `seriesId`.

- [ ] **Step 1: Add the failing test** to `src/data/catalog.test.mjs`

```js
import { ALT_MEASURES } from "./catalog.js"; // add to existing import line

test("alt measures: 4 entries with verified series ids and known kinds", () => {
  assert.equal(ALT_MEASURES.length, 4);
  const byKey = Object.fromEntries(ALT_MEASURES.map(m => [m.key, m]));
  assert.equal(byKey.corePce.seriesId, "PCEPILFE");
  assert.equal(byKey.corePce.kind, "index");
  assert.equal(byKey.medianCpi.seriesId, "MEDCPIM159SFRBCLE");
  assert.equal(byKey.trimmedCpi.seriesId, "TRMMEANCPIM159SFRBCLE");
  assert.equal(byKey.stickyCpi.seriesId, "CORESTICKM159SFRBATL");
  for (const m of ALT_MEASURES) assert.ok(m.label && m.color && m.blurb);
  const ids = allSeries().map(s => s.id);
  assert.ok(ids.includes("PCEPILFE") && ids.includes("MEDCPIM159SFRBCLE"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/data/catalog.test.mjs`
Expected: FAIL — `ALT_MEASURES` is not exported.

- [ ] **Step 3: Add ALT_MEASURES and extend allSeries** in `src/data/catalog.js` (add after `AVG_PRICE_ITEMS`, before `allSeries`)

```js
// Alternative official inflation gauges, shown as 12-month (YoY) % alongside CPI.
// kind "index"  → fetch the index and compute YoY (like CPI).
// kind "yoyRate"→ the series value already IS the 12-month %; use the latest value.
export const ALT_MEASURES = [
  { key: "corePce",    label: "Core PCE",         seriesId: "PCEPILFE",              kind: "index",   color: "#2D6A4F",
    blurb: "The Fed's preferred gauge (from the BEA). Weighted differently than CPI and usually runs a bit lower — it's what the Fed targets at 2%." },
  { key: "medianCpi",  label: "Median CPI",       seriesId: "MEDCPIM159SFRBCLE",     kind: "yoyRate", color: "#6D597A",
    blurb: "Takes the middle category's price change, ignoring the biggest movers on both ends — a cleaner read on the broad trend. (Cleveland Fed.)" },
  { key: "trimmedCpi", label: "Trimmed-Mean CPI", seriesId: "TRMMEANCPIM159SFRBCLE", kind: "yoyRate", color: "#52796F",
    blurb: "Throws out the most extreme price moves on each side, then averages the rest — like Median CPI, it strips out the noise. (Cleveland Fed.)" },
  { key: "stickyCpi",  label: "Sticky-Price CPI", seriesId: "CORESTICKM159SFRBATL",  kind: "yoyRate", color: "#E76F51",
    blurb: "Counts only prices that change slowly (rent, insurance), which tend to reflect longer-run expectations — a steadier signal. (Atlanta Fed.)" },
];
```

Then inside `allSeries()`, before `return`:

```js
  for (const m of ALT_MEASURES) add(m.seriesId, m.kind === "index" ? "level" : "rate");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/data/catalog.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/catalog.js src/data/catalog.test.mjs
git commit -m "feat: add ALT_MEASURES catalog (Core PCE, Median/Trimmed/Sticky CPI)"
```

---

### Task 2: compute — latestValue

**Files:**
- Modify: `scripts/compute.mjs`
- Test: `scripts/compute.test.mjs`

**Interfaces:**
- Produces: `latestValue(observations)` → the latest non-null numeric `value`, or `null` if none. (`observations` are already parsed: `[{date, value:number|null}]`.)

- [ ] **Step 1: Add the failing test** to `scripts/compute.test.mjs`

```js
import { latestValue } from "./compute.mjs"; // add to existing import

test("latestValue returns the latest non-null value, null when none", () => {
  assert.equal(latestValue(parseObservations([
    { date: "2026-03-01", value: "2.5" },
    { date: "2026-04-01", value: "2.9" },
    { date: "2026-05-01", value: "." },
  ])), 2.9);
  assert.equal(latestValue(parseObservations([{ date: "2026-01-01", value: "." }])), null);
  assert.equal(latestValue([]), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/compute.test.mjs`
Expected: FAIL — `latestValue` not exported.

- [ ] **Step 3: Implement** in `scripts/compute.mjs` (add near `avgPrice`)

```js
export function latestValue(observations) {
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value != null) return observations[i].value;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/compute.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/compute.mjs scripts/compute.test.mjs
git commit -m "feat: add latestValue() for yoyRate-kind series"
```

---

### Task 3: assemble — altMeasures

**Files:**
- Modify: `scripts/assemble.mjs`
- Test: `scripts/assemble.test.mjs`

**Interfaces:**
- Consumes: `compute.mjs` `computeYoY` (already imported), `latestValue` (new import), `catalog.ALT_MEASURES`.
- Produces: `payload.altMeasures` — object keyed by measure `key`, each `{ yoy }` or `{ yoy, stale:true }`.

- [ ] **Step 1: Add the failing test** to `scripts/assemble.test.mjs`

Extend the existing test `catalog` object and add a test. Add `ALT_MEASURES` to the local catalog stub and observations:

```js
// in the local `catalog` object used by the test, add:
//   ALT_MEASURES: [
//     { key: "corePce", seriesId: "PCEPILFE", kind: "index" },
//     { key: "medianCpi", seriesId: "MEDCPIM159SFRBCLE", kind: "yoyRate" },
//   ],
// and in observationsBySeries add PCEPILFE: series(100, 0.3) and
//   MEDCPIM159SFRBCLE: 14 monthly points ending 2026-05 with the last value "2.9".

test("altMeasures: index computes YoY, yoyRate passes the value through", () => {
  const p = assemblePayload({ observationsBySeries, catalog, fallback: null, generatedAt: "2026-07-13T00:00:00.000Z" });
  assert.equal(typeof p.altMeasures.corePce.yoy, "number");         // computed from index
  assert.equal(p.altMeasures.medianCpi.yoy, 2.9);                   // passthrough latest value
});

test("altMeasures: missing series falls back with stale", () => {
  const fallback = { altMeasures: { medianCpi: { yoy: 3.1 } } };
  const p = assemblePayload({
    observationsBySeries: { ...observationsBySeries, MEDCPIM159SFRBCLE: [] },
    catalog, fallback, generatedAt: "2026-07-13T00:00:00.000Z",
  });
  assert.equal(p.altMeasures.medianCpi.yoy, 3.1);
  assert.equal(p.altMeasures.medianCpi.stale, true);
});
```

(Use a `MEDCPIM159SFRBCLE` fixture whose latest non-null value is exactly `"2.9"`, e.g.
`Array.from({length:14},(_,i)=>({date:\`2025-\${...}\`,value:"2.9"}))` — or reuse the
date-construction helper already in the file and set every value to `"2.9"`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/assemble.test.mjs`
Expected: FAIL — `p.altMeasures` is undefined.

- [ ] **Step 3: Implement** in `scripts/assemble.mjs`

Add `latestValue` to the compute import:
```js
import {
  parseObservations, computeYoY, computeMoM, computeMoMAnnualized,
  buildTrend, avgPrice, latestValue, referenceMonthLabel,
} from "./compute.mjs";
```

Before the `return`, build altMeasures:
```js
  const altMeasures = {};
  for (const m of catalog.ALT_MEASURES || []) {
    const series = obs(m.seriesId);
    const raw = m.kind === "index" ? computeYoY(series) : latestValue(series);
    if (raw == null) altMeasures[m.key] = { yoy: fb.altMeasures?.[m.key]?.yoy ?? null, stale: true };
    else altMeasures[m.key] = { yoy: parseFloat(raw.toFixed(1)) };
  }
```

Add `altMeasures,` to the returned object (after `trend,`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/assemble.test.mjs`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add scripts/assemble.mjs scripts/assemble.test.mjs
git commit -m "feat: assemble altMeasures into cpi.json payload (index YoY + yoyRate passthrough)"
```

---

### Task 4: merge + fallback snapshot — view.altMeasures

**Files:**
- Modify: `src/data/merge.js`
- Modify: `src/data/fallback.json`
- Test: `src/data/merge.test.mjs`

**Interfaces:**
- Produces: `view.altMeasures` — array of `{ key, label, seriesId, kind, color, blurb, yoy, stale }` (4 entries), merging `catalog.ALT_MEASURES` with `dynamic.altMeasures`.

- [ ] **Step 1: Add the `altMeasures` snapshot** to `src/data/fallback.json` (add a top-level key alongside `categories`/`avgPrices`)

```json
  "altMeasures": {
    "corePce": { "yoy": 3.4 },
    "medianCpi": { "yoy": 2.9 },
    "trimmedCpi": { "yoy": 2.9 },
    "stickyCpi": { "yoy": 3.1 }
  },
```

- [ ] **Step 2: Add the failing test** to `src/data/merge.test.mjs`

```js
import { ALT_MEASURES } from "./catalog.js"; // add to existing catalog import
// add ALT_MEASURES to the `catalog` object passed to buildViewData

test("buildViewData exposes altMeasures merged with catalog metadata", () => {
  const view = buildViewData(catalog, dynamic);
  assert.equal(view.altMeasures.length, 4);
  const pce = view.altMeasures.find(m => m.key === "corePce");
  assert.equal(pce.yoy, 3.4);              // from fallback.json dynamic
  assert.equal(pce.seriesId, "PCEPILFE");  // from catalog
  assert.ok(pce.blurb && pce.color);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test src/data/merge.test.mjs`
Expected: FAIL — `view.altMeasures` undefined.

- [ ] **Step 4: Implement** in `src/data/merge.js`

Add `ALT_MEASURES` to the destructure:
```js
  const { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES } = catalog;
```

Before the `return`:
```js
  const altMeasures = (ALT_MEASURES || []).map(m => ({
    ...m,
    yoy: dynamic.altMeasures?.[m.key]?.yoy ?? null,
    stale: dynamic.altMeasures?.[m.key]?.stale ?? false,
  }));
```

Add `altMeasures,` to the returned object.

- [ ] **Step 5: Run tests + full suite**

Run: `node --test src/data/merge.test.mjs` then `npm test`
Expected: PASS all suites.

- [ ] **Step 6: Commit**

```bash
git add src/data/merge.js src/data/fallback.json src/data/merge.test.mjs
git commit -m "feat: expose view.altMeasures and add fallback snapshot"
```

---

### Task 5: App — "How Others Measure It" comparison card

**Files:**
- Modify: `src/App.jsx` (dashboard view; insert after the Row-2 charts grid, before the "Your Spending Mix" card)

**Interfaces:**
- Consumes: `data.altMeasures` (Task 4), `data.headline.{yoy,seriesId}`, `data.core.{yoy,seriesId}`, existing `InfoTip`, `DataSourceBadge`, Recharts `BarChart`.

There are no App unit tests; verified by build + browser render in Step 4.

- [ ] **Step 1: Build the comparison data** — inside `InflationTracker`, near the other derived values (e.g. after `gapMonths`), add:

```jsx
  const measureComparison = [
    { name: "Headline CPI", yoy: data.headline.yoy, color: "#1B4965", seriesId: data.headline.seriesId,
      blurb: "All items — the number the news usually quotes." },
    { name: "Core CPI", yoy: data.core.yoy, color: "#457B9D", seriesId: data.core.seriesId,
      blurb: "All items except food and energy, which swing the most month to month." },
    ...data.altMeasures.map(m => ({ name: m.label, yoy: m.yoy, color: m.color, seriesId: m.seriesId, blurb: m.blurb })),
  ].filter(m => m.yoy != null).sort((a, b) => b.yoy - a.yoy);
```

- [ ] **Step 2: Add the card** — insert this block immediately after the closing `</div>` of the Row-2 charts grid (the `ir-grid-2` charts row) and before the `{/* ── Row 3: Spending Controls`  comment:

```jsx
            {/* ── Row 2.5: Alternative measures comparison ── */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                How Others Measure It
              </div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>
                The headline isn't the only inflation gauge — here's what the major alternative measures say for the most recent period (12-month change).
              </div>
              <ResponsiveContainer width="100%" height={Math.max(200, measureComparison.length * 34 + 10)}>
                <BarChart data={measureComparison} layout="vertical" margin={{ left: 0, right: 44, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                  <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={116} tick={{ fontSize: 10, fontFamily: "'Source Serif 4', Georgia, serif" }} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 12px", fontSize: 12, maxWidth: 240, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                        <strong>{d.name}: {d.yoy}%</strong><br />
                        <span style={{ color: "#555" }}>{d.blurb}</span>
                      </div>
                    );
                  }} />
                  <Bar dataKey="yoy" radius={[0, 4, 4, 0]} barSize={18}>
                    {measureComparison.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    <LabelList dataKey="yoy" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fill: "#555" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
                {measureComparison.map((m, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#555" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                    {m.name}
                    <InfoTip text={m.blurb} label={`About ${m.name}`} />
                    <DataSourceBadge seriesId={m.seriesId} />
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#999", marginTop: 8, fontStyle: "italic" }}>
                All figures are ~12-month (year-over-year) changes. Measures may reflect slightly different latest months (e.g. PCE publishes after CPI).
              </div>
            </div>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds, no unresolved-symbol errors (`BarChart`, `Cell`, `LabelList`, `InfoTip`, `DataSourceBadge` are already imported/defined).

- [ ] **Step 4: Render check**

Run: `npm run preview` (fresh port), load the page. Confirm the "How Others Measure It" card shows 6 sorted bars (Headline, Core, Core PCE, Median CPI, Trimmed-Mean CPI, Sticky-Price CPI on fallback data), each legend row has an ⓘ tooltip and a series badge, and the page still fits mobile (no horizontal scroll at 375px). Fallback values: Core PCE 3.4, Median 2.9, Trimmed 2.9, Sticky 3.1, plus Headline/Core from fallback.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add How Others Measure It alternative-measures comparison card"
```

---

### Task 6: App — export, glossary, series-list integration

**Files:**
- Modify: `src/App.jsx` (Excel export Sheet 2; glossary array; "All Series IDs Used" list)

**Interfaces:**
- Consumes: `data.altMeasures`.

- [ ] **Step 1: Add alt measures to the Excel export (Sheet 2)** — in `downloadWorkbook`, after the `core` row is pushed to `cpiRows` and before `data.categories.forEach`, insert:

```jsx
    data.altMeasures.forEach(m => {
      cpiRows.push([m.label, m.seriesId, "", m.yoy, "", "Monthly", `https://fred.stlouisfed.org/series/${m.seriesId}`, "Alternative inflation measure (12-month % change)"]);
    });
```

- [ ] **Step 2: Add glossary entries** — in the dashboard glossary array, add four entries (place after the "Core CPI" entry):

```jsx
                  { term: "PCE / Core PCE", def: "Personal Consumption Expenditures price index (from the BEA). A second official inflation gauge the Federal Reserve prefers and targets at 2% — weighted differently than CPI and usually a bit lower." },
                  { term: "Median CPI", def: "A core measure from the Cleveland Fed that uses the middle category's price change and ignores the biggest movers on both ends — a cleaner read on the broad trend." },
                  { term: "Trimmed-Mean CPI", def: "A Cleveland Fed core measure that discards the most extreme price moves on each side and averages the rest, stripping out volatile outliers." },
                  { term: "Sticky-Price CPI", def: "An Atlanta Fed measure built only from prices that change slowly (like rent and insurance), which tend to reflect longer-run inflation expectations." },
```

- [ ] **Step 3: Add alt measures to "All Series IDs Used"** — change the badge source array (currently `[data.headline, data.core, ...data.categories]`) to append the alt measures:

```jsx
                {[data.headline, data.core, ...data.altMeasures, ...data.categories].map((s, i) => (
```

(`data.altMeasures` entries expose `.seriesId` and `.label`, matching the map body.)

- [ ] **Step 4: Build + verify export**

Run: `npm run build`, then `npm run preview`; in the app, open **Sources & Method**, click **Download .xlsx**, confirm it downloads without error and the "CPI Sub-Indexes" sheet lists the 4 alt measures, and the "All Series IDs Used" list shows the 4 new series IDs.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: include alt measures in Excel export, glossary, and series list"
```

---

### Task 7: Docs

**Files:**
- Modify: `README.md`, `docs/CHANGELOG.md`, `docs/BACKLOG.md`

- [ ] **Step 1: README** — extend the Data section to note the dashboard also shows alternative official measures (Core PCE, Median/Trimmed-Mean/Sticky-Price CPI), all via FRED.

- [ ] **Step 2: CHANGELOG** — prepend a dated entry summarizing the panel: the four measures + exact series IDs, the index-vs-yoyRate handling, and that it reuses the FRED pipeline.

- [ ] **Step 3: BACKLOG** — add the deferred sources as future items: real-time rent (Zillow ZORI — fragile bulk CSV + licensing check), EIA energy API, Case-Shiller home prices (`CSUSHPINSA`), and a self-built scraped price panel (note: retail scraping is ToS-prohibited/brittle; credible path is public datasets + basket/weighting methodology). Also note Dallas Trimmed-Mean PCE (`PCETRIM12M159SFRBDAL`) as an easy additional FRED measure.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/CHANGELOG.md docs/BACKLOG.md
git commit -m "docs: document alternative-measures panel + backlog deferred sources"
```

---

## Self-Review

**Spec coverage:**
- 4 alt measures via FRED, exact series IDs, index-vs-yoyRate handling → Tasks 1–3. ✓
- YoY-only, 1-decimal, provenance (seriesId) → Tasks 3 (round), 5/6 (badges). ✓
- Per-series stale fallback → Task 3 + fallback snapshot Task 4. ✓
- Comparison bar UI + InfoTips + footnote + reference-month caveat → Task 5. ✓
- Excel + glossary + series list → Task 6. ✓
- Docs + BACKLOG (rent/energy/case-shiller/scraped panel) → Task 7. ✓

**Placeholder scan:** none — every code step shows complete code.

**Type consistency:** `ALT_MEASURES` entry shape `{key,label,seriesId,kind,color,blurb}` consistent across catalog/assemble/merge/App; `altMeasures` payload keyed by `key` with `{yoy,stale?}` consistent across assemble/fallback/merge; `view.altMeasures` array shape consumed identically in Task 5/6. `latestValue` signature consistent Task 2→3.
