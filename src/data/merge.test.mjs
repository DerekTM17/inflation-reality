import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, WEEKLY_PRICES, CALC_LINES, CALC_COMBOS, BASKET } from "./catalog.js";
import { buildViewData, staleLabels } from "./merge.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dynamic = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fallback.json"), "utf8"),
);
const catalog = { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, WEEKLY_PRICES };
const fullCatalog = { ...catalog, CALC_LINES, CALC_COMBOS, BASKET };

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
});

test("buildViewData forwards every calculator line, keyed by id, from the payload", () => {
  const view = buildViewData(fullCatalog, dynamic);
  const ids = [...CALC_LINES.map(l => l.id), ...CALC_COMBOS.map(c => c.id)];
  assert.deepEqual(Object.keys(view.lines).sort(), [...ids].sort());
  assert.equal(ids.length, 16);
  const gasoline = view.lines.gasoline;
  assert.equal(gasoline.yoy, dynamic.lines.gasoline.yoy);
  assert.equal(gasoline.yoy, 27.404926);               // literal, pinned to the production fixture
  assert.equal(gasoline.label, "Gas for the car");      // from catalog
  assert.equal(gasoline.source, "fred");
  assert.equal(gasoline.stale, false);
  assert.equal(view.lines.doctor.yoy, dynamic.lines.doctor.yoy);
  assert.equal(view.lines.doctor.label, "Doctor and pharmacy");
});

test("buildViewData lines: stale is carried; a missing line is null, never 0", () => {
  const { rent, ...withoutRent } = dynamic.lines;
  const view = buildViewData(fullCatalog, {
    ...dynamic,
    lines: { ...withoutRent, carIns: { yoy: -5.1, stale: true } },
  });
  assert.deepEqual(
    { yoy: view.lines.carIns.yoy, stale: view.lines.carIns.stale },
    { yoy: -5.1, stale: true },
  );
  assert.equal(view.lines.rent.yoy, null);
  assert.equal(view.lines.rent.stale, false);
});

test("buildViewData forwards the basket as ordered items plus the residual", () => {
  const view = buildViewData(fullCatalog, dynamic);
  assert.deepEqual(view.basket.items.map(i => i.id), BASKET.visible.map(v => v.id));
  const housing = view.basket.items.find(i => i.id === "housing");
  assert.equal(housing.label, "Housing");                          // from catalog
  assert.equal(housing.weight, dynamic.basket.weights.housing);
  assert.equal(housing.rate, dynamic.basket.rates.housing);
  assert.equal(view.basket.restWeight, 28.137887);                 // literal, production fixture
  assert.equal(view.basket.residualYoy, dynamic.basket.residualYoy);
  assert.equal(view.basket.headlineYoy, dynamic.basket.headlineYoy);
  assert.equal(view.basket.month, dynamic.basket.month);
  assert.equal(view.basket.stale, false);
});

test("buildViewData basket: a bare { stale: true } has null fields, never 0", () => {
  const view = buildViewData(fullCatalog, { ...dynamic, basket: { stale: true } });
  assert.equal(view.basket.stale, true);
  assert.equal(view.basket.items.length, BASKET.visible.length);
  assert.ok(view.basket.items.every(i => i.weight === null && i.rate === null));
  assert.equal(view.basket.restWeight, null);
  assert.equal(view.basket.residualYoy, null);
  assert.equal(view.basket.headlineYoy, null);
  assert.equal(view.basket.month, null);
});

test("buildViewData without calculator catalog entries or payload keys returns empty lines and basket", () => {
  const view = buildViewData(catalog, { trend: [], categories: {} });
  assert.deepEqual(view.lines, {});
  assert.deepEqual(view.basket.items, []);
  assert.equal(view.basket.residualYoy, null);
  assert.equal(view.basket.stale, false);
});
