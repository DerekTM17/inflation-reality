// Family cards, the spending mix and the hover-card text for Your costs, as plain data
// (spec "Revision 4": Families, Revision 4 layout, Hover detail cards). Pure, so "cards
// add up to the total" and "shares add up to 100" are unit-tested and the components
// only lay this out.

import { FAMILIES, LINES, BASKET_ROWS, OWNER_YARDSTICK } from "./config.js";
import { computeResult, defaultAmount, effectiveChoices } from "./model.js";
import { formatDollars, formatRate, signedDollars, monthLabel } from "./format.js";

const NATIONAL_NOTE = "The government's main measure of prices for everything people buy.";

/** Family id for a row id. Average rows use basket ids, personal rows line ids. */
export function familyOf(id, mode) {
  const table = mode === "average" ? BASKET_ROWS : LINES;
  return Object.hasOwn(table, id) ? table[id].family : "rest";
}

/** The row's one plain sentence on what its price covers ("" when unknown). */
export function aboutOf(id, mode) {
  const table = mode === "average" ? BASKET_ROWS : LINES;
  return Object.hasOwn(table, id) ? table[id].about : "";
}

/** Slider range end: max(500, three times the starting amount rounded up to $100). */
export function sliderMax(start) {
  return Math.max(500, Math.ceil((3 * start) / 100) * 100);
}

/** Where the thumb sits. An amount above the max pins it at the end; the box keeps the amount. */
export function sliderValue(monthly, max) {
  return Math.min(Math.max(0, monthly), max);
}

/**
 * Whole percents that add to exactly 100 (largest remainder, ties to the earlier entry).
 * Values of 0 or less get 0; all zero gives all 0.
 */
export function mixShares(values) {
  const pos = values.map((v) => (v > 0 ? v : 0));
  const total = pos.reduce((s, v) => s + v, 0);
  if (total === 0) return values.map(() => 0);
  const raw = pos.map((v) => (v / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((s, v) => s + v, 0);
  const order = raw
    .map((_, i) => i)
    .filter((i) => pos[i] > 0)
    .sort((a, b) => (raw[b] - out[b]) - (raw[a] - out[a]) || a - b);
  for (let k = 0; left > 0; k += 1, left -= 1) out[order[k % order.length]] += 1;
  return out;
}

/** "41%", or "under 1%" when a family with spending rounds to 0. */
export function shareText(share, fraction) {
  return share === 0 && fraction > 0 ? "under 1%" : `${share}%`;
}

/**
 * The cards in FAMILIES order, each with its rows in the order personalRows() or
 * averageRows() gave them, plus the mix bar's slices.
 * - A row's dollars are its allocated, rounded dollars from the panel model, so a
 *   card's heading (the sum of its rows) adds up to the total.
 * - Rows off the total (an empty renewal box, no data) keep `dollars: null`, stay out
 *   of the family's rate and share, and an empty renewal row says so.
 * - Shares count only lines in the result, as whole percents adding to 100; a card's
 *   "You pay now" (`monthly`) counts every row, including an unpriced renewal line.
 * @param {{ mode: "average"|"personal", rows: object[]|null, model: object, answers: object }} p
 */
export function familyCards({ mode, rows, model, answers }) {
  if (rows == null) return { cards: [], mix: [] };
  const personal = mode === "personal";
  const shown = new Map([...model.main, ...(model.rest ? [model.rest] : [])].map((r) => [r.id, r]));
  const math = new Map(computeResult(rows).lines.map((l) => [l.id, l]));
  const choices = effectiveChoices(answers);

  const cardRows = rows.map((r) => {
    const s = shown.get(r.id) ?? null;
    const l = math.get(r.id) ?? null;
    const renewalMissing = r.missing === "renewal";
    const max = personal ? sliderMax(defaultAmount(r.id, choices)) : null;
    return {
      id: r.id,
      family: familyOf(r.id, mode),
      label: r.label,
      note: r.note ?? "",
      monthly: r.monthly,
      rate: r.rate,
      rateText: formatRate(r.rate, { fixed: r.id === "mortgage" }),
      inResult: l != null,
      yearAgo: l ? l.yearAgo : null,
      dollars: s ? s.dollars : null,
      addsText: s ? s.dollarText : "",
      addsYearText: renewalMissing ? "Add your renewal increase" : s ? `${s.dollarText} a year` : "",
      renewal: personal && Object.hasOwn(LINES, r.id) && LINES[r.id].renewal === true,
      renewalMissing,
      about: aboutOf(r.id, mode),
      max,
      sliderValue: max == null ? null : sliderValue(r.monthly, max),
    };
  });

  const cards = [];
  for (const f of FAMILIES) {
    const list = cardRows.filter((r) => r.family === f.id);
    if (list.length === 0) continue;
    const inResult = list.filter((r) => r.inResult);
    const counted = list.filter((r) => r.dollars != null);
    const annual = inResult.reduce((s, r) => s + 12 * r.monthly, 0);
    const yearAgo = inResult.reduce((s, r) => s + r.yearAgo, 0);
    const rate = yearAgo > 0 ? (annual / yearAgo - 1) * 100 : null;
    const dollars = counted.length > 0 ? counted.reduce((s, r) => s + r.dollars, 0) : null;
    let biggest = null;
    if (counted.length > 1) {
      const top = counted.reduce((b, r) => (Math.abs(r.dollars) > Math.abs(b.dollars) ? r : b));
      biggest = `Biggest mover: ${top.label}, ${signedDollars(top.dollars)} a year`;
    }
    cards.push({
      id: f.id,
      label: f.label,
      token: f.token,
      rows: list,
      monthly: list.reduce((s, r) => s + r.monthly, 0), // "You pay now": every row, priced or not
      pricedMonthly: inResult.reduce((s, r) => s + r.monthly, 0), // shares and the mix bar
      rate,
      rateText: formatRate(rate),
      dollars,
      dollarText: dollars == null ? "" : `${signedDollars(dollars)} a year`,
      biggest,
      renewalMissing: list.some((r) => r.renewalMissing),
      share: null,
      fraction: 0,
    });
  }

  const spend = cards.map((c) => Math.max(0, c.pricedMonthly));
  const total = spend.reduce((s, v) => s + v, 0);
  const shares = mixShares(spend);
  cards.forEach((c, i) => {
    c.share = total > 0 ? shares[i] : null;
    c.fraction = total > 0 ? spend[i] / total : 0;
  });
  const mix = cards
    .filter((c) => c.fraction > 0)
    .map((c) => ({ id: c.id, label: c.label, share: c.share, fraction: c.fraction, text: `${c.label} ${shareText(c.share, c.fraction)}` }));
  return { cards, mix };
}

/**
 * Hover card for an amount row (spec "Hover detail cards"). "Adds this year" is the
 * row's allocated dollars, matching the row; "Same things a year ago" is the yearly
 * amount minus that figure. Average rows say "Average spending now", never "You".
 */
export function rowHover(row, referenceMonth, personal) {
  const since = monthLabel(referenceMonth, -1);
  const items = [
    [since ? `Price change since ${since}` : "Price change", row.rateText || "Not available"],
    [personal ? "You pay now" : "Average spending now", `${formatDollars(row.monthly)} a month, ${formatDollars(12 * row.monthly)} a year`],
  ];
  if (row.dollars != null) {
    items.push(["Adds this year", row.addsText]);
    items.push(["Same things a year ago", `${formatDollars(12 * row.monthly - row.dollars)} a year`]);
  } else if (row.renewalMissing) {
    items.push(["Adds this year", "Add your renewal increase"]);
  }
  return { title: row.label, family: row.family, items, lines: [], note: row.about };
}

/** Hover card for a card heading, mix slice or legend item. Never says "Prices overall". */
export function familyHover(card, personal) {
  const adds = card.dollars != null ? signedDollars(card.dollars)
    : card.renewalMissing ? "Add your renewal increase" : "Not available";
  return {
    title: card.label,
    family: card.id,
    items: [
      [personal ? "Share of your spending" : "Share of spending", card.share == null ? "Not available" : shareText(card.share, card.fraction)],
      [personal ? "You pay now" : "Average spending now", `${formatDollars(card.monthly)} a month`],
      ["Price change", card.rateText || "Not available"],
      ["Adds this year", adds],
    ],
    lines: card.biggest ? [card.biggest] : [],
    note: "",
  };
}

/** Hover card for the Your costs bar ("you") or the National / Outside housing bar ("us"). */
export function compareHover(model, which) {
  if (!model.compare) return null;
  if (which === "you") {
    return {
      title: "Your costs",
      items: [["Your rate", model.compare.you.text]],
      lines: [],
      note: "Each amount's price change, weighted by what you spend on it.",
    };
  }
  const owner = model.compare.usLabel === "Outside housing";
  return {
    title: model.compare.usLabel,
    items: [[owner ? "Prices other than housing" : "Prices overall", model.compare.us.text]],
    lines: [],
    note: owner ? OWNER_YARDSTICK : NATIONAL_NOTE,
  };
}
