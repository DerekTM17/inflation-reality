import { test } from "node:test";
import assert from "node:assert/strict";
import { staleNote, gapNote } from "./notes.js";
import { viewData } from "./testdata.mjs";

test("staleNote: null when nothing is stale, joined names otherwise", () => {
  assert.equal(staleNote([]), null);
  assert.equal(staleNote(undefined), null);
  assert.equal(staleNote(["Median CPI"]), "Using the last known value for Median CPI.");
  assert.equal(staleNote(["Eggs", "Milk"], "price"), "Using the last known price for Eggs and Milk.");
});

test("gapNote: only when the payload has a yoyGap, in plain words", () => {
  assert.equal(gapNote(viewData()), null);
  const data = viewData({ yoyGap: { latestMonthLabel: "December 2025", missingMonthLabel: "December 2024" } });
  assert.equal(
    gapNote(data),
    "The newest price data is for December 2025, but no figures were published for December 2024, so these numbers use August 2026.",
  );
});
