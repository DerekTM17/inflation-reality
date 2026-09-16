import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, WEEKLY_PRICES, CALC_LINES, CALC_COMBOS } from "./catalog.js";
import { buildViewData, staleLabels } from "./merge.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dynamic = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fallback.json"), "utf8"),
);
const catalog = { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, WEEKLY_PRICES };

test("buildViewData merges static metadata with dynamic values", () => {
  const view = buildViewData(catalog, dynamic);
  assert.equal(typeof view.headline.yoy, "number");
  assert.equal(view.headline.yoy, dynamic.headline.yoy);
  assert.equal(view.headline.seriesId, "CPIAUCNS");   // from catalog
  assert.equal(typeof view.headline.mom, "number");
  assert.equal(view.core.yoy, dynamic.core.yoy);

  assert.equal(view.categories.length, 10);
  const gas = view.categories.find(c => c.id === "gas");
  assert.equal(gas.yoy, dynamic.categories.gas.yoy);
  assert.equal(gas.yoy, 27.4);                        // literal, pinned to the production fixture
  assert.equal(gas.color, "#E76F51");                 // from catalog
  assert.equal(gas.icon, "⛽");

  assert.equal(view.avgPrices.length, 21);
  const eggs = view.avgPrices.find(p => p.item === "Eggs, Grade A Large");
  assert.equal(eggs.current, dynamic.avgPrices.APU0000708111.current);
  assert.equal(eggs.unit, "/doz");                    // from catalog

  assert.equal(view.trend.length, 12);
  assert.match(view.referenceMonthLabel, /^[A-Z][a-z]+ \d{4}$/);
});

test("buildViewData tolerates a missing dynamic entry (yoy null)", () => {
  const stripped = { ...dynamic, categories: { ...dynamic.categories, gas: undefined } };
  const view = buildViewData(catalog, stripped);
  const gas = view.categories.find(c => c.id === "gas");
  assert.equal(gas.yoy, null);
});

test("buildViewData exposes altMeasures merged with catalog metadata", () => {
  const view = buildViewData(catalog, dynamic);
  assert.equal(view.altMeasures.length, 5);
  const pce = view.altMeasures.find(m => m.key === "corePce");
  assert.equal(pce.yoy, dynamic.altMeasures.corePce.yoy);
  assert.equal(pce.seriesId, "PCEPILFE");  // from catalog
  assert.ok(pce.blurb && pce.color);
});

test("buildViewData exposes weeklyPrices merged with catalog metadata", () => {
  const view = buildViewData(catalog, {
    weeklyPrices: { gasoline: { current: 4.07, yearAgo: 3.42, asOf: "2026-08-31" } },
  });
  const gas = view.weeklyPrices.find(w => w.key === "gasoline");
  assert.equal(gas.current, 4.07);
  assert.equal(gas.asOf, "2026-08-31");
  assert.equal(gas.seriesId, "GASREGW");     // from catalog
  assert.equal(gas.unit, "/gal");            // from catalog
  const diesel = view.weeklyPrices.find(w => w.key === "diesel");
  assert.equal(diesel.current, null);        // absent from the payload
  assert.equal(diesel.stale, false);
});

test("staleLabels: returns the display labels of stale items only", () => {
  const view = buildViewData(catalog, dynamic);
  // fallback.json ships all-fresh dynamic data, so nothing should be flagged.
  assert.deepEqual(staleLabels(view.categories), []);
});

test("staleLabels: picks label for categories/altMeasures/weeklyPrices, item for avgPrices", () => {
  assert.deepEqual(
    staleLabels([{ label: "Gasoline", stale: true }, { label: "Clothing", stale: false }]),
    ["Gasoline"],
  );
  assert.deepEqual(
    staleLabels([{ item: "Eggs, Grade A Large", stale: true }, { item: "Whole Milk", stale: false }]),
    ["Eggs, Grade A Large"],
  );
});

test("buildViewData passes a yoyGap through, and null when there isn't one", () => {
  const yoyGap = { latestMonth: "2026-10", latestMonthLabel: "October 2026", missingMonthLabel: "October 2025" };
  assert.deepEqual(buildViewData(catalog, { ...dynamic, yoyGap }).yoyGap, yoyGap);
  assert.equal(buildViewData(catalog, dynamic).yoyGap, null);
});

test("staleLabels: tolerates an empty or missing list", () => {
  assert.deepEqual(staleLabels([]), []);
  assert.deepEqual(staleLabels(undefined), []);
});

test("staleLabels: works on single macro nodes passed as an ad-hoc list (headline/core)", () => {
  const view = buildViewData(catalog, { ...dynamic, headline: { ...dynamic.headline, stale: true } });
  assert.deepEqual(staleLabels([view.headline, view.core]), [HEADLINE.label]);
});

test("fallback.json is a healthy production snapshot with every calculator line and the basket", () => {
  for (const id of [...CALC_LINES.map(l => l.id), ...CALC_COMBOS.map(c => c.id)]) {
    assert.equal(typeof dynamic.lines?.[id]?.yoy, "number", `${id} in fallback.lines`);
    assert.notEqual(dynamic.lines[id].stale, true, `${id} is not stale`);
  }
  assert.equal(typeof dynamic.basket?.residualYoy, "number");
  assert.notEqual(dynamic.basket.stale, true);
  // Literal, pinned to the 2026-08 production fixture (not a pass-through of itself).
  assert.equal(dynamic.basket.residualYoy, 2.014252);
});
