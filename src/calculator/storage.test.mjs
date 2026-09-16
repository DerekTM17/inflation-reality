import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyAnswers } from "./model.js";
import {
  STORAGE_KEY, serializeAnswers, parseSaved, storageAvailable, loadAnswers, saveAnswers,
} from "./storage.js";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}
const throwing = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
  removeItem() { throw new Error("blocked"); },
};

test("round trip keeps answers, checkboxes, amount edits and renewal rates", () => {
  const answers = {
    answered: { home: "mortgage", health: "own" },
    also: { daycare: true, tuition: false },
    amounts: { mortgage: 2100, gasoline: 0 },
    renewals: { health: 12.5, homeIns: null },
  };
  assert.deepEqual(parseSaved(serializeAnswers(answers)), answers);
});

test("unparseable, non-object, or other version is discarded", () => {
  assert.equal(parseSaved(null), null);
  assert.equal(parseSaved("{not json"), null);
  assert.equal(parseSaved("[1,2]"), null);
  assert.equal(parseSaved(JSON.stringify({ version: 2, answered: { home: "rent" } })), null);
  assert.equal(parseSaved(JSON.stringify({ answered: { home: "rent" } })), null);
});

test("unknown ids, options and bad values are ignored one by one", () => {
  const raw = JSON.stringify({
    version: 1,
    answered: { home: "castle", car: "none", pets: "dog" },
    also: { daycare: "yes", tuition: true, boat: true },
    amounts: { rent: 250000, doctor: "90", yacht: 5, ["__proto__"]: 1, groceries: -3 },
    renewals: { health: 400, homeIns: "6", rent: 5 },
  });
  assert.deepEqual(parseSaved(raw), {
    answered: { car: "none" },
    also: { daycare: false, tuition: true },
    amounts: { rent: 100000, groceries: 0 },
    renewals: { health: 100 },
  });
});

test("saveAnswers stores personal answers and clears otherwise", () => {
  const s = memoryStorage();
  const personal = { ...emptyAnswers(), answered: { car: "gas" } };
  assert.equal(saveAnswers(s, personal), true);
  assert.deepEqual(loadAnswers(s), personal);
  assert.equal(saveAnswers(s, emptyAnswers()), true);
  assert.equal(s.getItem(STORAGE_KEY), null);
  assert.equal(loadAnswers(s), null);
});

test("blocked storage never throws", () => {
  assert.equal(storageAvailable(throwing), false);
  assert.equal(storageAvailable(null), false);
  assert.equal(storageAvailable(memoryStorage()), true);
  assert.equal(loadAnswers(throwing), null);
  assert.equal(loadAnswers(null), null);
  assert.equal(saveAnswers(throwing, { ...emptyAnswers(), answered: { car: "gas" } }), false);
});
