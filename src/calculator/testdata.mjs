// Synthetic view data (the shape buildViewData returns) for calculator tests.
// Values are fixed here on purpose so tests don't move when fallback.json is refreshed.

const LINE_RATES = {
  rent: 3.0, upkeep: 2.0, groceries: 2.2, dining: 3.4, gasoline: 27.4, carIns: -5.1,
  carUpkeep: 5.2, transit: -3.7, electric: 3.8, heatGas: 4.4, heatOil: 52.0,
  daycare: 4.0, tuition: 2.8, clothing: 3.6, fun: 2.7, doctor: 0.2,
};

const BASKET_ITEMS = [
  { id: "housing", label: "Housing", weight: 35.322438, rate: 3.041144 },
  { id: "groceries", label: "Groceries", weight: 8.202357, rate: 2.190663 },
  { id: "dining", label: "Eating out", weight: 5.30412, rate: 3.36677 },
  { id: "energy", label: "Home energy", weight: 3.442446, rate: 5.047394 },
  { id: "gasoline", label: "Gas for the car", weight: 3.85317, rate: 27.404926 },
  { id: "health", label: "Health care", weight: 8.229578, rate: 1.563348 },
  { id: "clothing", label: "Clothing", weight: 2.445064, rate: 3.608634 },
  { id: "fun", label: "Entertainment", weight: 5.062939, rate: 2.681868 },
];

/** Overrides: `lines` replaces whole line nodes by id; `basket` merges over the basket. */
export function fakeData({ lines = {}, basket = {}, headline = 3.4, yoyGap = null } = {}) {
  const viewLines = Object.fromEntries(
    Object.entries(LINE_RATES).map(([id, yoy]) => [id, { id, yoy, stale: false }]),
  );
  Object.assign(viewLines, lines);
  return {
    referenceMonth: "2026-08",
    referenceMonthLabel: "August 2026",
    yoyGap,
    headline: { yoy: headline, stale: false },
    lines: viewLines,
    basket: {
      month: "2026-08", stale: false, restWeight: 28.137887, residualYoy: 2.014252, headlineYoy: 3.396548,
      items: BASKET_ITEMS.map((i) => ({ ...i })),
      ...basket,
    },
  };
}
