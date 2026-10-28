import { test } from "node:test";
import assert from "node:assert/strict";
import * as catalog from "../data/catalog.js";
import { seriesGroups, sourceUrl, LINE_GUIDE, LINE_GUIDE_INTRO, METHOD, CAVEATS, SOURCE_LINKS } from "./sources.js";
import { viewData } from "./testdata.mjs";
import { FAMILIES, LINES, COMMON, EMPLOYER_HEALTH_DEFAULT } from "../calculator/config.js";
import { defaultAmount } from "../calculator/model.js";
import { formatDollars } from "../calculator/format.js";

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
  assert.ok(!LINE_GUIDE.some((l) => l.name === yard.label));
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
    ...LINE_GUIDE_INTRO,
    ...LINE_GUIDE.flatMap((l) => [l.name, l.data, l.formula, l.start]),
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

test("every Your costs line has its own price data, formula and starting amount", () => {
  assert.deepEqual(LINE_GUIDE.map((l) => l.id), Object.keys(LINES));
  for (const l of LINE_GUIDE) {
    assert.equal(l.name, LINES[l.id].label);
    for (const k of ["data", "formula", "start"]) assert.ok(l[k] && l[k].length > 10, `${l.id}.${k}`);
    // Each starting amount is the calculator's own default, never retyped.
    assert.ok(l.start.startsWith(formatDollars(defaultAmount(l.id, COMMON))), `${l.id} start`);
  }
});

test("each series-backed line links the series the calculator reads", () => {
  const guide = Object.fromEntries(LINE_GUIDE.map((l) => [l.id, l]));
  for (const c of catalog.CALC_LINES.filter((x) => !x.yardstick)) {
    assert.deepEqual(guide[c.id].series.map((s) => s.seriesId), [c.seriesId], c.id);
    assert.equal(guide[c.id].series[0].url, sourceUrl(c.seriesId, c.source));
  }
  const doctor = catalog.CALC_COMBOS.find((c) => c.id === "doctor");
  assert.deepEqual(guide.doctor.series.map((s) => s.seriesId), doctor.parts.map((p) => p.seriesId));
  assert.deepEqual(guide.charging.series.map((s) => s.seriesId), ["CUUR0000SEHF01"]);
  for (const id of ["mortgage", "health", "rest"]) assert.deepEqual(guide[id].series, [], id);
});

test("car insurance and the employer premium are explained, not called missing", () => {
  const guide = Object.fromEntries(LINE_GUIDE.map((l) => [l.id, l]));
  assert.match(guide.carIns.data, /motor vehicle insurance/);
  assert.equal(guide.carIns.series[0].source, "BLS");
  assert.match(guide.health.formula, new RegExp(`starts at ${EMPLOYER_HEALTH_DEFAULT}%`));
  assert.match(guide.health.data, /KFF 2025 Employer Health Benefits Survey/);
  assert.match(guide.health.start, /\$180 a month through work, or \$650 if you buy your own/);
  assert.match(guide.gasoline.start, /A hybrid starts at \$105/);
  assert.match(guide.electric.start, /With electric heat it starts at \$190/);
  assert.match(guide.mortgage.formula, /^0%/);
  const insurance = METHOD.find((s) => s.heading === "Insurance").paragraphs.join(" ");
  assert.match(insurance, /Car insurance has a price index of its own/);
});

// Flesch-Kincaid grade, the same formula and 9.0 cap as the translatingpolicy.com
// reading-level gate (scripts/reading-level.py there). Numbers count as a one-syllable
// word. Never raise the cap; rewrite the copy instead.
function fkGrade(text) {
  const t = text.replace(/\$?\d[\d.,]*/g, "ten");
  const sents = t.split(/[.!?:]+/).filter((s) => s.trim());
  const words = t.match(/[A-Za-z']+/g) ?? [];
  if (!sents.length || !words.length) return 0;
  const syl = words.reduce((n, w) => {
    const x = w.toLowerCase().replace(/[^a-z]/g, "");
    let k = (x.match(/[aeiouy]+/g) ?? []).length;
    if (x.endsWith("e") && k > 1 && !/(le|ee|ye)$/.test(x)) k -= 1;
    return n + Math.max(k, 1);
  }, 0);
  return 0.39 * (words.length / sents.length) + 11.8 * (syl / words.length) - 15.59;
}

test("Sources copy reads at or below grade 9, block by block", () => {
  const blocks = [
    ...METHOD.map((s) => [s.heading, s.paragraphs.join(" ")]),
    ["intro", LINE_GUIDE_INTRO.join(" ")],
    ...LINE_GUIDE.map((l) => [l.name, [l.data, l.formula, l.start].join(" ")]),
    ["caveats", CAVEATS.join(" ")],
  ];
  for (const [name, text] of blocks) {
    const g = fkGrade(text);
    assert.ok(g <= 9.0, `${name} reads at grade ${g.toFixed(1)}`);
  }
});
