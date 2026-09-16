// The Your costs calculation model. Pure: takes answers plus the merged view data
// (buildViewData output) and returns rows and results. No React, no DOM.
//
// Rates are percents (2.75 means +2.75%). A rate of null means "no number": the
// row stays off the total. Missing data never becomes 0.

import {
  QUESTIONS, COMMON, LINES, EMPLOYER_HEALTH_DEFAULT, EMPLOYER_DEFAULT_NOTE,
} from "./config.js";

/** Fresh answers: nothing answered, nothing checked, no edits. */
export function emptyAnswers() {
  return { answered: {}, also: { daycare: false, tuition: false }, amounts: {}, renewals: {} };
}

/** Personal once any question is answered or any checkbox is checked. */
export function isPersonal(answers) {
  return Object.keys(answers.answered).length > 0 || answers.also.daycare || answers.also.tuition;
}

/** Answered choices, with common answers filling the unanswered questions. */
export function effectiveChoices(answers) {
  return { ...COMMON, ...answers.answered };
}

/** Line ids for a household, in display order before sorting. */
export function activeLines(choices, also) {
  const ids = [];
  if (choices.home === "rent") ids.push("rent");
  if (choices.home === "mortgage") ids.push("mortgage", "homeIns", "upkeep");
  if (choices.home === "owned") ids.push("homeIns", "upkeep");
  ids.push("groceries", "dining");
  if (choices.car === "gas" || choices.car === "hybrid") ids.push("gasoline");
  if (choices.car === "electric") ids.push("charging");
  if (choices.car === "none") ids.push("transit");
  else ids.push("carIns", "carUpkeep");
  ids.push("electric");
  if (choices.heat === "gas") ids.push("heatGas");
  if (choices.heat === "oil") ids.push("heatOil");
  if (also.daycare) ids.push("daycare");
  if (also.tuition) ids.push("tuition");
  if (choices.health !== "none") ids.push("health");
  ids.push("doctor", "clothing", "fun", "rest");
  return ids;
}

/** Starting monthly amount for a line, nudged by the answers. */
export function defaultAmount(id, choices) {
  let v = LINES[id].amount;
  if (id === "gasoline" && choices.car === "hybrid") v *= 0.55;
  if (id === "electric" && choices.heat === "electric") v += 80;
  if (id === "health" && choices.health === "own") v = 650;
  return Math.round(v);
}

/**
 * Rate for one personal line: { rate, note, stale, missing }.
 * missing is "renewal" (the person hasn't given an increase) or "data" (no
 * published number), else null.
 */
export function lineRate(id, answers, choices, data) {
  if (id === "mortgage") {
    return { rate: 0, note: LINES.mortgage.note, stale: false, missing: null };
  }
  if (LINES[id].renewal) {
    const edited = Object.hasOwn(answers.renewals, id);
    const usingDefault = !edited && id === "health" && choices.health === "work";
    const rate = edited ? answers.renewals[id] : usingDefault ? EMPLOYER_HEALTH_DEFAULT : null;
    return {
      rate,
      note: usingDefault ? EMPLOYER_DEFAULT_NOTE : "",
      stale: false,
      missing: rate == null ? "renewal" : null,
    };
  }
  let node;
  if (id === "charging") node = data.lines.electric;
  else if (id === "rest") node = { yoy: data.basket.residualYoy, stale: data.basket.stale };
  else node = data.lines[id];
  const rate = node?.yoy ?? null;
  return {
    rate,
    note: LINES[id].note ?? "",
    stale: rate != null && node.stale === true,
    missing: rate == null ? "data" : null,
  };
}

/** Rows for a personal household: { id, label, monthly, rate, note, stale, missing }. */
export function personalRows(answers, data) {
  const choices = effectiveChoices(answers);
  return activeLines(choices, answers.also).map((id) => ({
    id,
    label: LINES[id].label,
    monthly: answers.amounts[id] ?? defaultAmount(id, choices),
    ...lineRate(id, answers, choices, data),
  }));
}

/**
 * Rows for the average U.S. household: rolled basket shares × monthly mean spending,
 * plus Everything else. Returns null when the basket has no usable numbers (for
 * example a bare { stale: true } basket), so the page can say so instead of
 * inventing values.
 */
export function averageRows(data, monthlyMean) {
  const b = data.basket;
  const usable =
    b.items.length > 0 &&
    b.items.every((i) => i.weight != null && i.rate != null) &&
    b.restWeight != null &&
    b.residualYoy != null;
  if (!usable) return null;
  const row = (id, label, weight, rate, note) => ({
    id, label, monthly: (weight / 100) * monthlyMean, rate, note, stale: b.stale === true, missing: null,
  });
  return [
    ...b.items.map((i) => row(i.id, i.label, i.weight, i.rate, "")),
    row("rest", LINES.rest.label, b.restWeight, b.residualYoy, LINES.rest.note),
  ];
}

/** Sum of monthly amounts across rows (the summary's "About $3,950 a month"). */
export function monthlyTotal(rows) {
  return (rows ?? []).reduce((s, r) => s + r.monthly, 0);
}

/**
 * Spec "Calculation model": annual = 12m; yearAgo = annual / (1 + r);
 * extra = annual − yearAgo; your rate = Σ annual / Σ yearAgo − 1.
 * Rows with rate null go to `excluded` and stay off every total.
 */
export function computeResult(rows) {
  const lines = [];
  const excluded = [];
  for (const row of rows) {
    if (row.rate == null) {
      excluded.push(row);
      continue;
    }
    const annual = 12 * row.monthly;
    const yearAgo = annual / (1 + row.rate / 100);
    lines.push({ ...row, annual, yearAgo, extra: annual - yearAgo });
  }
  const totalAnnual = lines.reduce((s, l) => s + l.annual, 0);
  const totalYearAgo = lines.reduce((s, l) => s + l.yearAgo, 0);
  return {
    lines,
    excluded,
    totalAnnual,
    totalYearAgo,
    totalExtra: totalAnnual - totalYearAgo,
    rate: totalYearAgo > 0 ? (totalAnnual / totalYearAgo - 1) * 100 : null,
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Spec "Verdict rule". P and R at one decimal, d = P − R. Within 0.2 → about the
 * same. Otherwise the reason is the line (not Everything else) with the largest
 * c_i = share of year-ago spending × (r_i − R) in the direction of d, if it
 * explains at least 40% of d.
 */
export function verdict(result, headlinePct) {
  if (result.rate == null || headlinePct == null) return null;
  const R = r1(headlinePct);
  const d = r1(r1(result.rate) - R);
  if (Math.abs(d) <= 0.2) return "About the same as the national rate.";
  const lead = d > 0 ? "More than the national rate" : "Less than the national rate";
  let best = null;
  for (const l of result.lines) {
    if (l.id === "rest") continue;
    const c = (l.yearAgo / result.totalYearAgo) * (l.rate - R);
    if (Math.sign(c) !== Math.sign(d)) continue;
    if (best == null || Math.abs(c) > Math.abs(best.c)) best = { c, id: l.id };
  }
  if (best == null || Math.abs(best.c) < 0.4 * Math.abs(d)) return `${lead}.`;
  return `${lead}, mainly because of ${LINES[best.id].because}.`;
}

/** "Based on 1 answer and 3 guesses." (+ starting-estimates sentence until an amount is edited). */
export function basis(answers) {
  const a = QUESTIONS.filter((q) => answers.answered[q.id]).length;
  const g = QUESTIONS.length - a;
  const answersText = `${a} ${a === 1 ? "answer" : "answers"}`;
  const guessesText = `${g} ${g === 1 ? "guess" : "guesses"}`;
  let s;
  if (g === 0) s = "Based on your answers.";
  else if (a === 0) s = `Based on ${guessesText}.`;
  else s = `Based on ${answersText} and ${guessesText}.`;
  return Object.keys(answers.amounts).length === 0 ? `${s} Monthly amounts are starting estimates.` : s;
}
