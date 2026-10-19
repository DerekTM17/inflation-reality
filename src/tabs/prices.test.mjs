import { test } from "node:test";
import assert from "node:assert/strict";
import {
  unitWords, pctChange, formatPrice, avgPriceGroups, movers, fuelRows, priceNotes, priceFamily, moverHover,
} from "./prices.js";
import { AVG_PRICE_ITEMS } from "../data/catalog.js";
import { viewData } from "./testdata.mjs";

test("unitWords: catalog units in words, unknown ones readable", () => {
  assert.equal(unitWords("/doz"), "a dozen");
  assert.equal(unitWords("/16oz"), "for 16 ounces");
  assert.equal(unitWords("/box"), "a box");
});

test("pctChange: null, never Infinity or NaN, when a price is missing or zero", () => {
  assert.ok(Math.abs(pctChange(2.272, 3.587) - -36.66) < 0.01);
  assert.equal(pctChange(null, 3), null);
  assert.equal(pctChange(3, null), null);
  assert.equal(pctChange(3, 0), null);
});

test("formatPrice: cents everywhere, three decimals only for a kilowatt-hour", () => {
  assert.equal(formatPrice(3.587), "$3.59");
  assert.equal(formatPrice(0.548), "$0.55");
  assert.equal(formatPrice(6.92), "$6.92");
  assert.equal(formatPrice(0.9996), "$1.00");
  assert.equal(formatPrice(0.196, "/kWh"), "$0.196");
  assert.equal(formatPrice(null), "");
});

test("avgPriceGroups: every catalog item, grouped in catalog order, missing data said plainly", () => {
  const groups = avgPriceGroups(viewData());
  assert.equal(groups.reduce((n, g) => n + g.items.length, 0), AVG_PRICE_ITEMS.length);
  assert.deepEqual(groups.map((g) => g.category), [...new Set(AVG_PRICE_ITEMS.map((p) => p.category))]);
  const all = groups.flatMap((g) => g.items);
  const eggs = all.find((i) => i.seriesId === "APU0000708111");
  assert.deepEqual(
    [eggs.nowText, eggs.yearAgoText, eggs.changeText, eggs.unitText],
    ["$2.27", "$3.59", "−36.7%", "a dozen"],
  );
  const milk = all.find((i) => i.seriesId === "APU0000709112");
  assert.deepEqual([milk.nowText, milk.yearAgoText, milk.changeText], ["$4.10", "Not available", ""]);
  const chicken = all.find((i) => i.seriesId === "APU0000706111");
  assert.equal(chicken.nowText, "Not available");
  for (const i of all) assert.doesNotMatch(`${i.nowText}${i.changeText}`, /NaN|Infinity|undefined/);
});

test("movers: largest change first either way, missing prices left out, falls extend left", () => {
  const rows = movers(viewData());
  assert.deepEqual(rows.map((r) => r.name), [
    "Eggs, Grade A Large", "Gasoline, Regular", "Ground Beef, 100%", "Electricity", "Butter, Stick",
  ]);
  assert.equal(rows[0].valueText, "−36.7%");
  assert.equal(rows[0].bar.left, 0);
  assert.ok(rows[1].bar.left > 0);
  assert.equal(rows.at(-1).valueText, "0.0%");
  assert.equal(movers(viewData(), 2).length, 2);
  assert.deepEqual(movers(viewData({ avgPrices: {} })), []);
});

test("fuelRows: weekly price, week, year-ago change and the monthly average; missing fuel says so", () => {
  const [gas, diesel] = fuelRows(viewData());
  assert.equal(gas.label, "Gasoline, regular");
  assert.equal(gas.nowText, "$4.32 a gallon");
  assert.equal(gas.weekText, "Week ending Sep 14, 2026.");
  assert.equal(gas.yearAgoText, "A year earlier: $3.17 (+36.3%).");
  assert.equal(gas.monthlyText, "Government monthly average for August 2026: $4.21 a gallon.");
  assert.equal(diesel.nowText, "Not available");
  assert.equal(diesel.weekText, "");
  assert.equal(diesel.yearAgoText, "");
  assert.equal(diesel.monthlyText, "");
});

test("priceNotes: stale prices by name", () => {
  assert.deepEqual(priceNotes(viewData()), ["Using the last known price for Butter, Stick."]);
});

test("movers: each item has a kind of spending, prices with units, and a hover card", () => {
  const by = Object.fromEntries(movers(viewData()).map((r) => [r.key, r]));
  assert.equal(by.APU0000708111.family, "food");
  assert.equal(by.APU000074714.family, "around");
  assert.equal(by.APU000072610.family, "util");
  assert.equal(priceFamily("APU000074717"), "around");
  assert.equal(priceFamily("APU000072620"), "util");
  assert.equal(priceFamily("APU0000709112"), "food");
  assert.deepEqual(moverHover(by.APU0000708111), {
    title: "Eggs, Grade A Large", family: "food",
    items: [["Kind of spending", "Food"], ["Price now", "$2.27 a dozen"], ["A year ago", "$3.59 a dozen"], ["Change", "−36.7%"]],
    lines: [], note: "",
  });
});
