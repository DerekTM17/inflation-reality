import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, allSeries } from "./catalog.js";

test("headline and core use NSA for yoy and SA for mom", () => {
  assert.equal(HEADLINE.seriesId, "CPIAUCNS");
  assert.equal(HEADLINE.momSeriesId, "CPIAUCSL");
  assert.equal(CORE.seriesId, "CPILFESNS");
  assert.equal(CORE.momSeriesId, "CPILFESL");
});

test("catalog has 10 categories and 20 avg-price items, all with FRED series ids", () => {
  assert.equal(CATEGORIES.length, 10);
  assert.equal(AVG_PRICE_ITEMS.length, 20);
  // Most categories are CUUR NSA series; a few use FRED's friendly CPI* aliases
  // (e.g. CPIMEDNS/CPIAPPNS/CPIRECNS) where FRED doesn't mirror the CUUR id.
  for (const c of CATEGORIES) assert.match(c.seriesId, /^(CUUR|CPI)/);
  for (const p of AVG_PRICE_ITEMS) assert.match(p.seriesId, /^APU/);
});

test("allSeries de-duplicates and includes SA mom series", () => {
  const ids = allSeries().map(s => s.id);
  assert.equal(new Set(ids).size, ids.length); // no dupes
  assert.ok(ids.includes("CPIAUCNS"));
  assert.ok(ids.includes("CPIAUCSL"));
  assert.ok(allSeries().some(s => s.id === "CPIAUCSL" && s.kind === "levelSA"));
});

test("alt measures: 4 entries with verified series ids and known kinds", () => {
  assert.equal(ALT_MEASURES.length, 4);
  const byKey = Object.fromEntries(ALT_MEASURES.map(m => [m.key, m]));
  assert.equal(byKey.corePce.seriesId, "PCEPILFE");
  assert.equal(byKey.corePce.kind, "index");
  assert.equal(byKey.medianCpi.seriesId, "MEDCPIM159SFRBCLE");
  assert.equal(byKey.trimmedCpi.seriesId, "TRMMEANCPIM159SFRBCLE");
  assert.equal(byKey.stickyCpi.seriesId, "CORESTICKM159SFRBATL");
  for (const m of ALT_MEASURES) assert.ok(m.label && m.color && m.blurb);
  const ids = allSeries().map(s => s.id);
  assert.ok(ids.includes("PCEPILFE") && ids.includes("MEDCPIM159SFRBCLE"));
});
