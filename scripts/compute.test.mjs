// scripts/compute.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseObservations, shiftMonths, computeYoY, computeMoM,
  computeMoMAnnualized, buildTrend, avgPrice, monthLabel, referenceMonthLabel,
  latestValue, weeklyPrice, weekLabel, yoyAnchorDate,
  valueAt, yoyAt, round6, rolledWeights, combineRates, residualRate,
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

test("latestValue returns the latest non-null value, null when none", () => {
  assert.equal(latestValue(parseObservations([
    { date: "2026-03-01", value: "2.5" },
    { date: "2026-04-01", value: "2.9" },
    { date: "2026-05-01", value: "." },
  ])), 2.9);
  assert.equal(latestValue(parseObservations([{ date: "2026-01-01", value: "." }])), null);
  assert.equal(latestValue([]), null);
});

// ── Weekly (EIA) fuel prices ──────────────────────────────────────────────
// Mondays, 2025-08-25 through 2026-08-31, so the year-ago match is 364 days back
// (52 weeks) rather than an exact calendar-date hit.
const weeklyRaw = (() => {
  const out = [];
  let t = Date.parse("2025-08-25");
  for (let i = 0; i < 54; i++) {
    out.push({ date: new Date(t).toISOString().slice(0, 10), value: String(3 + i * 0.05) });
    t += 7 * 86400000;
  }
  return out;
})();

test("weeklyPrice finds the year-ago value on a weekly grid", () => {
  const obs = parseObservations(weeklyRaw);
  const { current, yearAgo, asOf } = weeklyPrice(obs);
  const last = obs[obs.length - 1];
  assert.equal(current, last.value);
  assert.equal(asOf, last.date);
  // 52 weeks back is 364 days — the nearest observation to the 365-day target.
  const wanted = obs[obs.length - 1 - 52];
  assert.equal(yearAgo, wanted.value);
});

test("weeklyPrice returns null yearAgo when history is too short", () => {
  const obs = parseObservations(weeklyRaw.slice(-10));
  const { current, yearAgo } = weeklyPrice(obs);
  assert.ok(current != null);
  assert.equal(yearAgo, null);      // nearest match is ~9 weeks off, outside tolerance
});

test("weeklyPrice handles an empty or all-null series", () => {
  assert.deepEqual(weeklyPrice([]), { current: null, yearAgo: null, asOf: null });
  const allNull = parseObservations([{ date: "2026-01-05", value: "." }]);
  assert.deepEqual(weeklyPrice(allNull), { current: null, yearAgo: null, asOf: null });
});

test("weeklyPrice ignores trailing nulls when picking the current reading", () => {
  const obs = parseObservations([...weeklyRaw, { date: "2026-09-07", value: "." }]);
  const { asOf } = weeklyPrice(obs);
  assert.equal(asOf, weeklyRaw[weeklyRaw.length - 1].date);
});

test("weekLabel renders a day-level date", () => {
  assert.equal(weekLabel("2026-08-31"), "Aug 31, 2026");
});

// ── Year-over-year anchor month ───────────────────────────────────────────
// Aug 2025 – Oct 2026 with October 2025 never published: October 2026 has no
// year-ago month, which is exactly what the November 2026 builds will see.
const shutdownGap = Array.from({ length: 15 }, (_, i) => {
  const date = shiftMonths("2025-08-01", i);
  return { date, value: date === "2025-10-01" ? "." : String(100 + i) };
});

test("yoyAnchorDate is the latest month when its year-over-year is computable", () => {
  assert.equal(yoyAnchorDate(parseObservations(raw)), "2026-03-01");
});

test("yoyAnchorDate steps back past a latest month with no year-ago figure", () => {
  const obs = parseObservations(shutdownGap);
  assert.equal(computeYoY(obs), null);               // the problem: Oct 2026 vs missing Oct 2025
  assert.equal(yoyAnchorDate(obs), "2026-09-01");
});

test("yoyAnchorDate returns the latest month when nothing nearby is computable", () => {
  // Five months of history: no month has a year-ago figure, so the caller sees the
  // failure (null YoY → stale) instead of a silently older month.
  assert.equal(yoyAnchorDate(parseObservations(raw.slice(-5))), "2026-03-01");
  assert.equal(yoyAnchorDate([]), null);
});

test("compute functions honour an explicit anchor month", () => {
  const obs = parseObservations(shutdownGap);
  // Sep 2026 = 113, Aug 2026 = 112, Sep 2025 = 101
  assert.equal(computeYoY(obs, "2026-09-01"), 11.9);        // 113/101 - 1
  assert.equal(computeMoM(obs, "2026-09-01"), 0.9);         // 113/112 - 1
  assert.equal(computeMoMAnnualized(obs, "2026-09-01"), 11.3);
  assert.deepEqual(avgPrice(obs, "2026-09-01"), { current: 113, yearAgo: 101 });
  assert.equal(buildTrend(obs, 12, "2026-09-01").at(-1).month, "Sep 26");
});

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
  // a null riDec must not coerce to 0 and silently drop the part from the basket
  assert.equal(rolledWeights([{ key: "x", riDec: null, levelDec: 100, levelT: 120 }], { allDec: 300, allT: 309 }), null);
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
  // a null headline must not be treated as a 0% headline
  assert.equal(residualRate(null, { a: 40 }, { a: 5 }), null);
});
