import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthName, trendMonth, measureRows, nationalModel, CARDS, MEASURES, PUBLISHERS, MEASURE_PUBLISHER,
  pointsVsHeadline, evenTicks, sparkPaths, statHover, measureHover, trendHover,
} from "./national.js";
import { viewData } from "./testdata.mjs";

test("monthName wraps across the year and handles a missing month", () => {
  assert.equal(monthName("2026-08"), "August");
  assert.equal(monthName("2026-08", -1), "July");
  assert.equal(monthName("2026-01", -1), "December");
  assert.equal(monthName(null), "");
});

test("trendMonth turns 'Sep 25' into words that can't be read as a date", () => {
  assert.deepEqual(trendMonth("Sep 25"), { short: "Sep 2025", long: "September 2025" });
  assert.deepEqual(trendMonth("Jan 26"), { short: "Jan 2026", long: "January 2026" });
  assert.deepEqual(trendMonth("2026-01"), { short: "2026-01", long: "2026-01" });
});

test("cards: 12-month change, one-month change and its yearly pace, both directions", () => {
  const m = nationalModel(viewData());
  assert.equal(m.lede, "Prices overall rose 3.4% in the year to August 2026. These are the official numbers for the whole country.");
  assert.equal(m.headline.title, "Prices overall");
  assert.equal(m.headline.yearText, "+3.4%");
  assert.equal(m.headline.yearSentence, "Change over the 12 months to August 2026.");
  assert.equal(m.headline.monthSentence, "From July to August, prices rose 0.4%. At that pace for a full year, they would rise 4.9%.");
  assert.equal(m.core.yearText, "+2.4%");
  assert.equal(m.core.monthSentence, "From July to August, prices fell 0.1%. At that pace for a full year, they would fall 1.2%.");
});

test("cards: a missing number says so instead of showing 0", () => {
  const m = nationalModel(viewData({ headline: { yoy: null, mom: null, momAnnualized: null } }));
  assert.equal(m.headline.yearText, "Not available");
  assert.equal(m.headline.yearSentence, "This figure is not available right now.");
  assert.equal(m.headline.monthSentence, null);
  assert.equal(m.lede, "These are the official inflation numbers for the whole country.");
  assert.ok(!m.measures.some((r) => r.key === "headline"));
});

test("cards: no reference month never produces 'From  to ,'", () => {
  const m = nationalModel(viewData({ referenceMonth: "" }));
  assert.equal(m.headline.monthSentence, null);
  assert.equal(m.headline.yearSentence, "Change over the last 12 months.");
});

test("measures: highest first, missing ones left out, negatives extend left of zero", () => {
  const rows = measureRows(viewData());
  assert.deepEqual(rows.map((r) => r.key), ["exShelter", "headline", "corePce", "medianCpi", "core", "trimmedCpi"]);
  assert.equal(rows[0].name, "Prices other than housing");
  assert.equal(rows.at(-1).valueText, "−0.4%");
  // span = 3.6 + 0.4, zero sits at 10%: the negative bar ends there, positives start there.
  assert.equal(rows.at(-1).bar.left, 0);
  assert.ok(Math.abs(rows.at(-1).bar.width - 10) < 1e-9);
  assert.ok(Math.abs(rows[0].bar.left - 10) < 1e-9);
  for (const r of rows) assert.ok(r.note && r.note.length > 0, `${r.key} has an explanation`);
});

test("measures: none available gives an empty list, not NaN bars", () => {
  const data = viewData({
    headline: { yoy: null }, core: { yoy: null }, altMeasures: {},
    lines: { exShelter: { yoy: null } },
  });
  assert.deepEqual(measureRows(data), []);
});

test("trend: readable months, gaps named once in a note", () => {
  const m = nationalModel(viewData());
  assert.equal(m.trend.length, 5);
  assert.deepEqual(m.trend[0], { short: "Sep 2025", long: "September 2025", value: 3.0, valueText: "+3.0%" });
  assert.equal(m.trend[1].value, null);
  assert.equal(m.trend[1].valueText, "Not published");
  assert.equal(m.trendNote, "No figures were published for October 2025 and November 2025, so the line breaks there.");
  assert.equal(nationalModel(viewData({ trend: [{ month: "Sep 25", headline: 3 }] })).trendNote, null);
});

test("notes: stale measures by name, plus the yoyGap note", () => {
  assert.deepEqual(nationalModel(viewData()).notes, ["Using the last known value for Median CPI."]);
  const m = nationalModel(viewData({
    headline: { yoy: 3.4, mom: 0.4, momAnnualized: 4.9, stale: true },
    yoyGap: { latestMonthLabel: "September 2026", missingMonthLabel: "September 2025" },
  }));
  assert.equal(m.notes[0], "Using the last known value for CPI for all items and Median CPI.");
  assert.match(m.notes[1], /^The newest price data is for September 2026/);
});

test("measures: each row names its publisher and how far it is from prices overall", () => {
  const rows = measureRows(viewData());
  assert.deepEqual(rows.map((r) => r.publisher), ["labor", "labor", "commerce", "cleveland", "labor", "cleveland"]);
  assert.equal(rows[0].publisherLabel, "Bureau of Labor Statistics");
  assert.equal(rows.find((r) => r.key === "corePce").publisherLabel, "Commerce Department");
  assert.deepEqual(rows.map((r) => r.vsText), [
    "0.2 points above prices overall", "", "0.1 points below prices overall", "0.8 points below prices overall",
    "1.0 points below prices overall", "3.8 points below prices overall",
  ]);
  assert.equal(pointsVsHeadline(3.4, 3.4), "Same as prices overall");
  assert.equal(pointsVsHeadline(null, 3.4), "");
  assert.equal(pointsVsHeadline(3.0, null), "");
  assert.deepEqual(MEASURE_PUBLISHER, {
    headline: "labor", core: "labor", exShelter: "labor", corePce: "commerce",
    medianCpi: "cleveland", trimmedCpi: "cleveland", stickyCpi: "atlanta", trimmedPce: "dallas",
  });
  assert.deepEqual(PUBLISHERS.map((p) => p.token), ["--p-labor", "--p-commerce", "--p-cleveland", "--p-atlanta", "--p-dallas"]);
});

test("measureRef: a dashed line where prices overall sits, none without it; chips for publishers present", () => {
  const m = nationalModel(viewData());
  assert.ok(Math.abs(m.measureRef.left - 95) < 1e-9, `${m.measureRef.left}`); // zero at 10%, +3.4 of a 4.0 span
  assert.equal(m.measureRef.text, "Prices overall +3.4%");
  assert.deepEqual(m.publishers.map((p) => p.id), ["labor", "commerce", "cleveland"]);
  assert.equal(nationalModel(viewData({ headline: { yoy: null, mom: null, momAnnualized: null } })).measureRef, null);
});

test("evenTicks: evenly spaced, includes zero, handles negatives and gaps", () => {
  assert.deepEqual(evenTicks([3.0, null, null, 2.7, 3.1]), { domain: [0, 4], ticks: [0, 1, 2, 3, 4] });
  assert.deepEqual(evenTicks([-1.2, 3]), { domain: [-2, 3], ticks: [-2, -1, 0, 1, 2, 3] });
  assert.deepEqual(evenTicks([0.3, 0.8]), { domain: [0, 1], ticks: [0, 0.5, 1] });
  assert.deepEqual(evenTicks([null]), { domain: [0, 0.5], ticks: [0, 0.5] });
  assert.deepEqual(nationalModel(viewData()).trendTicks, evenTicks([3.0, null, null, 2.7, 3.1]));
});

test("sparkPaths: a line that breaks at gaps and a filled area down to zero", () => {
  assert.deepEqual(sparkPaths([1, null, 2, 3], 100, 20, 0), {
    line: "M0.0 13.3 M66.7 6.7 L100.0 0.0",
    area: "M66.7 20.0 L66.7 6.7 L100.0 0.0 L100.0 20.0 Z",
  });
  assert.equal(sparkPaths([null, 2], 100, 20), null);
  assert.equal(sparkPaths([2], 100, 20), null);
});

test("cards: the past year next to this month's pace, and the overall card's sparkline", () => {
  const m = nationalModel(viewData());
  assert.equal(m.headline.value, 3.4);
  assert.deepEqual(
    [m.headline.pace.year.label, m.headline.pace.year.text, m.headline.pace.month.label, m.headline.pace.month.text],
    ["Past 12 months", "+3.4%", "This month's pace", "+4.9%"],
  );
  assert.equal(m.headline.pace.month.bar.width, 100);
  assert.ok(Math.abs(m.headline.pace.year.bar.width - (3.4 / 4.9) * 100) < 1e-9);
  assert.equal(m.core.pace.month.neg, true);
  assert.equal(m.core.pace.month.bar.left, 0);
  assert.deepEqual(m.headline.spark, [3.0, null, null, 2.7, 3.1]);
  assert.equal(m.core.spark, null);
  const missing = nationalModel(viewData({ headline: { yoy: null, mom: null, momAnnualized: null } }));
  assert.equal(missing.headline.pace, null);
  assert.equal(missing.headline.value, null);
});

test("hover cards: big numbers, measures and chart points", () => {
  const m = nationalModel(viewData());
  assert.deepEqual(statHover(m.headline), {
    title: "Prices overall", items: [["Change over 12 months", "+3.4%"]], lines: [], note: CARDS.headline.help,
  });
  const ex = m.measures.find((r) => r.key === "exShelter");
  assert.deepEqual(measureHover(ex), {
    title: "Prices other than housing", publisher: "labor",
    items: [["Published by", "Bureau of Labor Statistics"], ["Change over 12 months", "+3.6%"]],
    lines: ["0.2 points above prices overall"], note: MEASURES.exShelter.blurb,
  });
  assert.deepEqual(measureHover(m.measures.find((r) => r.key === "headline")).lines, []);
  assert.deepEqual(trendHover(m.trend[1]), {
    title: "October 2025", items: [["Change over 12 months", "Not published"]], lines: [], note: "",
  });
});
