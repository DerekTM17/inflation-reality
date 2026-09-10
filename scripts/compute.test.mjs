// scripts/compute.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseObservations, shiftMonths, computeYoY, computeMoM,
  computeMoMAnnualized, buildTrend, avgPrice, monthLabel, referenceMonthLabel,
  latestValue, weeklyPrice, weekLabel, yoyAnchorDate,
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
