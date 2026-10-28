// The Sources tab's copy and series list as plain data (spec "Other tabs": how the
// estimate is worked out, every series with a FRED or BLS link, caveats). The
// spreadsheet's "How it works" and "Price changes" sheets reuse the same data, so
// the page and the download never disagree.

import { BASKET, CALC_LINES, CALC_COMBOS } from "../data/catalog.js";
import {
  LINES, BASKET_ROWS, EMPLOYER_HEALTH_DEFAULT, COMMON, QUESTIONS, SUMMARY_PHRASES,
} from "../calculator/config.js";
import { defaultAmount } from "../calculator/model.js";
import { formatDollars, joinAnd } from "../calculator/format.js";
import { pctChange, priceFamily } from "./prices.js";

/** Where a person can check a series: FRED for FRED-sourced ids, the BLS data viewer otherwise. */
export function sourceUrl(seriesId, source) {
  return source === "bls"
    ? `https://data.bls.gov/timeseries/${seriesId}`
    : `https://fred.stlouisfed.org/series/${seriesId}`;
}

// family: the kind of spending the series stands for (a FAMILIES id, shown as a dot), or null.
const row = (name, seriesId, source, yoy = null, family = null) => ({
  name, seriesId, source: source === "bls" ? "BLS" : "FRED", url: sourceUrl(seriesId, source), yoy, family,
});

/**
 * Every series on the site, grouped by what it is used for. The owners' yardstick
 * (a CALC_LINES entry with yardstick: true) is listed under "What we compare you
 * with" and National numbers, never as a Your costs line. yoy is the 12-month
 * change where the site has one, else null.
 * @returns {{ id: string, title: string, rows: ReturnType<typeof row>[] }[]}
 */
export function seriesGroups(catalog, data) {
  const { HEADLINE, CORE, CALC_LINES, CALC_COMBOS, ALT_MEASURES, AVG_PRICE_ITEMS, WEEKLY_PRICES } = catalog;
  const lineYoy = (id) => data.lines?.[id]?.yoy ?? null;
  const yardsticks = CALC_LINES.filter((l) => l.yardstick);
  const household = CALC_LINES.filter((l) => !l.yardstick);
  const basketRate = (id) => data.basket?.items?.find((i) => i.id === id)?.rate ?? null;
  const alt = (key) => data.altMeasures?.find((m) => m.key === key)?.yoy ?? null;
  const avg = (id) => data.avgPrices?.find((p) => p.seriesId === id);
  const weekly = (key) => data.weeklyPrices?.find((w) => w.key === key);

  return [
    {
      id: "household",
      title: "Lines on Your costs",
      rows: [
        ...household.map((l) => row(l.label, l.seriesId, l.source, lineYoy(l.id), LINES[l.id]?.family ?? null)),
        ...CALC_COMBOS.flatMap((c) => c.parts.map((p) => row(`${c.label}: ${p.label.toLowerCase()}`, p.seriesId, c.source, null, LINES[c.id]?.family ?? null))),
      ],
    },
    {
      id: "yardstick",
      title: "What we compare you with",
      rows: [
        row("Prices overall (renters and the average household)", HEADLINE.seriesId, "fred", data.headline?.yoy ?? null),
        ...yardsticks.map((l) => row(`${l.label} (homeowners)`, l.seriesId, l.source, lineYoy(l.id))),
      ],
    },
    {
      id: "average",
      title: "The average household",
      rows: BASKET.visible.map((v) => row(v.label, v.seriesId, "fred", basketRate(v.id), BASKET_ROWS[v.id]?.family ?? null)),
    },
    {
      id: "national",
      title: "National numbers",
      rows: [
        row("CPI for all items", HEADLINE.seriesId, "fred", data.headline?.yoy ?? null),
        row("CPI for all items, seasonally adjusted (one-month change)", HEADLINE.momSeriesId, "fred"),
        row("Core CPI", CORE.seriesId, "fred", data.core?.yoy ?? null),
        row("Core CPI, seasonally adjusted (one-month change)", CORE.momSeriesId, "fred"),
        ...yardsticks.map((l) => row(l.label, l.seriesId, l.source, lineYoy(l.id))),
        ...ALT_MEASURES.map((m) => row(m.label, m.seriesId, "fred", alt(m.key))),
      ],
    },
    {
      id: "prices",
      title: "Price check",
      rows: [
        ...AVG_PRICE_ITEMS.map((p) => {
          const a = avg(p.seriesId);
          return row(p.item, p.seriesId, "fred", pctChange(a?.current ?? null, a?.yearAgo ?? null), priceFamily(p.seriesId));
        }),
        ...WEEKLY_PRICES.map((w) => {
          const x = weekly(w.key);
          return row(`${w.label}, weekly`, w.seriesId, "fred", pctChange(x?.current ?? null, x?.yearAgo ?? null), "around");
        }),
      ],
    },
  ];
}

// ── Each line, one at a time ───────────────────────────────────────────────
// The reviewer's ask: every line gets its own price data, formula and starting amount.
// Amounts and rates are read from config.js, catalog.js and model.js, never retyped,
// so this copy can't drift from what the calculator does.

/** Starting monthly amount as the calculator sets it, for the common answers plus `choices`. */
const start = (id, choices = {}) => formatDollars(defaultAmount(id, { ...COMMON, ...choices }));

/** A series as a link: { seriesId, source: "FRED" | "BLS", url }. */
const link = (seriesId, source) => ({ seriesId, source: source === "bls" ? "BLS" : "FRED", url: sourceUrl(seriesId, source) });
const calcLine = (id) => CALC_LINES.find((l) => l.id === id);
const lineSeries = (id) => [link(calcLine(id).seriesId, calcLine(id).source)];

// BLS's own names for the indexes behind the lines, lower-cased to sit in a sentence.
const INDEX_NAME = {
  rent: "rent of primary residence",
  upkeep: "household furnishings and operations",
  groceries: "food at home",
  dining: "food away from home",
  gasoline: "gasoline (all types)",
  carIns: "motor vehicle insurance",
  carUpkeep: "motor vehicle maintenance and repair",
  transit: "intracity transportation",
  electric: "electricity",
  heatGas: "utility (piped) gas service",
  heatOil: "fuel oil",
  daycare: "day care and preschool",
  tuition: "college tuition and fees",
  clothing: "apparel",
  fun: "recreation",
};

const index = (id, extra = "") => `The BLS price index for ${INDEX_NAME[id]}, updated monthly.${extra ? ` ${extra}` : ""}`;
const TWELVE = "The change in this index over the last 12 months.";
const doctor = CALC_COMBOS.find((c) => c.id === "doctor");

/** Paragraphs above the line-by-line list. */
export const LINE_GUIDE_INTRO = [
  "Each line on Your costs has three parts: where its price data comes from, how we turn that data into a price change, and the amount it starts with.",
  "Most lines use a price index from the Bureau of Labor Statistics (BLS). An index tracks the price of the same things over time, across U.S. cities. BLS puts out a new number each month. We compare the newest month with the same month a year before.",
  `Until you answer, we guess the most common answers: ${joinAnd(QUESTIONS.map((q) => SUMMARY_PHRASES[q.id][COMMON[q.id]]))}. Each amount starts as a rough round number we picked as an example. It is not from a survey. Change any amount to what you pay, and the estimate updates.`,
];

// Per line: data = where the price data comes from; formula = how the rate is set;
// start = the starting amount and when the line shows.
const GUIDE_TEXT = {
  rent: {
    series: lineSeries("rent"),
    data: index("rent"),
    formula: `${TWELVE} It counts rent only, not utilities.`,
    start: `${start("rent")} a month. Shown when you rent.`,
  },
  mortgage: {
    series: [],
    data: "None. Your payment is set by your loan, not by prices.",
    formula: "0%. A fixed-rate payment stays the same each year. The official inflation rate leaves mortgage payments out too.",
    start: `${start("mortgage")} a month. Shown when you have a fixed-rate mortgage.`,
  },
  homeIns: {
    series: [],
    data: "Your own renewal notice. Premiums depend on where you live and who insures you.",
    formula: "The increase you type in. Until you add one, this line is left out of the total. It is never counted as 0%.",
    start: `${start("homeIns")} a month. Shown when you own your home, with or without a mortgage.`,
  },
  upkeep: {
    series: lineSeries("upkeep"),
    data: index("upkeep", "It covers furniture, appliances and home services, the closest match to home repairs."),
    formula: TWELVE,
    start: `${start("upkeep")} a month. Shown when you own your home.`,
  },
  groceries: {
    series: lineSeries("groceries"),
    data: index("groceries"),
    formula: TWELVE,
    start: `${start("groceries")} a month.`,
  },
  dining: {
    series: lineSeries("dining"),
    data: index("dining"),
    formula: TWELVE,
    start: `${start("dining")} a month.`,
  },
  gasoline: {
    series: lineSeries("gasoline"),
    data: index("gasoline"),
    formula: TWELVE,
    start: `${start("gasoline")} a month for a gas car. A hybrid starts at ${start("gasoline", { car: "hybrid" })}, a bit over half as much.`,
  },
  charging: {
    series: lineSeries("electric"),
    data: "The BLS price index for electricity, the same one the Electricity line uses. Most people charge at home.",
    formula: "The change in home power prices over the last 12 months.",
    start: `${start("charging")} a month. Shown when you drive an electric car.`,
  },
  carIns: {
    series: lineSeries("carIns"),
    data: index("carIns", "FRED does not carry it, so we get it from BLS directly."),
    formula: `${TWELVE} Car insurance has a price index of its own, so you don't need to add a renewal increase.`,
    start: `${start("carIns")} a month. Shown when you have a car of any kind.`,
  },
  carUpkeep: {
    series: lineSeries("carUpkeep"),
    data: index("carUpkeep"),
    formula: TWELVE,
    start: `${start("carUpkeep")} a month. Shown when you have a car.`,
  },
  transit: {
    series: lineSeries("transit"),
    data: index("transit", "It covers local bus, subway and train fares."),
    formula: TWELVE,
    start: `${start("transit")} a month. Shown when you have no car.`,
  },
  electric: {
    series: lineSeries("electric"),
    data: index("electric"),
    formula: TWELVE,
    start: `${start("electric")} a month. With electric heat it starts at ${start("electric", { heat: "electric" })}.`,
  },
  heatGas: {
    series: lineSeries("heatGas"),
    data: index("heatGas", "That is natural gas piped to your home."),
    formula: TWELVE,
    start: `${start("heatGas")} a month. Shown when you heat with natural gas.`,
  },
  heatOil: {
    series: lineSeries("heatOil"),
    data: index("heatOil"),
    formula: TWELVE,
    start: `${start("heatOil")} a month. Shown when you heat with oil.`,
  },
  daycare: {
    series: lineSeries("daycare"),
    data: index("daycare"),
    formula: TWELVE,
    start: `${start("daycare")} a month. Shown when you check Daycare.`,
  },
  tuition: {
    series: lineSeries("tuition"),
    data: index("tuition"),
    formula: TWELVE,
    start: `${start("tuition")} a month. Shown when you check College tuition.`,
  },
  health: {
    series: [],
    data: "Your own renewal notice. For plans through work, we start with the KFF 2025 Employer Health Benefits Survey. We don't use the BLS health insurance index. It tracks what insurers earn, not what you pay.",
    formula: `The increase you type in. Through work, it starts at ${EMPLOYER_HEALTH_DEFAULT}%, the average rise for employer family plans in 2025, until you change it. If you buy your own, the line is left out until you add your increase.`,
    start: `${start("health")} a month through work, or ${start("health", { health: "own" })} if you buy your own. Not shown if you don't pay a premium.`,
  },
  doctor: {
    series: doctor.parts.map((p) => link(p.seriesId, doctor.source)),
    data: "Two BLS price indexes, one for doctors' services and one for prescription drugs, both updated monthly.",
    formula: `We blend the two price changes by how much each counts in the national index. In December ${BASKET.riYear}, doctors were ${doctor.parts[0].riDec}% of all spending and drugs were ${doctor.parts[1].riDec}%. We move those shares forward by each one's own price change.`,
    start: `${start("doctor")} a month.`,
  },
  clothing: {
    series: lineSeries("clothing"),
    data: index("clothing", "It covers clothes and shoes."),
    formula: TWELVE,
    start: `${start("clothing")} a month.`,
  },
  fun: {
    series: lineSeries("fun"),
    data: index("fun", "It covers TV and streaming, pets, toys, sports gear and hobbies."),
    formula: TWELVE,
    start: `${start("fun")} a month.`,
  },
  rest: {
    series: [],
    data: "No index of its own. We work it out from the national rate and the lines we show for the average household.",
    formula: "The rate that makes the average household's total match the national rate. Your Everything else line uses the same rate, so it is an estimate.",
    start: `${start("rest")} a month.`,
  },
};

/**
 * Every Your costs line in display order: { id, name, family, series, data, formula, start }.
 * series = the links behind the line (empty when it has no index of its own).
 */
export const LINE_GUIDE = Object.keys(LINES).map((id) => ({
  id, name: LINES[id].label, family: LINES[id].family ?? null, ...GUIDE_TEXT[id],
}));

/** "How your estimate is worked out": headings with one to three plain paragraphs each. */
export const METHOD = [
  {
    heading: "The basic idea",
    paragraphs: [
      "For each kind of spending, we take your monthly amount and how much its price changed over the last 12 months. From those two numbers we work out what the same spending cost a year ago. The difference is the extra you pay this year.",
      "For example, say you spend $200 a month on gas and gas prices rose 25%. That is $2,400 a year. A year ago the same gas cost $2,400 divided by 1.25, or $1,920. So you pay $480 more.",
      "Your rate is everything you spend in a year compared with what the same things cost a year ago.",
    ],
  },
  {
    heading: "Mortgages",
    paragraphs: [
      "A fixed-rate payment stays the same each year, so its price change is 0%. The official inflation rate leaves mortgage payments out too, because the government counts buying a home as an investment.",
    ],
  },
  {
    heading: "Homeowners",
    paragraphs: [
      "The national rate includes the rent owners would pay for their own homes. Owners don't pay that rent, so we compare homeowners with prices other than housing instead. Property taxes are left out because they depend on where you live.",
    ],
  },
  {
    heading: "Insurance",
    paragraphs: [
      "Car insurance has a price index of its own, so it uses that, like most lines.",
      `Health and home insurance use the increase on your own renewal notice. For health insurance through work, we start at ${EMPLOYER_HEALTH_DEFAULT}%, the average rise for employer family plans in 2025.`,
      "We don't use the government's health insurance index. It tracks what insurers earn, not what you pay.",
    ],
  },
  {
    heading: "The average household",
    paragraphs: [
      `Before you answer, the page shows the average U.S. household. It spends about ${formatDollars(BASKET.ceMonthlyMean)} a month, from the government's Consumer Expenditure Survey for ${BASKET.ceYear}, split the way the government weights its price index.`,
      `Those weights are set each December. We move each one forward by how much its prices changed since then, so the shares fit the current month. When the 12 months cross January, the government updates its weights, so the average household's total can be off by a small amount.`,
    ],
  },
  {
    heading: "Everything else",
    paragraphs: [
      "The lines we show don't cover all spending. Everything else gets the rate that makes the average household's total match the national rate. Your Everything else line uses the same rate, so it is an estimate.",
    ],
  },
  {
    heading: "Close matches",
    paragraphs: [
      "Some lines use a close match, not an exact price. Home repairs use the index for furniture, appliances and home services. Charging an electric car uses home power prices. Doctor and pharmacy blends doctors' services and prescription drugs.",
    ],
  },
];

/** "Things to keep in mind." */
export const CAVEATS = [
  "These are national averages. Prices where you live may have gone up more or less.",
  "Price changes are not the same as your cost of living. If you buy more, or different things, your costs change too.",
  "Monthly amounts start as estimates. Change them to match what you pay for a better estimate.",
  "During the 2025 government shutdown, some figures for October and November 2025 were never published.",
  "The numbers update each month after the government publishes new prices, usually in the middle of the month.",
];

/** Background sources named in METHOD, with links. */
export const SOURCE_LINKS = [
  { text: "FRED, Federal Reserve Bank of St. Louis", url: "https://fred.stlouisfed.org/" },
  { text: "Consumer prices, Bureau of Labor Statistics", url: "https://www.bls.gov/cpi/" },
  { text: `Spending weights, December ${BASKET.riYear}`, url: BASKET.riSourceUrl },
  { text: `Consumer Expenditure Survey ${BASKET.ceYear}`, url: BASKET.ceSourceUrl },
  { text: "KFF 2025 Employer Health Benefits Survey", url: "https://www.kff.org/health-costs/2025-employer-health-benefits-survey/" },
  { text: "Why mortgage payments are left out", url: "https://www.bls.gov/cpi/factsheets/owners-equivalent-rent-and-rent.htm" },
  { text: "Weekly fuel prices, Energy Information Administration", url: "https://www.eia.gov/petroleum/gasdiesel/" },
];
