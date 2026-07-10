import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePayload } from "./assemble.mjs";

const catalog = {
  HEADLINE: { key: "headline", seriesId: "CPIAUCNS", momSeriesId: "CPIAUCSL" },
  CORE: { key: "core", seriesId: "CPILFESNS", momSeriesId: "CPILFESL" },
  CATEGORIES: [{ id: "gas", seriesId: "CUUR0000SETB01" }],
  AVG_PRICE_ITEMS: [{ item: "Eggs", seriesId: "APU0000708111" }],
};

const series = (start, step) =>
  Array.from({ length: 14 }, (_, i) => ({
    date: `2025-${String(i + 2).padStart(2, "0")}-01`.replace("2025-13", "2026-01").replace("2025-14", "2026-02").replace("2025-15", "2026-03"),
    value: String(start + i * step),
  }));

const observationsBySeries = {
  CPIAUCNS: series(100, 0.3),
  CPIAUCSL: series(100, 0.3),
  CPILFESNS: series(100, 0.2),
  CPILFESL: series(100, 0.2),
  CUUR0000SETB01: series(200, 1),
  APU0000708111: series(5, 0.05),
};

test("assemblePayload produces headline yoy/mom and keyed maps", () => {
  const p = assemblePayload({
    observationsBySeries, catalog, fallback: null, generatedAt: "2026-07-13T14:00:00.000Z",
  });
  assert.equal(p.generatedAt, "2026-07-13T14:00:00.000Z");
  assert.equal(typeof p.headline.yoy, "number");
  assert.equal(typeof p.headline.mom, "number");
  assert.equal(typeof p.headline.momAnnualized, "number");
  assert.ok("gas" in p.categories);
  assert.ok("APU0000708111" in p.avgPrices);
  assert.equal(typeof p.avgPrices.APU0000708111.current, "number");
  assert.ok(Array.isArray(p.trend) && p.trend.length === 12);
  assert.match(p.referenceMonth, /^\d{4}-\d{2}$/);
});

test("missing series falls back to prior value and marks stale", () => {
  const fallback = { categories: { gas: { yoy: 9.9 } } };
  const p = assemblePayload({
    observationsBySeries: { ...observationsBySeries, CUUR0000SETB01: [] },
    catalog, fallback, generatedAt: "2026-07-13T14:00:00.000Z",
  });
  assert.equal(p.categories.gas.yoy, 9.9);
  assert.equal(p.categories.gas.stale, true);
});
