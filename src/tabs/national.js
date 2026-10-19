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

/** Who publishes each measure (spec "Families": publisher alias tokens). */
export const PUBLISHERS = [
  { id: "labor", label: "Bureau of Labor Statistics", token: "--p-labor" },
  { id: "commerce", label: "Commerce Department", token: "--p-commerce" },
  { id: "cleveland", label: "Cleveland Fed", token: "--p-cleveland" },
  { id: "atlanta", label: "Atlanta Fed", token: "--p-atlanta" },
  { id: "dallas", label: "Dallas Fed", token: "--p-dallas" },
];
const PUBLISHER_LABEL = Object.fromEntries(PUBLISHERS.map((p) => [p.id, p.label]));

export const MEASURE_PUBLISHER = {
  headline: "labor", core: "labor", exShelter: "labor", corePce: "commerce",
  medianCpi: "cleveland", trimmedCpi: "cleveland", stickyCpi: "atlanta", trimmedPce: "dallas",
};

/** "0.5 points above prices overall" / "below" / "Same as prices overall", at display precision. "" without both numbers. */
export function pointsVsHeadline(value, headline) {
  if (value == null || headline == null) return "";
  const d = round1(round1(value) - round1(headline));
  if (d === 0) return "Same as prices overall";
  return `${Math.abs(d).toFixed(1)} points ${d > 0 ? "above" : "below"} prices overall`;
}

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
  // Pace bars: the past 12 months next to this month's change at a yearly pace, from zero.
  let pace = null;
  if (has && node.momAnnualized != null) {
    const [year, now] = barGeometry([node.yoy, node.momAnnualized]);
    pace = {
      year: { label: "Past 12 months", text: formatRate(node.yoy), bar: year, neg: node.yoy < 0 },
      month: { label: "This month's pace", text: formatRate(node.momAnnualized), bar: now, neg: node.momAnnualized < 0 },
    };
  }
  return {
    title,
    value: has ? node.yoy : null,
    yearText: has ? formatRate(node.yoy) : "Not available",
    yearSentence: !has
      ? "This figure is not available right now."
      : month ? `Change over the 12 months to ${month}.` : "Change over the last 12 months.",
    monthSentence,
    help,
    pace,
    spark: null,
  };
}

/**
 * Other official measures, highest first, with bar geometry from zero. Measures
 * with no number are left out, never drawn as 0. Rows: { key, name, note, value,
 * valueText, bar, stale, publisher, publisherLabel, vsText }, the shape MeasureList lays out.
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
  return list.map((r, i) => {
    const publisher = MEASURE_PUBLISHER[r.key] ?? "labor";
    return {
      key: r.key, name: r.name, note: r.blurb, value: r.value, valueText: formatRate(r.value), bar: bars[i], stale: r.stale,
      publisher,
      publisherLabel: PUBLISHER_LABEL[publisher],
      vsText: r.key === "headline" ? "" : pointsVsHeadline(r.value, data.headline.yoy),
    };
  });
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
  const values = trend.map((p) => p.value);

  const measures = measureRows(data);
  // Headline and core are named here even if they have no number (then they are not in measures).
  const staleNames = [
    ...(data.headline.stale ? [MEASURES.headline.name] : []),
    ...(data.core.stale ? [MEASURES.core.name] : []),
    ...measures.filter((m) => m.stale && m.key !== "headline" && m.key !== "core").map((m) => m.name),
  ];

  const headline = card(data.headline, CARDS.headline, data.referenceMonth);
  // A filled sparkline of the same months on the overall card; it needs two points.
  headline.spark = values.filter((v) => v != null).length >= 2 ? values : null;

  return {
    lede,
    headline,
    core: card(data.core, CARDS.core, data.referenceMonth),
    trend,
    trendNote,
    trendTicks: evenTicks(values),
    measures,
    measureRef: measureRef(measures),
    publishers: PUBLISHERS.filter((p) => measures.some((r) => r.publisher === p.id)),
    notes: [staleNote(staleNames), gapNote(data)].filter(Boolean),
  };
}

/** Where the dashed "Prices overall" line sits on the measures' bars (percent of the track), or null. */
export function measureRef(rows) {
  const h = rows.find((r) => r.key === "headline");
  if (!h) return null;
  return { left: h.value >= 0 ? h.bar.left + h.bar.width : h.bar.left, text: `Prices overall ${h.valueText}` };
}

const TICK_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];

/**
 * Evenly spaced y-axis ticks that include zero, at most six (spec: "Fix the uneven
 * y-axis ticks (0/2/5%) to evenly spaced ones"). Gap months (null) are ignored.
 */
export function evenTicks(values) {
  const nums = values.filter((v) => v != null && Number.isFinite(v));
  const lo0 = Math.min(0, ...nums);
  const hi0 = Math.max(0, ...nums);
  const step = TICK_STEPS.find((s) => Math.ceil(hi0 / s) - Math.floor(lo0 / s) <= 5) ?? TICK_STEPS.at(-1);
  const lo = Math.floor(lo0 / step) * step;
  let hi = Math.ceil(hi0 / step) * step;
  if (hi === lo) hi = lo + step;
  const ticks = [];
  for (let i = 0; lo + i * step <= hi + 1e-9; i += 1) ticks.push(Math.round((lo + i * step) * 100) / 100);
  return { domain: [lo, hi], ticks };
}

/**
 * SVG paths for a small sparkline in a width × height box: the line breaks at gaps
 * (null) instead of drawing through them, and each run of two or more points gets a
 * filled area down to zero. null with fewer than two numbers.
 */
export function sparkPaths(values, width, height, pad = 3) {
  const n = values.length;
  const nums = values.filter((v) => v != null);
  if (n < 2 || nums.length < 2) return null;
  const lo = Math.min(0, ...nums);
  const hi = Math.max(0, ...nums);
  const span = hi - lo || 1;
  const x = (i) => pad + (i / (n - 1)) * (width - 2 * pad);
  const y = (v) => pad + (1 - (v - lo) / span) * (height - 2 * pad);
  const f = (v) => v.toFixed(1);
  const segments = [];
  let cur = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else {
      cur.push([x(i), y(v)]);
    }
  });
  if (cur.length) segments.push(cur);
  const line = segments.map((s) => s.map(([px, py], k) => `${k ? "L" : "M"}${f(px)} ${f(py)}`).join(" ")).join(" ");
  const base = f(y(0));
  const area = segments
    .filter((s) => s.length > 1)
    .map((s) => `M${f(s[0][0])} ${base} ${s.map(([px, py]) => `L${f(px)} ${f(py)}`).join(" ")} L${f(s.at(-1)[0])} ${base} Z`)
    .join(" ");
  return { line, area };
}

/** Hover card for a big number: how it is measured (the card's help sentences). */
export function statHover(card) {
  return { title: card.title, items: [["Change over 12 months", card.yearText]], lines: [], note: card.help };
}

/** Hover card for an Other official measures row: publisher, value, distance from prices overall, blurb. */
export function measureHover(row) {
  return {
    title: row.name,
    publisher: row.publisher,
    items: [["Published by", row.publisherLabel], ["Change over 12 months", row.valueText]],
    lines: row.vsText ? [row.vsText] : [],
    note: row.note,
  };
}

/** Hover card for a trend point. A gap month says "Not published". */
export function trendHover(point) {
  return { title: point.long, items: [["Change over 12 months", point.valueText]], lines: [], note: "" };
}
