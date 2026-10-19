// The Price check tab as plain data: average prices, weekly fuel prices, and the
// biggest price changes. Pure, so the view only lays it out.

import { formatRate, barGeometry } from "../calculator/format.js";
import { FAMILIES } from "../calculator/config.js";
import { staleLabels } from "../data/merge.js";
import { staleNote, gapNote } from "./notes.js";

/** Catalog units in words: "$2.27 a dozen", not "$2.27/doz". */
export const UNIT_WORDS = {
  "/doz": "a dozen",
  "/lb": "a pound",
  "/gal": "a gallon",
  "/kWh": "a kilowatt-hour",
  "/therm": "a therm",
  "/16oz": "for 16 ounces",
};

/** Which kind of spending each average-price item belongs to; anything not listed is Food. */
export const PRICE_FAMILY = {
  APU000074714: "around", // gasoline
  APU000074717: "around", // diesel
  APU000072610: "util", // electricity
  APU000072620: "util", // natural gas
};
const FAMILY_LABEL = Object.fromEntries(FAMILIES.map((f) => [f.id, f.label]));

export function priceFamily(seriesId) {
  return PRICE_FAMILY[seriesId] ?? "food";
}

export function unitWords(unit) {
  return UNIT_WORDS[unit] ?? String(unit ?? "").replace(/^\//, "a ");
}

/** Percent change, or null when either price is missing or the year-ago price is 0. */
export function pctChange(current, yearAgo) {
  if (current == null || yearAgo == null || yearAgo === 0) return null;
  return (current / yearAgo - 1) * 100;
}

/** "$2.27", cents for every unit; only a kilowatt-hour keeps a third decimal ("$0.196"). */
export function formatPrice(n, unit) {
  if (n == null) return "";
  return `$${n.toFixed(unit === "/kWh" ? 3 : 2)}`;
}

/** Average prices grouped by catalog category, in catalog order. */
export function avgPriceGroups(data) {
  const groups = [];
  for (const p of data.avgPrices) {
    let g = groups.find((x) => x.category === p.category);
    if (!g) groups.push((g = { category: p.category, items: [] }));
    const change = pctChange(p.current, p.yearAgo);
    g.items.push({
      seriesId: p.seriesId,
      item: p.item,
      unitText: unitWords(p.unit),
      nowText: p.current == null ? "Not available" : formatPrice(p.current, p.unit),
      yearAgoText: p.yearAgo == null ? "Not available" : formatPrice(p.yearAgo, p.unit),
      change,
      changeText: change == null ? "" : formatRate(change),
    });
  }
  return groups;
}

/**
 * The `count` items whose prices moved the most over the year, up or down, largest
 * first. Items without both prices are left out. Rows have the BarList shape plus the
 * item's family and both prices with units, for its hover card.
 */
export function movers(data, count = 10) {
  const list = data.avgPrices
    .map((p) => ({ p, key: p.seriesId, name: p.item, value: pctChange(p.current, p.yearAgo) }))
    .filter((r) => r.value != null)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.name.localeCompare(b.name))
    .slice(0, count);
  const bars = barGeometry(list.map((r) => r.value));
  return list.map(({ p, ...r }, i) => {
    const family = priceFamily(p.seriesId);
    return {
      ...r,
      note: "",
      valueText: formatRate(r.value),
      bar: bars[i],
      family,
      familyLabel: FAMILY_LABEL[family],
      nowText: `${formatPrice(p.current, p.unit)} ${unitWords(p.unit)}`,
      yearAgoText: `${formatPrice(p.yearAgo, p.unit)} ${unitWords(p.unit)}`,
    };
  });
}

/** Hover card for a Biggest price changes row: item, family, both prices with units, the change. */
export function moverHover(row) {
  return {
    title: row.name,
    family: row.family,
    items: [["Kind of spending", row.familyLabel], ["Price now", row.nowText], ["A year ago", row.yearAgoText], ["Change", row.valueText]],
    lines: [],
    note: "",
  };
}

/** Weekly EIA fuel prices next to the BLS monthly average for the same fuel. */
export function fuelRows(data) {
  return data.weeklyPrices.map((w) => {
    const unit = unitWords(w.unit);
    const change = pctChange(w.current, w.yearAgo);
    const bls = data.avgPrices.find((p) => p.seriesId === w.blsSeriesId);
    let yearAgoText = "";
    if (w.yearAgo != null) {
      yearAgoText = `A year earlier: ${formatPrice(w.yearAgo, w.unit)}`;
      if (change != null) yearAgoText += ` (${formatRate(change)})`;
      yearAgoText += ".";
    }
    return {
      key: w.key,
      label: w.label,
      nowText: w.current == null ? "Not available" : `${formatPrice(w.current, w.unit)} ${unit}`,
      weekText: w.current != null && w.asOfLabel ? `Week ending ${w.asOfLabel}.` : "",
      yearAgoText,
      monthlyText: bls?.current == null || !data.referenceMonthLabel
        ? ""
        : `Government monthly average for ${data.referenceMonthLabel}: ${formatPrice(bls.current, bls.unit)} ${unit}.`,
      blurb: w.blurb,
    };
  });
}

/** Stale and gap notes for the Price check fine print. */
export function priceNotes(data) {
  const stale = [...new Set([...staleLabels(data.avgPrices), ...staleLabels(data.weeklyPrices)])];
  return [staleNote(stale, "price"), gapNote(data)].filter(Boolean);
}
