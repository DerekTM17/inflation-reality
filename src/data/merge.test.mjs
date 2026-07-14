import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES } from "./catalog.js";
import { buildViewData } from "./merge.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dynamic = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fallback.json"), "utf8"),
);
const catalog = { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES };

test("buildViewData merges static metadata with dynamic values", () => {
  const view = buildViewData(catalog, dynamic);
  assert.equal(view.headline.yoy, 3.3);
  assert.equal(view.headline.seriesId, "CPIAUCNS");   // from catalog
  assert.equal(view.headline.mom, 0.3);
  assert.equal(view.core.yoy, 2.6);

  assert.equal(view.categories.length, 10);
  const gas = view.categories.find(c => c.id === "gas");
  assert.equal(gas.yoy, 12.5);
  assert.equal(gas.color, "#E76F51");                 // from catalog
  assert.equal(gas.icon, "⛽");

  assert.equal(view.avgPrices.length, 20);
  const eggs = view.avgPrices.find(p => p.item === "Eggs, Grade A Large");
  assert.equal(eggs.current, 6.23);
  assert.equal(eggs.unit, "/doz");                    // from catalog

  assert.equal(view.trend.length, 12);
  assert.equal(view.referenceMonthLabel, "March 2026");
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
  assert.equal(pce.yoy, 3.4);              // from fallback.json dynamic
  assert.equal(pce.seriesId, "PCEPILFE");  // from catalog
  assert.ok(pce.blurb && pce.color);
});
