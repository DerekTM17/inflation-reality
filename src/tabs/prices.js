// The Price check tab as plain data: average prices, weekly fuel prices, and the
// biggest price changes. Pure, so the view only lays it out.

import { formatRate, barGeometry } from "../calculator/format.js";
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

export function unitWords(unit) {
  return UNIT_WORDS[unit] ?? String(unit ?? "").replace(/^\//, "a ");
}

/** Percent change, or null when either price is missing or the year-ago price is 0. */
export function pctChange(current, yearAgo) {
  if (current == null || yearAgo == null || yearAgo === 0) return null;
  return (current / yearAgo - 1) * 100;
}

/** "$2.27"; prices under $1 keep a third decimal ("$0.183") so small changes still show. */
export function formatPrice(n) {
  if (n == null) return "";
  return `$${n.toFixed(Math.abs(n) < 1 ? 3 : 2)}`;
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
      nowText: p.current == null ? "Not available" : formatPrice(p.current),
      yearAgoText: p.yearAgo == null ? "Not available" : formatPrice(p.yearAgo),
      change,
      changeText: change == null ? "" : formatRate(change),
    });
  }
  return groups;
}

/**
 * The `count` items whose prices moved the most over the year, up or down, largest
 * first. Items without both prices are left out. Rows have the BarList shape.
 */
export function movers(data, count = 10) {
  const list = data.avgPrices
    .map((p) => ({ key: p.seriesId, name: p.item, value: pctChange(p.current, p.yearAgo) }))
    .filter((r) => r.value != null)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.name.localeCompare(b.name))
    .slice(0, count);
  const bars = barGeometry(list.map((r) => r.value));
  return list.map((r, i) => ({ ...r, note: "", valueText: formatRate(r.value), bar: bars[i] }));
}

/** Weekly EIA fuel prices next to the BLS monthly average for the same fuel. */
export function fuelRows(data) {
  return data.weeklyPrices.map((w) => {
    const unit = unitWords(w.unit);
    const change = pctChange(w.current, w.yearAgo);
    const bls = data.avgPrices.find((p) => p.seriesId === w.blsSeriesId);
    let yearAgoText = "";
    if (w.yearAgo != null) {
      yearAgoText = `A year earlier: ${formatPrice(w.yearAgo)}`;
      if (change != null) yearAgoText += ` (${formatRate(change)})`;
      yearAgoText += ".";
    }
    return {
      key: w.key,
      label: w.label,
      nowText: w.current == null ? "Not available" : `${formatPrice(w.current)} ${unit}`,
      weekText: w.current != null && w.asOfLabel ? `Week ending ${w.asOfLabel}.` : "",
      yearAgoText,
      monthlyText: bls?.current == null || !data.referenceMonthLabel
        ? ""
        : `Government monthly average for ${data.referenceMonthLabel}: ${formatPrice(bls.current)} ${unit}.`,
      blurb: w.blurb,
    };
  });
}

/** Stale and gap notes for the Price check fine print. */
export function priceNotes(data) {
  const stale = [...new Set([...staleLabels(data.avgPrices), ...staleLabels(data.weeklyPrices)])];
  return [staleNote(stale, "price"), gapNote(data)].filter(Boolean);
}
