import { test } from "node:test";
import assert from "node:assert/strict";
import { easeOutCubic, tweenAt } from "./motion.js";

test("easeOutCubic: 0 to 1, fast start, never overshoots", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(0.5), 0.875);
  assert.equal(easeOutCubic(-1), 0);
  assert.equal(easeOutCubic(2), 1);
  let last = -1;
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const v = easeOutCubic(k);
    assert.ok(v >= last && v <= 1, `k=${k}`);
    last = v;
  }
});

test("tweenAt: starts at from, ends exactly at to, also for falls and bad durations", () => {
  assert.equal(tweenAt(0, 100, 0, 900), 0);
  assert.equal(tweenAt(0, 100, -16, 900), 0);
  assert.equal(tweenAt(0, 100, 900, 900), 100);
  assert.equal(tweenAt(0, 100, 5000, 900), 100);
  const mid = tweenAt(1800, -150, 175, 350);
  assert.ok(mid < 1800 && mid > -150, `mid ${mid}`);
  assert.equal(tweenAt(1800, -150, 350, 350), -150);
  assert.equal(tweenAt(5, 7, 10, 0), 7);
});
