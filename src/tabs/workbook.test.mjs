import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import * as catalog from "../data/catalog.js";
import { buildWorkbook, toBook, workbookFileName, estimateRows, SHEET_NAMES, ESTIMATE_HEADER } from "./workbook.js";
import { estimateFor } from "./estimate.js";
import { emptyAnswers } from "../calculator/model.js";
import { viewData } from "./testdata.mjs";

const data = viewData();
const mortgage = estimateFor({ ...emptyAnswers(), answered: { home: "mortgage" } }, data);

/** Line rows of the estimate sheet: between the header and the blank row before Total. */
function lineRows(rows) {
  const start = rows.findIndex((r) => r[0] === "Line") + 1;
  const end = rows.findIndex((r, i) => i > start && r.length === 0);
  return rows.slice(start, end);
}

/** True when n has at most one decimal place. */
const oneDecimal = (n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-9;

test("file name carries the price month", () => {
  assert.equal(workbookFileName(data), "inflation-reality-2026-08.xlsx");
  assert.equal(workbookFileName(viewData({ referenceMonth: "" })), "inflation-reality-data.xlsx");
});

test("estimate sheet: the panel's lines, shown dollars add up to the panel's total", () => {
  const rows = estimateRows(mortgage, data);
  assert.deepEqual(rows.find((r) => r[0] === "Line"), ESTIMATE_HEADER);
  assert.ok(rows.some((r) => r[0] === mortgage.model.answer));
  const lines = lineRows(rows).filter((r) => r[6] !== "");
  assert.equal(lines.reduce((s, r) => s + r[6], 0), mortgage.model.total);
  const pay = lines.find((r) => r[0] === "Mortgage payment");
  assert.equal(pay[3], 0);
  assert.equal(pay[5], 0);
  const total = rows.find((r) => r[0] === "Total");
  assert.equal(total[6], mortgage.model.total);
});

test("estimate sheet: a counted line with no shown amount leaves the cell blank, never 0", () => {
  const model = { ...mortgage.model, main: mortgage.model.main.filter((r) => r.id !== "groceries"), rest: null };
  const rows = lineRows(estimateRows({ ...mortgage, model }, data));
  const groceries = rows.find((r) => r[0] === "Groceries");
  assert.equal(groceries[3], 2.2);
  assert.equal(groceries[6], "");
  assert.equal(rows.find((r) => r[0] === "Mortgage payment")[6], 0);
});

test("estimate sheet: the math columns keep their precision", () => {
  const lines = lineRows(estimateRows(mortgage, data)).filter((r) => typeof r[3] === "number");
  assert.ok(lines.some((r) => !oneDecimal(r[3])), "at least one rate keeps more than one decimal");
});

test("estimate sheet: the yardstick is never a line; unfilled renewals say why they are left out", () => {
  const rows = estimateRows(mortgage, data);
  assert.ok(!rows.some((r) => r[0] === "Prices other than housing"));
  const own = estimateFor({ ...emptyAnswers(), answered: { home: "mortgage", health: "own" } }, data);
  const ins = estimateRows(own, data).find((r) => r[0] === "Health insurance");
  assert.equal(ins[7], "Not counted until you add your renewal increase");
  assert.equal(ins[3], "");
});

test("estimate sheet: all amounts 0 still writes a sheet with a 0 total", () => {
  const zero = estimateFor({
    ...emptyAnswers(),
    answered: { home: "rent" },
    amounts: Object.fromEntries(mortgage.rows.map((r) => [r.id, 0]).concat([["rent", 0], ["rest", 0], ["health", 0]])),
  }, data);
  const rows = estimateRows(zero, data);
  assert.ok(rows.some((r) => r[0] === "Enter your monthly amounts to see your estimate."));
  const total = rows.find((r) => r[0] === "Total");
  assert.equal(total[6], 0);
});

test("estimate sheet: no usable basket writes the message and no line table", () => {
  const bare = viewData({ basket: { stale: true } });
  const rows = estimateRows(estimateFor(emptyAnswers(), bare), bare);
  assert.ok(rows.some((r) => r[0] === "Average household figures are not available right now."));
  assert.ok(!rows.some((r) => r[0] === "Line"));
});

test("every sheet is present, and no cell breaks the voice guide or says NaN", () => {
  const sheets = buildWorkbook({ catalog, data, estimate: mortgage });
  assert.deepEqual(sheets.map((s) => s.name), SHEET_NAMES);
  for (const s of sheets) {
    for (const row of s.rows) {
      for (const cell of row) {
        if (typeof cell === "number") assert.ok(Number.isFinite(cell), `${s.name}: ${cell}`);
        else for (const banned of ["—", "·", "→", "!", "NaN", "undefined"]) {
          assert.ok(!String(cell).includes(banned), `${s.name}: ${JSON.stringify(banned)} in ${cell}`);
        }
      }
    }
  }
});

test("standalone rates are rounded to one decimal, as on screen; missing ones stay blank", () => {
  const sheets = buildWorkbook({ catalog, data, estimate: mortgage });
  const rateCells = (name, col) => {
    const rows = sheets.find((s) => s.name === name).rows;
    const head = rows.findIndex((r) => r[col] != null && /%/.test(String(r[col])));
    return rows.slice(head + 1).map((r) => r[col]).filter((c) => c !== undefined);
  };
  const series = rateCells("Price changes", 4);
  assert.ok(series.some((c) => typeof c === "number"));
  for (const c of series) assert.ok(c === "" || (typeof c === "number" && oneDecimal(c)), `series rate ${c}`);
  for (const c of rateCells("Average prices", 6)) {
    assert.ok(c === "" || typeof c !== "number" || oneDecimal(c), `price change ${c}`);
  }
});

test("round trip through the real xlsx package", () => {
  const book = toBook(XLSX, buildWorkbook({ catalog, data, estimate: mortgage }));
  const back = XLSX.read(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  assert.deepEqual(back.SheetNames, SHEET_NAMES);
  const prices = XLSX.utils.sheet_to_json(back.Sheets["Price changes"], { header: 1 });
  assert.ok(prices.some((r) => r[2] === "CUUR0000SA0L2" && r[0] === "What we compare you with"));
  assert.ok(!prices.some((r) => r[2] === "CUUR0000SA0L2" && r[0] === "Lines on Your costs"));
  const trend = XLSX.utils.sheet_to_json(back.Sheets["Monthly trend"], { header: 1 });
  assert.ok(trend.some((r) => r[0] === "October 2025" && r[2] === "Not published"));
});

test("How it works lists each line's price data, formula and starting amount", () => {
  const how = buildWorkbook({ catalog, data, estimate: mortgage }).find((s) => s.name === "How it works").rows;
  const at = how.findIndex((r) => r[0] === "Car insurance");
  assert.ok(at > 0);
  assert.match(how[at + 1][0], /^Price data: The BLS price index for motor vehicle insurance/);
  assert.equal(how[at + 1][1], "CUUR0000SETE (BLS)");
  assert.match(how[at + 2][0], /^How the rate is set: /);
  assert.match(how[at + 3][0], /^Starting amount: \$160 a month/);
  assert.ok(how.some((r) => /^How the rate is set: The increase you type in\. Through work, it starts at 6%/.test(r[0] ?? "")));
});
