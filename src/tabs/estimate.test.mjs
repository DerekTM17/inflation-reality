import { test } from "node:test";
import assert from "node:assert/strict";
import { savedEstimate, estimateFor } from "./estimate.js";
import { emptyAnswers } from "../calculator/model.js";
import { serializeAnswers, STORAGE_KEY } from "../calculator/storage.js";
import { viewData } from "./testdata.mjs";

const store = (value) => ({ getItem: (k) => (k === STORAGE_KEY ? value : null) });

test("no saved answers: the average household, as the panel shows it", () => {
  const e = savedEstimate(viewData(), store(null));
  assert.equal(e.mode, "average");
  assert.equal(e.rows.length, 9);
  assert.equal(e.model.title, "Compared with August 2025");
});

test("blocked, missing or corrupt storage falls back to the average household", () => {
  const throwing = { getItem: () => { throw new Error("blocked"); } };
  for (const s of [null, throwing, store("{not json"), store('{"version":0}')]) {
    assert.equal(savedEstimate(viewData(), s).mode, "average");
  }
});

test("saved mortgage answers: personal lines, owners' yardstick, no yardstick line", () => {
  const answers = { ...emptyAnswers(), answered: { home: "mortgage" } };
  const e = savedEstimate(viewData(), store(serializeAnswers(answers)));
  assert.equal(e.mode, "personal");
  assert.equal(e.model.title, "Your costs vs. August 2025");
  assert.match(e.model.ratesLine, /Prices other than housing rose 3\.6%\.$/);
  assert.ok(e.rows.some((r) => r.id === "mortgage"));
  assert.ok(!e.rows.some((r) => r.id === "exShelter"));
});

test("a stale basket gives null rows, and the model says so", () => {
  const e = savedEstimate(viewData({ basket: { stale: true } }), store(null));
  assert.equal(e.rows, null);
  assert.equal(e.model.answer, "Average household figures are not available right now.");
});

test("an owned-outright home: the owners' yardstick in the rates line (what Your costs renders)", () => {
  const e = estimateFor({ ...emptyAnswers(), answered: { home: "owned" } }, viewData());
  assert.equal(e.mode, "personal");
  assert.match(e.model.ratesLine, /Prices other than housing/);
});
