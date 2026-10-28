import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS, QUICK_STARTS } from "./config.js";
import { emptyAnswers, isPersonal, effectiveChoices, activeLines, personalRows, basis, applyQuickStart } from "./model.js";
import { serializeAnswers, parseSaved } from "./storage.js";
import { fakeData } from "./testdata.mjs";

test("quick starts: real options, edits on lines the household has, and every question answered", () => {
  assert.deepEqual(QUICK_STARTS.map((q) => q.label), ["Young renter", "Family with kids", "Commuter", "Retiree"]);
  for (const quick of QUICK_STARTS) {
    for (const q of QUESTIONS) {
      assert.ok(q.options.some((o) => o.id === quick.answered[q.id]), `${quick.label}: ${q.id}`);
    }
    const answers = applyQuickStart(emptyAnswers(), quick);
    const ids = activeLines(effectiveChoices(answers), answers.also);
    for (const id of Object.keys(quick.amounts)) assert.ok(ids.includes(id), `${quick.label}: ${id} is one of its lines`);
    assert.equal(isPersonal(answers), true);
    assert.equal(basis(answers), "Based on your answers.");
    const rows = personalRows(answers, fakeData());
    for (const [id, v] of Object.entries(quick.amounts)) assert.equal(rows.find((r) => r.id === id).monthly, v);
  }
  assert.deepEqual(QUICK_STARTS.find((q) => q.id === "family").also, { daycare: true, tuition: false });
  assert.equal(QUICK_STARTS.find((q) => q.id === "retiree").answered.health, "none");
});

test("applyQuickStart replaces answers, checkboxes and edits, keeps renewal rates, and leaves the old answers alone", () => {
  const before = {
    answered: { home: "mortgage" }, also: { daycare: true, tuition: true },
    amounts: { mortgage: 2400, rent: 900 }, renewals: { health: 4 },
  };
  const snapshot = JSON.parse(JSON.stringify(before));
  const commuter = QUICK_STARTS.find((q) => q.id === "commuter");
  const after = applyQuickStart(before, commuter);
  assert.deepEqual(after.answered, { home: "rent", car: "gas", heat: "electric", health: "work" });
  assert.deepEqual(after.also, { daycare: false, tuition: false });
  assert.deepEqual(after.amounts, { gasoline: 380, carUpkeep: 90 });
  assert.deepEqual(after.renewals, { health: 4 });
  assert.deepEqual(before, snapshot, "the answers Undo restores are untouched");
  after.amounts.gasoline = 1;
  after.renewals.health = 1;
  assert.equal(commuter.amounts.gasoline, 380, "edits never write back into the config");
  assert.equal(before.renewals.health, 4);
});

test("a quick start survives saving and reloading", () => {
  for (const quick of QUICK_STARTS) {
    const answers = applyQuickStart(emptyAnswers(), quick);
    assert.deepEqual(parseSaved(serializeAnswers(answers)), answers, quick.label);
  }
});
