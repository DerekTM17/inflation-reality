// The .xlsx download as plain data: one { name, rows, cols } per sheet, rows as
// arrays of cells. Pure, so the contents are unit-tested without a browser;
// toBook() turns the sheets into a workbook with whichever xlsx module it is given.
//
// Null, never zero: a missing amount or rate writes "" (a blank cell), never 0.
// Standalone rates are rounded with round1 to match the screen; the estimate
// sheet's math columns keep full precision so they reproduce the panel.

import { computeResult } from "../calculator/model.js";
import { monthLabel, round1 } from "../calculator/format.js";
import { METHOD, CAVEATS, NO_SERIES_LINES, SOURCE_LINKS, seriesGroups } from "./sources.js";
import { pctChange } from "./prices.js";
import { trendMonth } from "./national.js";

export const SHEET_NAMES = ["Your estimate", "Price changes", "Average prices", "Monthly trend", "How it works"];

export const ESTIMATE_HEADER = [
  "Line", "Monthly amount ($)", "Yearly amount ($)", "Price change over 12 months (%)",
  "Cost a year ago ($)", "Extra this year ($)", "Extra shown on the site ($)", "Note",
];

const r2 = (n) => (n == null ? "" : Math.round(n * 100) / 100);
/** A standalone rate as the screen shows it: one decimal, blank when missing. */
const rate1 = (n) => round1(n) ?? "";

/** "inflation-reality-2026-08.xlsx" ("-data" when the month is missing). */
export function workbookFileName(data) {
  const month = /^\d{4}-\d{2}$/.test(data.referenceMonth ?? "") ? data.referenceMonth : "data";
  return `inflation-reality-${month}.xlsx`;
}

/** The panel's lines with the math behind them; "Extra shown" is the rounded panel amount. */
export function estimateRows(estimate, data) {
  const { mode, rows, model } = estimate;
  const out = [
    ["Inflation Reality: your estimate"],
    ["Prices for", monthLabel(data.referenceMonth)],
    ["What this shows", mode === "personal"
      ? "Your answers, saved in this browser"
      : "The average U.S. household (no answers are saved in this browser)"],
    [],
    [model.title],
    [model.answer],
  ];
  for (const s of [model.ratesLine, model.verdict, model.basis]) if (s) out.push([s]);
  if (rows == null) return out;

  const result = computeResult(rows);
  const shown = new Map([...model.main, ...(model.rest ? [model.rest] : [])].map((r) => [r.id, r.dollars]));
  out.push([], ESTIMATE_HEADER);
  for (const l of result.lines) {
    out.push([l.label, r2(l.monthly), r2(l.annual), l.rate ?? "", r2(l.yearAgo), r2(l.extra), shown.get(l.id) ?? "", l.note ?? ""]);
  }
  for (const x of result.excluded) {
    out.push([
      x.label, r2(x.monthly), r2(12 * x.monthly), "", "", "", "",
      x.missing === "renewal" ? "Not counted until you add your renewal increase" : "Not counted: no recent price data",
    ]);
  }
  const monthly = result.lines.reduce((s, l) => s + l.monthly, 0);
  // The panel has no total when every amount is $0; that extra is a real 0, not a
  // missing value, so it is written as 0. Otherwise a missing total stays blank.
  const shownTotal = model.total ?? (result.totalAnnual === 0 ? 0 : "");
  out.push(
    [],
    ["Total", r2(monthly), r2(result.totalAnnual), result.rate ?? "", r2(result.totalYearAgo), r2(result.totalExtra), shownTotal, ""],
    [],
    ["Cost a year ago = yearly amount / (1 + price change / 100)"],
    ["Extra this year = yearly amount minus cost a year ago"],
    ["The site rounds the total to the nearest $50 and each line to the nearest $10, so the rounded lines add up to the rounded total."],
  );
  return out;
}

function priceChangeRows(catalog, data) {
  const out = [
    ["Every series on the site"],
    ["FRED series can be checked at fred.stlouisfed.org. BLS series can be checked at data.bls.gov."],
    [],
    ["Group", "Name", "Series", "Source", "Change over 12 months (%)", "Link"],
  ];
  for (const g of seriesGroups(catalog, data)) {
    for (const r of g.rows) out.push([g.title, r.name, r.seriesId, r.source, rate1(r.yoy), r.url]);
  }
  out.push([], ["Lines without their own series"], ["Line", "How its rate is set"]);
  for (const l of NO_SERIES_LINES) out.push([l.name, l.how]);
  return out;
}

function averagePriceRows(data) {
  const out = [
    [`Average prices, ${data.referenceMonthLabel} and a year earlier`],
    [],
    ["Group", "Item", "Unit", "Series", "Price now ($)", "Price a year ago ($)", "Change (%)", "Link"],
  ];
  for (const p of data.avgPrices) {
    const c = pctChange(p.current, p.yearAgo);
    out.push([p.category, p.item, p.unit, p.seriesId, p.current ?? "", p.yearAgo ?? "", rate1(c), `https://fred.stlouisfed.org/series/${p.seriesId}`]);
  }
  out.push(
    [],
    ["Weekly fuel prices, Energy Information Administration"],
    ["Item", "Unit", "Series", "Week ending", "Price now ($)", "Price a year ago ($)", "Change (%)", "Link"],
  );
  for (const w of data.weeklyPrices) {
    const c = pctChange(w.current, w.yearAgo);
    out.push([w.label, w.unit, w.seriesId, w.asOfLabel, w.current ?? "", w.yearAgo ?? "", rate1(c), `https://fred.stlouisfed.org/series/${w.seriesId}`]);
  }
  return out;
}

function trendRows(data) {
  const out = [["Prices overall: change over 12 months, by month"], [], ["Month", "Change over 12 months (%)", "Note"]];
  for (const d of data.trend) out.push([trendMonth(d.month).long, rate1(d.headline), d.headline == null ? "Not published" : ""]);
  return out;
}

function howRows() {
  const out = [["How the estimate is worked out"], []];
  for (const s of METHOD) {
    out.push([s.heading]);
    for (const p of s.paragraphs) out.push([p]);
    out.push([]);
  }
  out.push(["Things to keep in mind"]);
  for (const c of CAVEATS) out.push([c]);
  out.push([], ["Sources"]);
  for (const l of SOURCE_LINKS) out.push([l.text, l.url]);
  return out;
}

/** Every sheet, in SHEET_NAMES order. estimate = estimateFor() / savedEstimate() output. */
export function buildWorkbook({ catalog, data, estimate }) {
  return [
    { name: SHEET_NAMES[0], rows: estimateRows(estimate, data), cols: [28, 16, 16, 18, 16, 16, 18, 44] },
    { name: SHEET_NAMES[1], rows: priceChangeRows(catalog, data), cols: [24, 48, 24, 8, 16, 52] },
    { name: SHEET_NAMES[2], rows: averagePriceRows(data), cols: [14, 26, 10, 18, 14, 16, 12, 48] },
    { name: SHEET_NAMES[3], rows: trendRows(data), cols: [18, 24, 16] },
    { name: SHEET_NAMES[4], rows: howRows(), cols: [110, 60] },
  ];
}

/** Sheets → workbook object with the given xlsx module (the page loads it on demand). */
export function toBook(XLSX, sheets) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    ws["!cols"] = s.cols.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  return wb;
}
