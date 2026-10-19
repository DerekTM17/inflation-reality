// The Sources tab's copy and series list as plain data (spec "Other tabs": how the
// estimate is worked out, every series with a FRED or BLS link, caveats). The
// spreadsheet's "How it works" and "Price changes" sheets reuse the same data, so
// the page and the download never disagree.

import { BASKET } from "../data/catalog.js";
import { LINES, BASKET_ROWS, EMPLOYER_HEALTH_DEFAULT } from "../calculator/config.js";
import { formatDollars } from "../calculator/format.js";
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

/** Lines whose rate does not come from a series of their own. */
export const NO_SERIES_LINES = [
  { name: LINES.mortgage.label, how: "0% by definition. A fixed-rate payment stays the same from year to year." },
  { name: LINES.homeIns.label, how: "The increase on your renewal notice. It is left out until you add it." },
  {
    name: LINES.health.label,
    how: `The increase on your renewal notice. Through work, it starts at ${EMPLOYER_HEALTH_DEFAULT}%, the 2025 average for employer family plans.`,
  },
  { name: LINES.charging.label, how: "Uses the change in home electricity prices." },
  { name: LINES.rest.label, how: "The rate that makes the average household match the national rate." },
];

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
      `Health and home insurance use the increase on your own renewal notice. For health insurance through work, we start at ${EMPLOYER_HEALTH_DEFAULT}%, the average increase for employer family plans in 2025.`,
      "The government's health insurance index measures insurance company earnings instead of premiums, so we don't use it.",
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
      "Some lines use a close match instead of an exact price. Home repairs use household furnishings and operations. Charging an electric car uses home electricity prices. Doctor and pharmacy combines doctors' services and prescription drugs.",
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
