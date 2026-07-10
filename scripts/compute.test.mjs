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
