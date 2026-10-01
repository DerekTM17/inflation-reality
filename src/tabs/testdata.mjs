// Payload-shaped test data for the tab modules, run through the real buildViewData
// so tests see exactly what the views see. Values are fixed here on purpose so
// tests don't move when fallback.json is refreshed. Deliberate edge cases: a
// falling price, a price under $1, a missing year-ago price, a stale price and a
// stale measure, a missing measure, a negative measure, two gap months in the
// trend, and no diesel data.

import * as catalog from "../data/catalog.js";
import { buildViewData } from "../data/merge.js";

const LINE_RATES = {
  rent: 3.0, upkeep: 2.0, groceries: 2.2, dining: 3.4, gasoline: 27.4, carIns: -5.1,
  carUpkeep: 5.2, transit: -3.7, electric: 3.8, heatGas: 4.4, heatOil: 52.0,
  daycare: 4.0, tuition: 2.8, clothing: 3.6, fun: 2.7, doctor: 0.2,
  exShelter: 3.6,
};

export const DYNAMIC = {
  generatedAt: "2026-09-16T15:33:02.447Z",
  referenceMonth: "2026-08",
  referenceMonthLabel: "August 2026",
  headline: { yoy: 3.4, mom: 0.4, momAnnualized: 4.9 },
  core: { yoy: 2.4, mom: -0.1, momAnnualized: -1.2 },
  categories: {},
  avgPrices: {
    APU0000708111: { current: 2.272, yearAgo: 3.587 },            // eggs: fell 36.7%
    APU0000703112: { current: 6.923, yearAgo: 6.318 },            // ground beef: rose 9.6%
    APU000074714: { current: 4.211, yearAgo: 3.15 },              // gasoline: rose 33.7%
    APU000072610: { current: 0.183, yearAgo: 0.176 },             // electricity: under $1
    APU0000709112: { current: 4.1, yearAgo: null },               // milk: no year-ago price
    APU0000FS1101: { current: 5.0, yearAgo: 5.0, stale: true },   // butter: stale, no change
  },
  altMeasures: {
    corePce: { yoy: 3.3 },
    medianCpi: { yoy: 2.6, stale: true },
    trimmedCpi: { yoy: -0.4 },
    stickyCpi: { yoy: null },
  },
  weeklyPrices: {
    gasoline: { current: 4.319, yearAgo: 3.168, asOf: "2026-09-14", asOfLabel: "Sep 14, 2026" },
  },
  trend: [
    { month: "Sep 25", headline: 3.0 },
    { month: "Oct 25", headline: null, gap: true },
    { month: "Nov 25", headline: null, gap: true },
    { month: "Dec 25", headline: 2.7 },
    { month: "Jan 26", headline: 3.1 },
  ],
  lines: Object.fromEntries(Object.entries(LINE_RATES).map(([id, yoy]) => [id, { yoy }])),
  basket: {
    month: "2026-08",
    weights: {
      housing: 35.322438, groceries: 8.202357, dining: 5.30412, energy: 3.442446,
      gasoline: 3.85317, health: 8.229578, clothing: 2.445064, fun: 5.062939,
    },
    rates: {
      housing: 3.041144, groceries: 2.190663, dining: 3.36677, energy: 5.047394,
      gasoline: 27.404926, health: 1.563348, clothing: 3.608634, fun: 2.681868,
    },
    restWeight: 28.137887,
    residualYoy: 2.014252,
    headlineYoy: 3.396548,
  },
};

/** buildViewData over DYNAMIC, with top-level payload keys replaced by `overrides`. */
export function viewData(overrides = {}) {
  return buildViewData(catalog, { ...DYNAMIC, ...overrides });
}
