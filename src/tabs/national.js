// The National numbers tab as plain data (spec "Other tabs"): headline and core with
// the one-month change and its yearly pace, the 12-month trend, other official
// measures, and notes. Pure, so the wording is unit-tested and the view only lays it out.

import { formatRate, movePhrase, monthLabel, barGeometry, round1, joinAnd } from "../calculator/format.js";
import { staleNote, gapNote } from "./notes.js";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

/** "2026-08" becomes "August"; offset -1 gives "July" (wraps across the year). "" when missing. */
export function monthName(referenceMonth, offset = 0) {
  const m = /^(\d{4})-(\d{2})$/.exec(referenceMonth ?? "");
  if (!m) return "";
  return MONTHS[(((Number(m[2]) - 1 + offset) % 12) + 12) % 12];
}

/**
 * Trend labels in the payload look like "Sep 25", which reads as a date. Returns
 * { short: "Sep 2025", long: "September 2025" }; an unknown label passes through.
 */
export function trendMonth(label) {
  const m = /^([A-Z][a-z]{2}) (\d{2})$/.exec(label ?? "");
  const i = m ? SHORT.indexOf(m[1]) : -1;
  if (i < 0) return { short: label ?? "", long: label ?? "" };
  const year = 2000 + Number(m[2]);
  return { short: `${m[1]} ${year}`, long: `${MONTHS[i]} ${year}` };
}

/** "rise 4.9%", "fall 1.2%", "stay about the same", for "they would …". */
function wouldPhrase(pct) {
  const r = round1(pct);
  if (r === 0) return "stay about the same";
  return `${r > 0 ? "rise" : "fall"} ${Math.abs(r).toFixed(1)}%`;
}

export const CARDS = {
  headline: {
    title: "Prices overall",
    help: "This is the number in the news. The one-month change is adjusted for normal seasonal swings, like holiday sales.",
  },
  core: {
    title: "Prices other than food and energy",
    help: "Food and energy prices jump around the most. Leaving them out shows the slower trend underneath. Economists call this core inflation.",
  },
};

/** Names and one-sentence explanations for the measures that are not in ALT_MEASURES. */
export const MEASURES = {
  headline: { name: "CPI for all items", blurb: "The government's main measure of prices for everything people buy." },
  core: { name: "Core CPI", blurb: "CPI without food and energy, whose prices jump around the most." },
  exShelter: {
    name: "Prices other than housing",
    blurb: "CPI without rent and the rent value of owned homes. Your costs compares homeowners with this one.",
  },
};

function card(node, { title, help }, referenceMonth) {
  const month = monthLabel(referenceMonth);
  const has = node.yoy != null;
  let monthSentence = null;
  if (node.mom != null && month) {
    monthSentence = `From ${monthName(referenceMonth, -1)} to ${monthName(referenceMonth)}, prices ${movePhrase(node.mom)}.`;
    if (node.momAnnualized != null) {
      monthSentence += ` At that pace for a full year, they would ${wouldPhrase(node.momAnnualized)}.`;
    }
  }
  return {
    title,
    yearText: has ? formatRate(node.yoy) : "Not available",
    yearSentence: !has
      ? "This figure is not available right now."
      : month ? `Change over the 12 months to ${month}.` : "Change over the last 12 months.",
    monthSentence,
    help,
  };
}

/**
 * Other official measures, highest first, with bar geometry from zero. Measures
 * with no number are left out, never drawn as 0. Rows: { key, name, note, value,
 * valueText, bar, stale } - the shape BarList lays out.
 */
export function measureRows(data) {
  const ex = data.lines?.exShelter ?? null;
  const list = [
    { key: "headline", ...MEASURES.headline, value: data.headline.yoy, stale: data.headline.stale },
    { key: "core", ...MEASURES.core, value: data.core.yoy, stale: data.core.stale },
    { key: "exShelter", ...MEASURES.exShelter, value: ex?.yoy ?? null, stale: ex?.stale ?? false },
    ...data.altMeasures.map((m) => ({ key: m.key, name: m.label, blurb: m.blurb, value: m.yoy, stale: m.stale })),
  ]
    .filter((r) => r.value != null)
    .sort((a, b) => b.value - a.value);
  const bars = barGeometry(list.map((r) => r.value));
  return list.map((r, i) => ({
    key: r.key, name: r.name, note: r.blurb, value: r.value, valueText: formatRate(r.value), bar: bars[i], stale: r.stale,
  }));
}

/** Everything the National numbers view shows. */
export function nationalModel(data) {
  const month = monthLabel(data.referenceMonth);
  const lede = data.headline.yoy != null && month
    ? `Prices overall ${movePhrase(data.headline.yoy)} in the year to ${month}. These are the official numbers for the whole country.`
    : "These are the official inflation numbers for the whole country.";

  const trend = (data.trend ?? []).map((d) => {
    const value = d.headline ?? null;
    return { ...trendMonth(d.month), value, valueText: value == null ? "Not published" : formatRate(value) };
  });
  const gaps = trend.filter((p) => p.value == null).map((p) => p.long);
  const trendNote = gaps.length === 0 ? null : `No figures were published for ${joinAnd(gaps)}, so the line breaks there.`;

  const measures = measureRows(data);
  // Headline and core are named here even if they have no number (then they are not in measures).
  const staleNames = [
    ...(data.headline.stale ? [MEASURES.headline.name] : []),
    ...(data.core.stale ? [MEASURES.core.name] : []),
    ...measures.filter((m) => m.stale && m.key !== "headline" && m.key !== "core").map((m) => m.name),
  ];

  return {
    lede,
    headline: card(data.headline, CARDS.headline, data.referenceMonth),
    core: card(data.core, CARDS.core, data.referenceMonth),
    trend,
    trendNote,
    measures,
    notes: [staleNote(staleNames), gapNote(data)].filter(Boolean),
  };
}
