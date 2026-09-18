import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as catalog from "../data/catalog.js";
import { buildViewData } from "../data/merge.js";
import { QUESTIONS, COMMON, LINES, EXPLANATIONS } from "./config.js";
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

test("explanations obey the voice guide and cover both owner answers", () => {
  const texts = Object.values(EXPLANATIONS).flatMap((q) => Object.values(q));
  for (const text of texts) {
    for (const banned of ["\u2014", "\u00B7", "\u2192", "!", "CPI", "YoY", "relative importance"]) {
      assert.ok(!text.includes(banned), `${banned} in "${text}"`);
    }
  }
  // Owners and mortgage holders both need to know property taxes are not in the estimate.
  for (const answer of ["mortgage", "owned"]) {
    assert.match(EXPLANATIONS.home[answer], /Property taxes are left out/, answer);
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
