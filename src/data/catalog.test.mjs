import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, allSeries, WEEKLY_PRICES, CALC_LINES, CALC_COMBOS, BASKET, blsSeries } from "./catalog.js";

test("headline and core use NSA for yoy and SA for mom", () => {
  assert.equal(HEADLINE.seriesId, "CPIAUCNS");
  assert.equal(HEADLINE.momSeriesId, "CPIAUCSL");
  assert.equal(CORE.seriesId, "CPILFENS");
  assert.equal(CORE.momSeriesId, "CPILFESL");
});

test("catalog has 10 categories and 21 avg-price items, all with FRED series ids", () => {
  assert.equal(CATEGORIES.length, 10);
  assert.equal(AVG_PRICE_ITEMS.length, 21);
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

test("alt measures: 5 entries with verified series ids and known kinds", () => {
  assert.equal(ALT_MEASURES.length, 5);
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

test("weekly prices are a second source for goods the BLS table also covers", () => {
  assert.equal(WEEKLY_PRICES.length, 2);
  const byKey = Object.fromEntries(WEEKLY_PRICES.map(w => [w.key, w]));
  assert.equal(byKey.gasoline.seriesId, "GASREGW");
  assert.equal(byKey.diesel.seriesId, "GASDESW");
  // Each weekly series must pair with a BLS APU item actually present in the table,
  // otherwise the cross-source comparison has nothing to compare against.
  const blsIds = new Set(AVG_PRICE_ITEMS.map(p => p.seriesId));
  for (const w of WEEKLY_PRICES) {
    assert.ok(w.label && w.unit && w.blurb);
    assert.ok(blsIds.has(w.blsSeriesId), `${w.key} pairs with a listed BLS item`);
  }
});

test("allSeries includes the weekly EIA series", () => {
  const ids = allSeries().map(s => s.id);
  for (const w of WEEKLY_PRICES) assert.ok(ids.includes(w.seriesId));
});

test("calculator lines: unique ids, known sources, CUUR or CPI series ids", () => {
  const ids = [...CALC_LINES.map(l => l.id), ...CALC_COMBOS.map(c => c.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const l of CALC_LINES) {
    assert.ok(["fred", "bls"].includes(l.source), `${l.id} has a known source`);
    assert.match(l.seriesId, /^(CUUR0000|CPI)/);
    assert.ok(l.label);
  }
  for (const c of CALC_COMBOS) {
    assert.ok(c.parts.length >= 2, `${c.id} combines at least two parts`);
    for (const p of c.parts) assert.ok(p.riDec > 0 && /^CUUR0000/.test(p.seriesId) && p.label);
  }
});

test("allSeries stays FRED-only; blsSeries lists every BLS-only id once", () => {
  const fred = new Set(allSeries().map(s => s.id));
  const bls = blsSeries();
  assert.equal(new Set(bls).size, bls.length);
  assert.deepEqual([...bls].sort(), [
    "CUUR0000SEEB01", "CUUR0000SEEB03", "CUUR0000SEHE01", "CUUR0000SEMC01",
    "CUUR0000SEMF01", "CUUR0000SETE", "CUUR0000SETG02",
  ]);
  for (const id of bls) assert.ok(!fred.has(id), `${id} must not be requested from FRED`);
  for (const l of CALC_LINES.filter(l => l.source === "fred")) assert.ok(fred.has(l.seriesId), `${l.seriesId} is fetched from FRED`);
  for (const v of BASKET.visible) assert.ok(fred.has(v.seriesId), `${v.seriesId} is fetched from FRED`);
});

test("basket: December 2025 weights leave 28.452 (at least 10) for everything else", () => {
  assert.equal(BASKET.riYear, 2025);
  assert.equal(new Set(BASKET.visible.map(v => v.id)).size, BASKET.visible.length);
  const visible = BASKET.visible.reduce((s, v) => s + v.riDec, 0);
  assert.ok(100 - visible >= 10);
  assert.equal(Number((100 - visible).toFixed(3)), 28.452);
  assert.equal(BASKET.ceMonthlyMean, 5750);
});
