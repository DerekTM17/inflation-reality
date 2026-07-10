import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, allSeries } from "./catalog.js";

test("headline and core use NSA for yoy and SA for mom", () => {
  assert.equal(HEADLINE.seriesId, "CPIAUCNS");
  assert.equal(HEADLINE.momSeriesId, "CPIAUCSL");
  assert.equal(CORE.seriesId, "CPILFESNS");
  assert.equal(CORE.momSeriesId, "CPILFESL");
});

test("catalog has 11 categories and 20 avg-price items, all with series ids", () => {
  assert.equal(CATEGORIES.length, 11);
  assert.equal(AVG_PRICE_ITEMS.length, 20);
  for (const c of CATEGORIES) assert.match(c.seriesId, /^CUUR/);
  for (const p of AVG_PRICE_ITEMS) assert.match(p.seriesId, /^APU/);
});

test("allSeries de-duplicates and includes SA mom series", () => {
  const ids = allSeries().map(s => s.id);
  assert.equal(new Set(ids).size, ids.length); // no dupes
  assert.ok(ids.includes("CPIAUCNS"));
  assert.ok(ids.includes("CPIAUCSL"));
  assert.ok(allSeries().some(s => s.id === "CPIAUCSL" && s.kind === "levelSA"));
});
