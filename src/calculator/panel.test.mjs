import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyAnswers, personalRows, averageRows, effectiveChoices, activeLines, computeResult } from "./model.js";
import { panelModel, ledeText, summaryText, finePrint, TOP_ROWS } from "./panel.js";
import { fakeData } from "./testdata.mjs";
import { QUESTIONS, ALSO, LINES } from "./config.js";

const MINUS = "−";
const answersWith = (patch) => ({ ...emptyAnswers(), ...patch });

function personalModel(answers, data = fakeData()) {
  return panelModel({
    mode: "personal", rows: personalRows(answers, data), headlinePct: data.headline.yoy,
    referenceMonth: data.referenceMonth, answers,
  });
}

// Every dollar row the panel shows, counted once: top rows + smaller items + Everything else.
function shownSum(m) {
  return m.top.reduce((s, r) => s + r.dollars, 0) + (m.smaller?.dollars ?? 0) + (m.rest?.dollars ?? 0);
}

test("average panel: title, answer, national line, 6 rows + smaller items + Everything else, no bars/verdict/basis", () => {
  const data = fakeData();
  const m = panelModel({
    mode: "average", rows: averageRows(data, 5750), headlinePct: 3.4, referenceMonth: "2026-08", answers: emptyAnswers(),
  });
  assert.equal(m.title, "The average U.S. household vs. August 2025");
  assert.equal(m.answer, "About $2,250 more a year");
  assert.equal(m.ratesLine, "Prices overall rose 3.4%.");
  assert.equal(m.compare, null);
  assert.equal(m.verdict, null);
  assert.equal(m.basis, null);
  assert.equal(m.bars, false);
  assert.equal(m.actionLabel, "Answer the questions");
  assert.equal(m.top.length, TOP_ROWS);
  assert.equal(m.smaller.count, 2);
  assert.equal(m.smaller.text, "2 smaller items");
  assert.equal(m.rest.label, "Everything else");
  assert.equal(m.rest.note, "Estimated from the national rate");
  assert.equal(m.allCount, 9);
  assert.equal(m.main.length, 8);
  assert.ok(m.top.every((r, i) => i === 0 || m.top[i - 1].abs >= r.abs), "sorted by absolute dollars");
  assert.equal(shownSum(m), m.total);
});

test("personal panel with a mortgage: 0% line, prompt for home insurance, basis, verdict", () => {
  const m = personalModel(answersWith({ answered: { home: "mortgage" } }));
  assert.equal(m.title, "Your costs vs. August 2025");
  assert.equal(m.actionLabel, "Change answers");
  const mortgage = m.main.find((r) => r.id === "mortgage");
  assert.equal(mortgage.rateText, "0%");
  assert.equal(mortgage.note, "Fixed payment");
  assert.equal(mortgage.dollarText, "$0");
  assert.deepEqual(m.prompts, [{ id: "homeIns", text: "Home insurance: add your renewal increase" }]);
  assert.equal(m.basis, "Based on 1 answer and 3 guesses. Monthly amounts are starting estimates.");
  assert.match(m.verdict, /national rate/);
  assert.match(m.ratesLine, /^Your costs (rose|fell) \d+\.\d%\. Prices overall rose 3\.4%\.$/);
  assert.ok(m.compare && m.compare.us.text === "+3.4%");
  assert.equal(m.bars, true);
  assert.equal(shownSum(m), m.total);
});

test("personal panel: a negative line renders with U+2212 and totals still add up", () => {
  const m = personalModel(answersWith({ answered: { car: "gas" } }));
  const carIns = m.main.find((r) => r.id === "carIns");
  assert.ok(carIns.dollarText.startsWith(`${MINUS}$`), carIns.dollarText);
  assert.equal(carIns.rateText, `${MINUS}5.1%`);
  assert.ok(carIns.bar.width > 0);
  assert.equal(shownSum(m), m.total);
});

test("panel: all prices fell → 'less a year' with a U+2212-free answer", () => {
  const lines = Object.fromEntries(
    ["rent", "groceries", "dining", "gasoline", "carIns", "carUpkeep", "electric", "heatGas", "doctor", "clothing", "fun"]
      .map((id) => [id, { id, yoy: -2, stale: false }]),
  );
  const data = fakeData({ lines, basket: { residualYoy: -2 } });
  const m = personalModel(answersWith({ answered: { health: "none" } }), data);
  assert.match(m.answer, /^About \$[\d,]+ less a year$/);
  assert.equal(shownSum(m), m.total);
});

test("panel: 'under $10' for a tiny non-zero line", () => {
  const data = fakeData();
  const answers = answersWith({ answered: { car: "gas" }, amounts: { clothing: 5 } }); // 60 a year at 3.6% ≈ $2
  const m = personalModel(answers, data);
  assert.equal(m.main.find((r) => r.id === "clothing").dollarText, "under $10");
});

test("panel: zero total replaces the answer and hides lines, bars and verdict", () => {
  const amounts = Object.fromEntries(
    ["rent", "groceries", "dining", "gasoline", "carIns", "carUpkeep", "electric", "heatGas", "health", "doctor", "clothing", "fun", "rest"]
      .map((id) => [id, 0]),
  );
  const m = personalModel(answersWith({ answered: { home: "rent" }, amounts }));
  assert.equal(m.zero, true);
  assert.equal(m.answer, "Enter your monthly amounts to see your estimate.");
  assert.deepEqual(m.top, []);
  assert.equal(m.compare, null);
  assert.equal(m.verdict, null);
});

test("panel: unusable basket in Average says so and invents nothing", () => {
  const m = panelModel({ mode: "average", rows: null, headlinePct: 3.4, referenceMonth: "2026-08", answers: emptyAnswers() });
  assert.equal(m.answer, "Average household figures are not available right now.");
  assert.deepEqual(m.top, []);
  assert.equal(m.ratesLine, "Prices overall rose 3.4%.");
});

test("ledeText: new and returning", () => {
  assert.equal(ledeText({ headlinePct: 3.4, referenceMonth: "2026-08", returning: false }),
    "Prices overall rose 3.4% in the year to August 2026. How much that costs you depends on how you live. Answer four questions to see your estimate.");
  assert.equal(ledeText({ headlinePct: 3.4, referenceMonth: "2026-08", returning: true }), "Updated with August 2026 prices.");
});

test("summaryText: guesses fill in, checkboxes listed, monthly total to $50", () => {
  const answers = answersWith({ answered: { home: "rent" }, also: { daycare: true, tuition: false } });
  const rows = [{ monthly: 3000 }, { monthly: 960 }];
  assert.equal(summaryText(answers, rows),
    "Rent, gas car, natural gas heat, health insurance through work. Paying for daycare. About $3,950 a month.");
  const both = answersWith({ answered: { home: "mortgage", car: "none" }, also: { daycare: true, tuition: true } });
  assert.match(summaryText(both, rows), /^Fixed-rate mortgage, no car, .* Paying for daycare and college tuition\. /);
});

test("finePrint: month, stale lines, missing data, yoyGap", () => {
  const data = fakeData({
    lines: {
      carIns: { id: "carIns", yoy: -5.1, stale: true },
      daycare: { id: "daycare", yoy: null, stale: false },
    },
    yoyGap: { latestMonthLabel: "October 2026", missingMonthLabel: "October 2025" },
  });
  const rows = personalRows(answersWith({ also: { daycare: true, tuition: false } }), data);
  assert.deepEqual(finePrint({ mode: "personal", rows, data }), [
    "Estimates based on BLS consumer price data for August 2026. Dollar amounts are rounded.",
    "Using the last known value for car insurance.",
    "No recent price data for daycare, so it is left out.",
    "The newest price data is for October 2026, but no figures were published for October 2025, so these estimates use August 2026.",
  ]);
  const staleBasket = fakeData({ basket: { stale: true } });
  assert.deepEqual(finePrint({ mode: "average", rows: averageRows(staleBasket, 5750), data: staleBasket }), [
    "Estimates based on BLS consumer price data for August 2026. Dollar amounts are rounded.",
    "Using the last known value for the average household.",
  ]);
});

test("panel: every line missing (no data at all) says price data unavailable, not the amounts prompt", () => {
  const rows = [
    { id: "rent", label: "Rent", monthly: 1650, rate: null, note: "", stale: false, missing: "data" },
    { id: "groceries", label: "Groceries", monthly: 620, rate: null, note: "", stale: false, missing: "data" },
  ];
  const m = panelModel({ mode: "personal", rows, headlinePct: 3.4, referenceMonth: "2026-08", answers: emptyAnswers() });
  assert.equal(m.zero, true);
  assert.equal(m.answer, "Price data is not available right now.");
  assert.equal(m.ratesLine, "Prices overall rose 3.4%.");
  assert.deepEqual(m.top, []);
  assert.equal(m.rest, null);
  assert.equal(m.verdict, null);
});

// Deterministic LCG so the property test below is reproducible without a new dependency.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("allocateRounded property: 500 random personal households add up and never misplace a dollar", () => {
  const rand = lcg(0xcafe2a);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  for (let n = 0; n < 500; n++) {
    const answers = emptyAnswers();
    for (const q of QUESTIONS) {
      if (rand() < 0.85) answers.answered[q.id] = pick(q.options).id;
    }
    for (const a of ALSO) answers.also[a.id] = rand() < 0.4;
    const choices = effectiveChoices(answers);
    const ids = activeLines(choices, answers.also);
    for (const id of ids) {
      if (rand() < 0.4) answers.amounts[id] = rand() < 0.15 ? 0 : Math.round(rand() * 2000);
      if (LINES[id]?.renewal && rand() < 0.5) answers.renewals[id] = Math.round((rand() * 30 - 10) * 10) / 10;
    }

    const data = fakeData();
    const rows = personalRows(answers, data);
    const m = personalModel(answers, data);
    if (m.zero) continue;

    assert.equal(shownSum(m), m.total, `household ${n}: rows don't add up to the total`);

    const byId = Object.fromEntries(computeResult(rows).lines.map((l) => [l.id, l]));
    for (const row of [...m.main, ...(m.rest ? [m.rest] : [])]) {
      const line = byId[row.id];
      if (!line) continue;
      if (line.extra === 0) assert.equal(row.dollars, 0, `household ${n}, ${row.id}: $0 line got dollars`);
      if (row.dollars !== 0) {
        assert.equal(Math.sign(row.dollars), Math.sign(line.extra), `household ${n}, ${row.id}: sign flip`);
      }
    }
  }
});

test("panel copy obeys the voice guide's banned characters", () => {
  const data = fakeData({ yoyGap: { latestMonthLabel: "October 2026", missingMonthLabel: "October 2025" } });
  const answers = answersWith({ answered: { home: "mortgage", car: "electric" }, also: { daycare: true, tuition: true } });
  const rows = personalRows(answers, data);
  const m = personalModel(answers, data);
  const text = JSON.stringify([m, finePrint({ mode: "personal", rows, data }), summaryText(answers, rows),
    ledeText({ headlinePct: 3.4, referenceMonth: "2026-08", returning: false })]);
  for (const banned of ["—", "·", "→", "!", "CPI", "YoY"]) {
    assert.ok(!text.includes(banned), `found ${banned}`);
  }
});
