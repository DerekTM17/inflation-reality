// Everything the result panel, lede, summary and fine print display, as plain data.
// Pure, so the wording and the "dollar lines add up to the total" rule are unit-tested
// and the React components only lay it out.

import { ALSO, QUESTIONS, SUMMARY_PHRASES } from "./config.js";
import { effectiveChoices, computeResult, verdict, basis, monthlyTotal } from "./model.js";
import {
  formatRate, movePhrase, formatDollars, signedDollars, roundToStep, allocateRounded,
  barGeometry, monthLabel, joinAnd,
} from "./format.js";

/** Rows shown before "N smaller items" (Everything else is never counted here). */
export const TOP_ROWS = 6;

const UNAVAILABLE = "Average household figures are not available right now.";

/**
 * @param {object} p
 * @param {"average"|"personal"} p.mode
 * @param {object[]|null} p.rows  personalRows() or averageRows() output; null = basket unusable
 * @param {number|null} p.headlinePct  data.headline.yoy
 * @param {string|null} p.referenceMonth  "YYYY-MM"
 * @param {object} p.answers
 */
export function panelModel({ mode, rows, headlinePct, referenceMonth, answers }) {
  const personal = mode === "personal";
  const title = `${personal ? "Your costs" : "The average U.S. household"} vs. ${monthLabel(referenceMonth, -1)}`;
  const nationalLine = headlinePct == null ? "" : `Prices overall ${movePhrase(headlinePct)}.`;
  const empty = {
    title, compare: null, verdict: null, basis: null, top: [], main: [], smaller: null, rest: null,
    allCount: 0, prompts: [], bars: personal, actionLabel: personal ? "Change answers" : "Answer the questions",
  };

  if (rows == null) return { ...empty, answer: UNAVAILABLE, ratesLine: nationalLine, zero: false };

  const result = computeResult(rows);
  const prompts = result.excluded
    .filter((r) => r.missing === "renewal")
    .map((r) => ({ id: r.id, text: `${r.label}: add your renewal increase` }));
  const basisText = personal ? basis(answers) : null;

  if (result.totalAnnual === 0) {
    const dataMissing = result.lines.length === 0 && result.excluded.some((r) => r.missing === "data");
    return {
      ...empty, prompts, basis: basisText, zero: true,
      answer: dataMissing ? "Price data is not available right now." : "Enter your monthly amounts to see your estimate.",
      ratesLine: nationalLine,
    };
  }

  const total = roundToStep(result.totalExtra, 50);
  const answer =
    total > 0 ? `About ${formatDollars(total)} more a year`
    : total < 0 ? `About ${formatDollars(total)} less a year`
    : "About the same as a year ago";
  const ratesLine = personal && result.rate != null
    ? `Your costs ${movePhrase(result.rate)}. ${nationalLine}`.trim()
    : nationalLine;

  const dollars = allocateRounded(result.lines.map((l) => l.extra), total);
  const bars = barGeometry(result.lines.map((l) => l.extra));
  const display = result.lines.map((l, i) => ({
    id: l.id,
    label: l.label,
    note: l.note,
    quiet: l.id === "rest",
    rateText: formatRate(l.rate, { fixed: l.id === "mortgage" }),
    dollars: dollars[i],
    dollarText: l.extra !== 0 && Math.abs(l.extra) < 5 ? "under $10" : signedDollars(dollars[i]),
    bar: bars[i],
    abs: Math.abs(l.extra),
    order: i,
  }));
  const main = display
    .filter((r) => !r.quiet)
    .sort((a, b) => b.abs - a.abs || a.order - b.order);
  const rest = display.find((r) => r.quiet) ?? null;
  const tail = main.slice(TOP_ROWS);
  const smaller = tail.length === 0 ? null : {
    count: tail.length,
    text: `${tail.length} smaller ${tail.length === 1 ? "item" : "items"}`,
    dollars: tail.reduce((s, r) => s + r.dollars, 0),
    dollarText: signedDollars(tail.reduce((s, r) => s + r.dollars, 0)),
  };

  let compare = null;
  if (personal && result.rate != null && headlinePct != null) {
    const [you, us] = barGeometry([result.rate, headlinePct]);
    compare = {
      you: { text: formatRate(result.rate), bar: you },
      us: { text: formatRate(headlinePct), bar: us },
    };
  }

  return {
    ...empty,
    answer,
    ratesLine,
    zero: false,
    total,
    compare,
    verdict: personal ? verdict(result, headlinePct) : null,
    basis: basisText,
    top: main.slice(0, TOP_ROWS),
    main,
    smaller,
    rest,
    allCount: main.length + (rest ? 1 : 0),
    prompts,
  };
}

/** The lede under the headline. Returning visitors see the folded one-liner. */
export function ledeText({ headlinePct, referenceMonth, returning }) {
  const month = monthLabel(referenceMonth);
  if (returning) return `Updated with ${month} prices.`;
  const first = headlinePct == null ? "" : `Prices overall ${movePhrase(headlinePct)} in the year to ${month}. `;
  return `${first}How much that costs you depends on how you live. Answer four questions to see your estimate.`;
}

/** "Rent, gas car, natural gas heat, health insurance through work. Paying for daycare. About $3,950 a month." */
export function summaryText(answers, rows) {
  const choices = effectiveChoices(answers);
  const phrases = QUESTIONS.map((q) => SUMMARY_PHRASES[q.id][choices[q.id]]).join(", ");
  let s = `${phrases[0].toUpperCase()}${phrases.slice(1)}.`;
  const also = ALSO.filter((a) => answers.also[a.id]).map((a) => a.phrase);
  if (also.length > 0) s += ` Paying for ${joinAnd(also)}.`;
  return `${s} About ${formatDollars(roundToStep(monthlyTotal(rows), 50))} a month.`;
}

/** Fine-print sentences under the panel: source month, stale values, missing data, yoyGap. */
export function finePrint({ mode, rows, data }) {
  const out = [
    `Estimates based on BLS consumer price data for ${monthLabel(data.referenceMonth)}. Dollar amounts are rounded.`,
  ];
  const list = rows ?? [];
  if (mode === "average") {
    if (list.some((r) => r.stale)) out.push("Using the last known value for the average household.");
  } else {
    const stale = list.filter((r) => r.stale).map((r) => r.label.toLowerCase());
    if (stale.length > 0) out.push(`Using the last known value for ${joinAnd(stale)}.`);
    const missing = list.filter((r) => r.missing === "data").map((r) => r.label.toLowerCase());
    if (missing.length > 0) {
      out.push(`No recent price data for ${joinAnd(missing)}, so ${missing.length === 1 ? "it is" : "they are"} left out.`);
    }
  }
  if (data.yoyGap) {
    out.push(
      `The newest price data is for ${data.yoyGap.latestMonthLabel}, but no figures were published for ${data.yoyGap.missingMonthLabel}, so these estimates use ${monthLabel(data.referenceMonth)}.`,
    );
  }
  return out;
}
