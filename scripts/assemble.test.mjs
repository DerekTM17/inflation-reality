import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePayload, staleMacroKeys } from "./assemble.mjs";
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
