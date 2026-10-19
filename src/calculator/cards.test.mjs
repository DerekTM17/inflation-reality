import { test } from "node:test";
import assert from "node:assert/strict";
import { BASKET } from "../data/catalog.js";
import { FAMILIES, LINES, BASKET_ROWS, QUESTIONS, ALSO } from "./config.js";
import { emptyAnswers, personalRows, averageRows, effectiveChoices, activeLines } from "./model.js";
import { panelModel } from "./panel.js";
import { formatDollars } from "./format.js";
import {
  familyOf, aboutOf, sliderMax, sliderValue, mixShares, shareText, familyCards, rowHover, familyHover, compareHover,
} from "./cards.js";
import { fakeData } from "./testdata.mjs";

const answersWith = (patch) => ({ ...emptyAnswers(), ...patch });
const sum = (xs) => xs.reduce((s, x) => s + x, 0);

function personal(answers, data = fakeData()) {
  const rows = personalRows(answers, data);
  const model = panelModel({
    mode: "personal", rows, headlinePct: data.headline.yoy, exShelterPct: data.lines.exShelter?.yoy ?? null,
    referenceMonth: data.referenceMonth, answers,
  });
  return { rows, model, ...familyCards({ mode: "personal", rows, model, answers }) };
}

function average(data = fakeData()) {
  const answers = emptyAnswers();
  const rows = averageRows(data, BASKET.ceMonthlyMean);
  const model = panelModel({ mode: "average", rows, headlinePct: data.headline.yoy, referenceMonth: data.referenceMonth, answers });
  return { rows, model, ...familyCards({ mode: "average", rows, model, answers }) };
}

// Deterministic LCG so the property tests are reproducible without a new dependency.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("families: every line and basket row has one, as in the spec table", () => {
  assert.deepEqual(FAMILIES.map((f) => f.id), ["home", "around", "food", "util", "fun", "health", "kids", "rest"]);
  assert.deepEqual(FAMILIES.map((f) => f.label), [
    "Home", "Getting around", "Food", "Utilities", "Clothing and fun", "Health", "Kids and school", "Everything else",
  ]);
  for (const f of FAMILIES) assert.equal(f.token, `--f-${f.id}`);
  const byFamily = {};
  for (const [id, line] of Object.entries(LINES)) (byFamily[line.family] ??= []).push(id);
  assert.deepEqual(byFamily, {
    home: ["rent", "mortgage", "homeIns", "upkeep"],
    around: ["gasoline", "charging", "carIns", "carUpkeep", "transit"],
    food: ["groceries", "dining"],
    util: ["electric", "heatGas", "heatOil"],
    fun: ["clothing", "fun"],
    health: ["health", "doctor"],
    kids: ["daycare", "tuition"],
    rest: ["rest"],
  });
  assert.deepEqual(
    [...BASKET.visible.map((v) => v.id), "rest"].map((id) => [id, BASKET_ROWS[id]?.family]),
    [["housing", "home"], ["groceries", "food"], ["dining", "food"], ["energy", "util"], ["gasoline", "around"],
      ["health", "health"], ["clothing", "fun"], ["fun", "fun"], ["rest", "rest"]],
  );
  assert.deepEqual(Object.keys(BASKET_ROWS).sort(), [...BASKET.visible.map((v) => v.id), "rest"].sort());
});

test("rows look up their family and about text by mode, never a basket id in LINES", () => {
  assert.equal(familyOf("health", "personal"), "health");
  assert.equal(aboutOf("health", "personal"), LINES.health.about);
  assert.equal(aboutOf("health", "average"), BASKET_ROWS.health.about);
  assert.notEqual(LINES.health.about, BASKET_ROWS.health.about, "insurance and medical care are different things");
  assert.equal(familyOf("housing", "average"), "home");
  assert.equal(familyOf("housing", "personal"), "rest", "a basket id is not a line");
  for (const t of [...Object.values(LINES), ...Object.values(BASKET_ROWS)].map((x) => x.about)) {
    assert.ok(t && t.endsWith("."), `about text "${t}"`);
    for (const banned of ["—", "·", "→", "!", "CPI", "YoY", "relative importance", "/yr", "/mo"]) {
      assert.ok(!t.includes(banned), `${banned} in "${t}"`);
    }
  }
});

test("mixShares: whole percents that add to 100 by largest remainder; zero and negative stay 0", () => {
  assert.deepEqual(mixShares([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(mixShares([2030, 0, 1100]), [65, 0, 35]);
  assert.deepEqual(mixShares([5, -3, 5]), [50, 0, 50]);
  assert.deepEqual(mixShares([0, 0]), [0, 0]);
  assert.equal(shareText(41, 0.41), "41%");
  assert.equal(shareText(0, 0.004), "under 1%");
  const rand = lcg(0x5ea5);
  for (let n = 0; n < 200; n++) {
    const values = Array.from({ length: 1 + Math.floor(rand() * 8) }, () => (rand() < 0.2 ? 0 : Math.round(rand() * 3000)));
    const shares = mixShares(values);
    const total = sum(values);
    if (total === 0) continue;
    assert.equal(sum(shares), 100, `case ${n}`);
    values.forEach((v, i) => assert.ok(Math.abs(shares[i] - (v / total) * 100) < 1, `case ${n}, entry ${i}`));
  }
});

test("sliders: 0 to max(500, 3 x start rounded up to $100); bigger amounts pin the thumb at the end", () => {
  assert.equal(sliderMax(190), 600);
  assert.equal(sliderMax(100), 500);
  assert.equal(sliderMax(620), 1900);
  assert.equal(sliderMax(1650), 5000);
  assert.equal(sliderMax(0), 500);
  assert.equal(sliderValue(380, 600), 380);
  assert.equal(sliderValue(4000, 1900), 1900);
  assert.equal(sliderValue(0, 500), 0);
});

test("an amount above the slider's max keeps its number and pins the thumb", () => {
  const { cards } = personal(answersWith({ answered: { car: "gas" }, amounts: { groceries: 4000 } }));
  const g = cards.find((c) => c.id === "food").rows[0];
  assert.deepEqual([g.id, g.monthly, g.max, g.sliderValue], ["groceries", 4000, 1900, 1900]);
});

test("average cards: fixed family order, basket rows as text, headings add up to the answer", () => {
  const { model, cards, mix } = average();
  assert.equal(model.total, 2250);
  assert.deepEqual(cards.map((c) => c.id), ["home", "around", "food", "util", "fun", "health", "rest"]);
  assert.deepEqual(cards.find((c) => c.id === "food").rows.map((r) => r.id), ["groceries", "dining"]);
  assert.equal(sum(cards.map((c) => c.dollars)), model.total);
  assert.equal(sum(cards.flatMap((c) => c.rows).map((r) => r.dollars)), model.total);
  for (const c of cards) assert.match(c.dollarText, /^(\+|−)?\$[\d,]+ a year$/);
  assert.ok(cards.flatMap((c) => c.rows).every((r) => r.max == null && !r.renewal), "no sliders or boxes in Average");
  assert.equal(sum(mix.map((s) => s.share)), 100);
  assert.deepEqual(mix.map((s) => s.id), cards.map((c) => c.id));
  assert.match(mix[0].text, /^Home \d+%$/);
});

test("an empty renewal line stays out of the shares, the family rate and the totals, and says so", () => {
  const { model, cards } = personal(answersWith({ answered: { home: "mortgage" } }));
  const home = cards.find((c) => c.id === "home");
  assert.deepEqual(home.rows.map((r) => r.id), ["mortgage", "homeIns", "upkeep"]);
  const ins = home.rows.find((r) => r.id === "homeIns");
  assert.equal(ins.dollars, null);
  assert.equal(ins.addsYearText, "Add your renewal increase");
  assert.equal(ins.renewal, true);
  assert.equal(home.renewalMissing, true);
  assert.equal(home.monthly, 2170, "You pay now counts every row: mortgage 1900 + insurance 140 + repairs 130");
  assert.equal(home.pricedMonthly, 2030, "shares count priced rows only; insurance left out");
  assert.equal(home.rateText, "+0.1%");
  assert.equal(home.rows.find((r) => r.id === "mortgage").rateText, "0%");
  assert.equal(sum(cards.map((c) => c.dollars ?? 0)), model.total);
});

test("personal cards: biggest mover, row text, sliders, no card without lines", () => {
  const { cards } = personal(answersWith({ answered: { car: "gas" } }));
  const around = cards.find((c) => c.id === "around");
  assert.deepEqual(around.rows.map((r) => r.id), ["gasoline", "carIns", "carUpkeep"]);
  assert.match(around.biggest, /^Biggest mover: Gas for the car, \+\$[\d,]+ a year$/);
  const gas = around.rows[0];
  assert.equal(gas.rateText, "+27.4%");
  assert.equal(gas.addsYearText, `${gas.addsText} a year`);
  assert.equal(gas.max, 600);
  assert.match(around.rows[1].addsYearText, /^−\$[\d,]+ a year$/, "car insurance fell");
  assert.equal(cards.find((c) => c.id === "rest").biggest, null, "one line, no biggest mover");
  assert.equal(cards.some((c) => c.id === "kids"), false);
});

test("zero total: cards keep their rows and boxes, no mix, no NaN", () => {
  const base = answersWith({ answered: { home: "rent" } });
  const amounts = Object.fromEntries(activeLines(effectiveChoices(base), base.also).map((id) => [id, 0]));
  const { model, cards, mix } = personal({ ...base, amounts });
  assert.equal(model.zero, true);
  assert.ok(cards.length > 0 && cards.every((c) => c.rows.length > 0));
  assert.ok(cards.flatMap((c) => c.rows).every((r) => r.max >= 500));
  assert.deepEqual(mix, []);
  assert.ok(cards.every((c) => c.share === null && c.dollarText === ""));
  assert.doesNotMatch(JSON.stringify(cards), /NaN|Infinity|undefined/);
});

test("property: 300 random households, card headings add up to the total and shares to 100", () => {
  const rand = lcg(0xfa11);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  for (let n = 0; n < 300; n++) {
    const answers = emptyAnswers();
    for (const q of QUESTIONS) if (rand() < 0.85) answers.answered[q.id] = pick(q.options).id;
    for (const a of ALSO) answers.also[a.id] = rand() < 0.4;
    for (const id of activeLines(effectiveChoices(answers), answers.also)) {
      if (rand() < 0.4) answers.amounts[id] = rand() < 0.15 ? 0 : Math.round(rand() * 3000);
      if (LINES[id].renewal && rand() < 0.5) answers.renewals[id] = Math.round((rand() * 30 - 10) * 10) / 10;
    }
    const { model, cards, mix } = personal(answers);
    if (model.zero) continue;
    assert.equal(sum(cards.map((c) => c.dollars ?? 0)), model.total, `household ${n}: headings`);
    if (mix.length > 0) assert.equal(sum(mix.map((s) => s.share)), 100, `household ${n}: shares`);
    const order = cards.map((c) => FAMILIES.findIndex((f) => f.id === c.id));
    assert.ok(order.every((v, i) => i === 0 || order[i - 1] < v), `household ${n}: family order`);
  }
});

test("hover cards: an amount row and a family, in Personal and Average wording", () => {
  const { cards } = personal(answersWith({ answered: { car: "gas" } }));
  const around = cards.find((c) => c.id === "around");
  const gas = around.rows[0];
  const card = rowHover(gas, "2026-08", true);
  assert.equal(card.title, "Gas for the car");
  assert.equal(card.family, "around");
  assert.deepEqual(card.items, [
    ["Price change since August 2025", "+27.4%"],
    ["You pay now", "$190 a month, $2,280 a year"],
    ["Adds this year", gas.addsText],
    ["Same things a year ago", `${formatDollars(2280 - gas.dollars)} a year`],
  ]);
  assert.deepEqual(card.lines, []);
  assert.equal(card.note, LINES.gasoline.about);
  const fam = familyHover(around, true);
  assert.deepEqual(fam.items.map(([dt]) => dt), ["Share of your spending", "You pay now", "Price change", "Adds this year"]);
  assert.match(fam.items[0][1], /^\d+%$/);
  assert.deepEqual(fam.lines, [around.biggest]);
  const food = average().cards.find((c) => c.id === "food");
  assert.equal(familyHover(food, false).items[0][0], "Share of spending");
  assert.equal(rowHover(food.rows[0], "2026-08", false).items[1][0], "Average spending now");
  assert.equal(rowHover(food.rows[0], "2026-08", false).note, BASKET_ROWS.groceries.about);
  const ins = personal(answersWith({ answered: { home: "mortgage" } })).cards[0].rows[1];
  assert.deepEqual(rowHover(ins, "2026-08", true).items.at(-1), ["Adds this year", "Add your renewal increase"]);
  for (const c of [card, fam]) assert.doesNotMatch(JSON.stringify(c), /\/yr|\/mo|·|—/);
});

test("hover cards: the two bars name the yardstick", () => {
  const renter = personal(answersWith({ answered: { home: "rent" } })).model;
  const you = compareHover(renter, "you");
  assert.equal(you.title, "Your costs");
  assert.match(you.items[0][1], /^(\+|−)\d+\.\d%$/);
  assert.equal(you.note, "Each amount's price change, weighted by what you spend on it.");
  assert.deepEqual(compareHover(renter, "us").items, [["Prices overall", "+3.4%"]]);
  const owner = personal(answersWith({ answered: { home: "owned" } })).model;
  const us = compareHover(owner, "us");
  assert.equal(us.title, "Outside housing");
  assert.deepEqual(us.items, [["Prices other than housing", "+3.6%"]]);
  assert.match(us.note, /^We compare you with prices other than housing/);
  assert.equal(compareHover(average().model, "you"), null);
});
