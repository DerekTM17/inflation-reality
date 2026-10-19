import { test } from "node:test";
import assert from "node:assert/strict";
import * as catalog from "../data/catalog.js";
import { seriesGroups, sourceUrl, NO_SERIES_LINES, METHOD, CAVEATS, SOURCE_LINKS } from "./sources.js";
import { viewData } from "./testdata.mjs";
import { FAMILIES } from "../calculator/config.js";

const groups = seriesGroups(catalog, viewData());
const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
const ids = (g) => g.rows.map((r) => r.seriesId);

test("sourceUrl: FRED series page or the BLS data viewer", () => {
  assert.equal(sourceUrl("CUUR0000SEHA", "fred"), "https://fred.stlouisfed.org/series/CUUR0000SEHA");
  assert.equal(sourceUrl("CUUR0000SETE", "bls"), "https://data.bls.gov/timeseries/CUUR0000SETE");
});

test("the yardstick is a source series, never a household line", () => {
  const yard = catalog.CALC_LINES.find((l) => l.yardstick);
  assert.ok(!ids(byId.household).includes(yard.seriesId));
  assert.ok(ids(byId.yardstick).includes(yard.seriesId));
  assert.ok(ids(byId.national).includes(yard.seriesId));
  const row = byId.yardstick.rows.find((r) => r.seriesId === yard.seriesId);
  assert.equal(row.name, "Prices other than housing (homeowners)");
  assert.equal(row.yoy, 3.6);
  assert.ok(!NO_SERIES_LINES.some((l) => l.name === yard.label));
});

test("every household series and combo part is listed with its own source's link", () => {
  for (const l of catalog.CALC_LINES.filter((x) => !x.yardstick)) {
    const r = byId.household.rows.find((x) => x.seriesId === l.seriesId);
    assert.ok(r, `${l.id} listed`);
    assert.equal(r.url, sourceUrl(l.seriesId, l.source));
  }
  const parts = byId.household.rows.filter((r) => r.name.startsWith("Doctor and pharmacy: "));
  assert.deepEqual(parts.map((r) => r.source), ["BLS", "BLS"]);
  assert.match(parts[0].url, /^https:\/\/data\.bls\.gov\/timeseries\//);
});

test("every series the site fetches appears, except the old dashboard's categories", () => {
  const listed = new Set(groups.flatMap(ids));
  const used = new Set([
    ...catalog.blsSeries(),
    catalog.HEADLINE.seriesId, catalog.HEADLINE.momSeriesId, catalog.CORE.seriesId, catalog.CORE.momSeriesId,
    ...catalog.CALC_LINES.map((l) => l.seriesId),
    ...catalog.BASKET.visible.map((v) => v.seriesId),
    ...catalog.ALT_MEASURES.map((m) => m.seriesId),
    ...catalog.AVG_PRICE_ITEMS.map((p) => p.seriesId),
    ...catalog.WEEKLY_PRICES.map((w) => w.seriesId),
  ]);
  for (const id of used) assert.ok(listed.has(id), `${id} listed`);
});

test("missing numbers stay null, never 0", () => {
  const sticky = byId.national.rows.find((r) => r.seriesId === "CORESTICKM159SFRBATL");
  assert.equal(sticky.yoy, null);
  const chicken = byId.prices.rows.find((r) => r.seriesId === "APU0000706111");
  assert.equal(chicken.yoy, null);
  const diesel = byId.prices.rows.find((r) => r.seriesId === "GASDESW");
  assert.equal(diesel.yoy, null);
});

test("copy follows the voice guide", () => {
  const text = [
    ...groups.flatMap((g) => [g.title, ...g.rows.map((r) => r.name)]),
    ...NO_SERIES_LINES.flatMap((l) => [l.name, l.how]),
    ...METHOD.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...CAVEATS,
    ...SOURCE_LINKS.map((l) => l.text),
  ];
  for (const t of text) {
    for (const banned of ["—", "·", "→", "!", "Welcome back", "Here's", "Let's", "simply"]) {
      assert.ok(!t.includes(banned), `${JSON.stringify(banned)} in ${t}`);
    }
  }
  assert.ok(METHOD.some((s) => s.paragraphs.some((p) => p.includes("$5,750 a month"))));
  for (const l of SOURCE_LINKS) assert.match(l.url, /^https:\/\//);
});

test("series rows carry a family dot where the series is a kind of spending", () => {
  const ids = new Set(FAMILIES.map((f) => f.id));
  for (const r of byId.household.rows) assert.ok(ids.has(r.family), `${r.name} has a family`);
  assert.equal(byId.household.rows.find((r) => r.seriesId === "CUUR0000SETB01").family, "around");
  assert.equal(byId.household.rows.find((r) => r.name.startsWith("Doctor and pharmacy: ")).family, "health");
  assert.equal(byId.average.rows.find((r) => r.seriesId === "CPIMEDNS").family, "health");
  assert.equal(byId.average.rows.find((r) => r.seriesId === "CUUR0000SAH1").family, "home");
  assert.equal(byId.prices.rows.find((r) => r.seriesId === "APU000072610").family, "util");
  assert.equal(byId.prices.rows.find((r) => r.seriesId === "GASREGW").family, "around");
  for (const g of [byId.yardstick, byId.national]) for (const r of g.rows) assert.equal(r.family, null, r.name);
});
