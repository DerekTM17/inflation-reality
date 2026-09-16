import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePayload, staleMacroKeys, staleBlsLines, calculatorWarnings } from "./assemble.mjs";
import { shiftMonths } from "./compute.mjs";

const catalog = {
  HEADLINE: { key: "headline", seriesId: "CPIAUCNS", momSeriesId: "CPIAUCSL" },
  CORE: { key: "core", seriesId: "CPILFENS", momSeriesId: "CPILFESL" },
  CATEGORIES: [{ id: "gas", seriesId: "CUUR0000SETB01" }],
  AVG_PRICE_ITEMS: [{ item: "Eggs", seriesId: "APU0000708111" }],
  WEEKLY_PRICES: [{ key: "diesel", seriesId: "GASDESW", blsSeriesId: "APU0000708111" }],
  ALT_MEASURES: [
    { key: "corePce", seriesId: "PCEPILFE", kind: "index" },
    { key: "medianCpi", seriesId: "MEDCPIM159SFRBCLE", kind: "yoyRate" },
  ],
};

const series = (start, step) =>
  Array.from({ length: 14 }, (_, i) => ({
    date: `2025-${String(i + 2).padStart(2, "0")}-01`.replace("2025-13", "2026-01").replace("2025-14", "2026-02").replace("2025-15", "2026-03"),
    value: String(start + i * step),
  }));

const weekly = Array.from({ length: 54 }, (_, i) => ({
  date: new Date(Date.parse("2025-08-25") + i * 7 * 86400000).toISOString().slice(0, 10),
  value: String(3 + i * 0.05),
}));

const observationsBySeries = {
  GASDESW: weekly,
  CPIAUCNS: series(100, 0.3),
  CPIAUCSL: series(100, 0.3),
  CPILFENS: series(100, 0.2),
  CPILFESL: series(100, 0.2),
  CUUR0000SETB01: series(200, 1),
  APU0000708111: series(5, 0.05),
  PCEPILFE: series(100, 0.3),
  MEDCPIM159SFRBCLE: Array.from({ length: 14 }, (_, i) => ({
    date: `2025-${String(i + 4).padStart(2, "0")}-01`
      .replace("2025-17", "2026-05"),
    value: "2.9",
  })),
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

test("partial macro failure (one sub-series empty) is flagged stale", () => {
  // Headline NSA (yoy source) present, headline SA (mom source) empty → partial fallback.
  const fallback = { headline: { mom: 7.7 } };
  const p = assemblePayload({
    observationsBySeries: { ...observationsBySeries, CPIAUCSL: [] },
    catalog, fallback, generatedAt: "2026-07-13T14:00:00.000Z",
  });
  assert.equal(p.headline.stale, true);
  assert.equal(typeof p.headline.yoy, "number");
  assert.equal(p.headline.mom, 7.7);
});

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

test("weeklyPrices: current, year-ago and as-of date come through", () => {
  const p = assemblePayload({ observationsBySeries, catalog, fallback: {}, generatedAt: "T" });
  const d = p.weeklyPrices.diesel;
  assert.equal(d.asOf, weekly[weekly.length - 1].date);
  assert.equal(d.current, Number(weekly[weekly.length - 1].value));
  assert.equal(d.yearAgo, Number(weekly[weekly.length - 1 - 52].value));
  assert.equal(d.asOfLabel, "Aug 31, 2026");
  assert.equal(d.stale, undefined);
});

test("weeklyPrices: missing series falls back with stale", () => {
  const fallback = { weeklyPrices: { diesel: { current: 4.44, yearAgo: 4.00, asOf: "2026-01-05" } } };
  const p = assemblePayload({ observationsBySeries: {}, catalog, fallback, generatedAt: "T" });
  assert.equal(p.weeklyPrices.diesel.current, 4.44);
  assert.equal(p.weeklyPrices.diesel.stale, true);
});

test("staleMacroKeys: healthy payload reports no stale macro keys", () => {
  const p = assemblePayload({ observationsBySeries, catalog, fallback: null, generatedAt: "T" });
  assert.deepEqual(staleMacroKeys(p), []);
});

test("staleMacroKeys: flags a stale headline (one sub-series fell back)", () => {
  const fallback = { headline: { mom: 7.7 } };
  const p = assemblePayload({
    observationsBySeries: { ...observationsBySeries, CPIAUCSL: [] },
    catalog, fallback, generatedAt: "T",
  });
  assert.deepEqual(staleMacroKeys(p), ["headline"]);
});

test("staleMacroKeys: flags a stale core, and both when both fell back", () => {
  const fallback = { core: { yoy: 2.6, mom: 0.2 } };
  const p = assemblePayload({
    observationsBySeries: { ...observationsBySeries, CPILFENS: [] },
    catalog, fallback, generatedAt: "T",
  });
  assert.deepEqual(staleMacroKeys(p), ["core"]);
});

test("staleMacroKeys: treats a missing node as stale", () => {
  assert.deepEqual(staleMacroKeys({}), ["headline", "core"]);
  assert.deepEqual(staleMacroKeys({ headline: { yoy: 1 } }), ["core"]);
});

// Every BLS CPI series is missing October 2025 (never published). Once October 2026
// is the latest month, no CPI series can produce an October year-over-year change.
const gapSeries = (start, step) =>
  Array.from({ length: 15 }, (_, i) => {
    const date = shiftMonths("2025-08-01", i);
    return { date, value: date === "2025-10-01" ? "." : String(start + i * step) };
  });

test("yoyGap: a latest month with no year-ago figure anchors CPI numbers to the last computable month", () => {
  const gapObs = {
    ...observationsBySeries,
    CPIAUCNS: gapSeries(100, 0.3), CPIAUCSL: gapSeries(100, 0.3),
    CPILFENS: gapSeries(100, 0.2), CPILFESL: gapSeries(100, 0.2),
    CUUR0000SETB01: gapSeries(200, 1), APU0000708111: gapSeries(5, 1),
  };
  const p = assemblePayload({ observationsBySeries: gapObs, catalog, fallback: null, generatedAt: "T" });
  assert.equal(p.referenceMonth, "2026-09");
  assert.equal(p.referenceMonthLabel, "September 2026");
  assert.deepEqual(p.yoyGap, {
    latestMonth: "2026-10", latestMonthLabel: "October 2026", missingMonthLabel: "October 2025",
  });
  assert.deepEqual(staleMacroKeys(p), []);
  assert.equal(p.categories.gas.yoy, 6);                       // Sep 2026 213 vs Sep 2025 201
  assert.equal(p.categories.gas.stale, undefined);
  assert.deepEqual(p.avgPrices.APU0000708111, { current: 18, yearAgo: 6 });
  assert.equal(p.trend.at(-1).month, "Sep 26");
});

test("yoyGap: absent when the latest month has a year-ago figure", () => {
  const p = assemblePayload({ observationsBySeries, catalog, fallback: null, generatedAt: "T" });
  assert.equal(p.yoyGap, undefined);
});

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
  // literal, not a self-comparison: -12/299*100 has far more than 6 decimals unrounded
  // (-4.013377926421402), so this actually exercises round6 rather than passing for any input.
  assert.equal(p.lines.carIns.yoy, -4.013378);
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

test("calculatorWarnings: given catalog + observations, names the series that broke the basket", () => {
  const brokenObs = { ...calcObs, CUUR0000SETB01: [] };  // gasoline unreadable; housing fine
  const p = assemblePayload({ observationsBySeries: brokenObs, catalog: calcCatalog, fallback: null, generatedAt: "T" });
  assert.equal(p.basket.stale, true);
  const w = calculatorWarnings(p, calcCatalog, brokenObs);
  const basketWarning = w.find((m) => /basket/.test(m));
  assert.match(basketWarning, /CUUR0000SETB01/);
  assert.doesNotMatch(basketWarning, /CUUR0000SEHA/);
});

test("calculatorWarnings: a null riDec (not just a missing level) also names its series", () => {
  // null >= 0 is true in JS, so the failure check needs its own null guard on riDec.
  const nullRiCatalog = {
    ...calcCatalog,
    BASKET: { ...calcCatalog.BASKET, visible: [
      { id: "gasoline", label: "Gas for the car", seriesId: "CUUR0000SETB01", riDec: null },
      { id: "housing", label: "Housing", seriesId: "CUUR0000SEHA", riDec: 40 },
    ] },
  };
  const p = assemblePayload({ observationsBySeries: calcObs, catalog: nullRiCatalog, fallback: null, generatedAt: "T" });
  assert.equal(p.basket.stale, true);
  const w = calculatorWarnings(p, nullRiCatalog, calcObs);
  const basketWarning = w.find((m) => /basket/.test(m));
  assert.match(basketWarning, /CUUR0000SETB01/);
  assert.doesNotMatch(basketWarning, /CUUR0000SEHA/);
});
