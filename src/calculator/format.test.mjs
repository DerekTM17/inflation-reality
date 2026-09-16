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
