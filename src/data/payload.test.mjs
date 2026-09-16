import { test } from "node:test";
import assert from "node:assert/strict";
import { isPlausiblePayload } from "./payload.js";

test("isPlausiblePayload accepts trend + categories, lines and basket optional", () => {
  assert.equal(isPlausiblePayload({ trend: [], categories: {} }), true);
  assert.equal(isPlausiblePayload({ trend: [], categories: {}, lines: {}, basket: { stale: true } }), true);
});

test("isPlausiblePayload rejects null, arrays and missing keys", () => {
  assert.equal(isPlausiblePayload(null), false);
  assert.equal(isPlausiblePayload([]), false);
  assert.equal(isPlausiblePayload({ trend: [] }), false);
  assert.equal(isPlausiblePayload({ trend: {}, categories: {} }), false);
  assert.equal(isPlausiblePayload({ trend: [], categories: [] }), false);
  assert.equal(isPlausiblePayload({ trend: [], categories: null }), false);
});
