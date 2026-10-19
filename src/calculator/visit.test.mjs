import { test } from "node:test";
import assert from "node:assert/strict";
import { createVisit, foldOnMount, toggleOpen } from "./visit.js";

test("foldOnMount: the first mount folds on saved answers; later mounts keep the visit's state", () => {
  const v = createVisit();
  assert.equal(foldOnMount(v, true), true);
  assert.equal(v.returning, true);
  assert.equal(foldOnMount(v, false), true, "a remount after a tab switch stays folded");
  v.folded = false; // Change answers
  assert.equal(foldOnMount(v, true), false, "and stays open after Change answers");
  const fresh = createVisit();
  assert.equal(foldOnMount(fresh, false), false);
  assert.equal(fresh.returning, false);
  fresh.folded = true; // a quick start folds the questions
  assert.equal(foldOnMount(fresh, false), true, "a quick start's fold survives a tab switch");
});

test("toggleOpen: which cards are open lasts for the visit, as a new list each time", () => {
  const a = toggleOpen([], "home");
  assert.deepEqual(a, ["home"]);
  const b = toggleOpen(a, "food");
  assert.deepEqual(b, ["home", "food"]);
  assert.deepEqual(toggleOpen(b, "home"), ["food"]);
  assert.deepEqual(a, ["home"], "never mutates");
  assert.deepEqual(createVisit().open, []);
});
