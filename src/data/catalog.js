// Static presentation metadata + FRED series manifest.
// Dynamic values (yoy/mom/prices/trend) come from cpi.json; this file never changes at build time.

export const HEADLINE = {
  key: "headline",
  label: "All Items (CPI-U)",
  code: "SA0",
  relImportance: 100.0,
  seriesId: "CPIAUCNS",   // NSA — 12-month (YoY) change, as BLS headline is reported
  momSeriesId: "CPIAUCSL", // SA — 1-month (MoM) change
};

export const CORE = {
  key: "core",
  label: "All Items Less Food & Energy",
  code: "SA0L1E",
  relImportance: 79.6,
  // NSA core is CPILFENS, NOT CPILFESNS — the latter 404s on FRED and silently
  // sent this node down the fallback path on every build from 2026-07-10 to 2026-08-16.
  seriesId: "CPILFENS",   // NSA — 12-month (YoY) change
  momSeriesId: "CPILFESL", // SA — 1-month (MoM) change
};

// id/label/code/weight/icon/color are presentation-only; seriesId (NSA CUUR) drives YoY.
export const CATEGORIES = [
  { id: "groceries",    label: "Groceries",           seriesId: "CUUR0000SAF11",  code: "SAF11",  weight: 8.2, icon: "🛒", color: "#2D6A4F" },
  { id: "dining",       label: "Dining Out",          seriesId: "CUUR0000SEFV",   code: "SEFV",   weight: 5.3, icon: "🍽️", color: "#52796F" },
  { id: "shelter",      label: "Rent / Housing",      seriesId: "CUUR0000SAH1",   code: "SAH1",   weight: 36.4, icon: "🏠", color: "#1B4965" },
  { id: "energy",       label: "Home Energy",         seriesId: "CUUR0000SAH21",  code: "SAH21",  weight: 3.2, icon: "💡", color: "#F4A261" },
  { id: "gas",          label: "Gasoline",            seriesId: "CUUR0000SETB01", code: "SETB01", weight: 3.0, icon: "⛽", color: "#E76F51" },
  // FRED does not mirror the CPI motor-vehicle-insurance NSA series, so Car Insurance was dropped (2026-07-10).
  { id: "healthcare",   label: "Healthcare",          seriesId: "CPIMEDNS",       code: "SAM",    weight: 8.1, icon: "🏥", color: "#457B9D" },
  { id: "tuition",      label: "Tuition & Childcare", seriesId: "CUUR0000SEEB",   code: "SEEB",   weight: 3.0, icon: "🎓", color: "#6D597A" },
  { id: "apparel",      label: "Clothing",            seriesId: "CPIAPPNS",       code: "SAA",    weight: 2.5, icon: "👔", color: "#936639" },
  { id: "recreation",   label: "Recreation",          seriesId: "CPIRECNS",       code: "SAR",    weight: 5.3, icon: "🎬", color: "#3A86A5" },
  { id: "other",        label: "Other",               seriesId: "CUUR0000SAS",    code: "SAS",    weight: 3.6, icon: "📦", color: "#8D99AE" },
];

export const AVG_PRICE_ITEMS = [
  { item: "Eggs, Grade A Large",       unit: "/doz",    seriesId: "APU0000708111", category: "Protein" },
  { item: "Ground Beef, 100%",         unit: "/lb",     seriesId: "APU0000703112", category: "Protein" },
  { item: "Chicken Breast, Boneless",  unit: "/lb",     seriesId: "APU0000706111", category: "Protein" },
  { item: "Bacon, Sliced",             unit: "/lb",     seriesId: "APU0000704111", category: "Protein" },
  { item: "Whole Milk",                unit: "/gal",    seriesId: "APU0000709112", category: "Dairy" },
  { item: "Butter, Stick",             unit: "/lb",     seriesId: "APU0000FS1101", category: "Dairy" },
  { item: "Cheddar Cheese",            unit: "/lb",     seriesId: "APU0000710212", category: "Dairy" },
  { item: "White Bread",               unit: "/lb",     seriesId: "APU0000702111", category: "Staples" },
  { item: "White Rice",                unit: "/lb",     seriesId: "APU0000701111", category: "Staples" },
  { item: "Flour, All Purpose",        unit: "/lb",     seriesId: "APU0000701312", category: "Staples" },
  { item: "Sugar, White",              unit: "/lb",     seriesId: "APU0000715211", category: "Staples" },
  { item: "Bananas",                   unit: "/lb",     seriesId: "APU0000711211", category: "Produce" },
  { item: "Tomatoes",                  unit: "/lb",     seriesId: "APU0000712311", category: "Produce" },
  { item: "Potatoes, White",           unit: "/lb",     seriesId: "APU0000712112", category: "Produce" },
  { item: "Coffee, Ground Roast",      unit: "/lb",     seriesId: "APU0000717311", category: "Beverages" },
  { item: "Orange Juice",              unit: "/16oz",   seriesId: "APU0000FJ4101", category: "Beverages" },
  { item: "Potato Chips",              unit: "/16oz",   seriesId: "APU0000FN1101", category: "Snacks" },
  { item: "Gasoline, Regular",         unit: "/gal",    seriesId: "APU000074714",  category: "Energy" },
  { item: "Diesel, Automotive",        unit: "/gal",    seriesId: "APU000074717", category: "Energy" },
  { item: "Electricity",               unit: "/kWh",    seriesId: "APU000072610",  category: "Energy" },
  { item: "Natural Gas",               unit: "/therm",  seriesId: "APU000072620",  category: "Energy" },
];

// Alternative official inflation gauges, shown as 12-month (YoY) % alongside CPI.
// kind "index"  → fetch the index and compute YoY (like CPI).
// kind "yoyRate"→ the series value already IS the 12-month %; use the latest value.
export const ALT_MEASURES = [
  { key: "corePce",    label: "Core PCE",         seriesId: "PCEPILFE",              kind: "index",   color: "#2D6A4F",
    blurb: "The Fed's preferred gauge (from the BEA). Weighted differently than CPI and usually runs a bit lower — it's what the Fed targets at 2%." },
  { key: "medianCpi",  label: "Median CPI",       seriesId: "MEDCPIM159SFRBCLE",     kind: "yoyRate", color: "#6D597A",
    blurb: "Takes the middle category's price change, ignoring the biggest movers on both ends — a cleaner read on the broad trend. (Cleveland Fed.)" },
  { key: "trimmedCpi", label: "Trimmed-Mean CPI", seriesId: "TRMMEANCPIM159SFRBCLE", kind: "yoyRate", color: "#52796F",
    blurb: "Throws out the most extreme price moves on each side, then averages the rest — like Median CPI, it strips out the noise. (Cleveland Fed.)" },
  { key: "stickyCpi",  label: "Sticky-Price CPI", seriesId: "CORESTICKM159SFRBATL",  kind: "yoyRate", color: "#E76F51",
    blurb: "Counts only prices that change slowly (rent, insurance), which tend to reflect longer-run expectations — a steadier signal. (Atlanta Fed.)" },
  { key: "trimmedPce", label: "Trimmed-Mean PCE", seriesId: "PCETRIM12M159SFRBDAL",  kind: "yoyRate", color: "#B5838D",
    blurb: "The Dallas Fed's trimmed-mean measure applied to PCE (the Fed's preferred index) instead of CPI — drops the biggest movers on each side to show the underlying trend." },
];

// Weekly retail fuel prices from the EIA, mirrored on FRED (so no second API key).
// These are a deliberate second source for two goods the BLS APU table above also
// covers: EIA surveys weekly and posts within days, where the BLS average is a
// monthly figure that can be six weeks old by the end of a release cycle. Showing
// the pair is the point — it cross-checks BLS on identical goods and makes the lag
// visible instead of implying the monthly number is today's price.
export const WEEKLY_PRICES = [
  { key: "gasoline", label: "Gasoline, Regular", unit: "/gal", seriesId: "GASREGW", blsSeriesId: "APU000074714",
    blurb: "EIA's weekly survey of retail stations nationwide, averaged across all formulations of regular unleaded. Published every Monday for the prior week." },
  { key: "diesel",   label: "Diesel",            unit: "/gal", seriesId: "GASDESW", blsSeriesId: "APU000074717",
    blurb: "EIA's weekly retail diesel price, all types. Diesel moves freight, so it feeds through into the price of most physical goods a few months later." },
];

// ── Calculator (redesign, Phase 1) ─────────────────────────────────────────
// The 12-month rate behind each line of the "Your costs" calculator. source "fred" series are
// fetched with FRED_API_KEY like everything above. source "bls" series are NOT mirrored on FRED
// (checked 2026-09-10/14) and come from the BLS Public Data API v2 with BLS_API_KEY.
// Lines without a series (mortgage = 0%, insurance = the person's renewal increase, charging =
// the electricity rate, everything else = the basket residual) are handled in the front end.
export const CALC_LINES = [
  { id: "rent",      label: "Rent",                seriesId: "CUUR0000SEHA",   source: "fred" },
  { id: "upkeep",    label: "Home repairs",        seriesId: "CUUR0000SAH3",   source: "fred" },
  { id: "groceries", label: "Groceries",           seriesId: "CUUR0000SAF11",  source: "fred" },
  { id: "dining",    label: "Eating out",          seriesId: "CUUR0000SEFV",   source: "fred" },
  { id: "gasoline",  label: "Gas for the car",     seriesId: "CUUR0000SETB01", source: "fred" },
  { id: "carIns",    label: "Car insurance",       seriesId: "CUUR0000SETE",   source: "bls" },
  { id: "carUpkeep", label: "Car repairs",         seriesId: "CUUR0000SETD",   source: "fred" },
  { id: "transit",   label: "Bus and train fares", seriesId: "CUUR0000SETG02", source: "bls" },
  { id: "electric",  label: "Electricity",         seriesId: "CUUR0000SEHF01", source: "fred" },
  { id: "heatGas",   label: "Natural gas bill",    seriesId: "CUUR0000SEHF02", source: "fred" },
  { id: "heatOil",   label: "Heating oil",         seriesId: "CUUR0000SEHE01", source: "bls" },
  { id: "daycare",   label: "Daycare",             seriesId: "CUUR0000SEEB03", source: "bls" },
  { id: "tuition",   label: "College tuition",     seriesId: "CUUR0000SEEB01", source: "bls" },
  { id: "clothing",  label: "Clothing",            seriesId: "CPIAPPNS",       source: "fred" },
  { id: "fun",       label: "Entertainment",       seriesId: "CPIRECNS",       source: "fred" },
];

// Lines built from several series, combined with weights rolled forward from December
// relative importance (BLS, December 2025) — see combineRates in scripts/compute.mjs.
export const CALC_COMBOS = [
  {
    id: "doctor", label: "Doctor and pharmacy", source: "bls",
    parts: [
      { seriesId: "CUUR0000SEMC01", label: "Physicians' services", riDec: 1.684 },
      { seriesId: "CUUR0000SEMF01", label: "Prescription drugs",   riDec: 0.973 },
    ],
  },
];

// The average U.S. household: visible lines with December 2025 relative importance (percent of
// all items, 2024 weights). Everything else is the remaining weight, and its rate is solved so
// the basket reproduces the headline (residualRate in scripts/compute.mjs). Update yearly.
export const BASKET = {
  riYear: 2025,
  riSourceUrl: "https://www.bls.gov/cpi/tables/relative-importance/2025.htm",
  visible: [
    { id: "housing",   label: "Housing",         seriesId: "CUUR0000SAH1",   riDec: 35.625 },
    { id: "groceries", label: "Groceries",       seriesId: "CUUR0000SAF11",  riDec: 8.325 },
    { id: "dining",    label: "Eating out",      seriesId: "CUUR0000SEFV",   riDec: 5.373 },
    { id: "energy",    label: "Home energy",     seriesId: "CUUR0000SAH21",  riDec: 3.402 },
    { id: "gasoline",  label: "Gas for the car", seriesId: "CUUR0000SETB01", riDec: 2.895 },
    { id: "health",    label: "Health care",     seriesId: "CPIMEDNS",       riDec: 8.423 },
    { id: "clothing",  label: "Clothing",        seriesId: "CPIAPPNS",       riDec: 2.368 },
    { id: "fun",       label: "Entertainment",   seriesId: "CPIRECNS",       riDec: 5.137 },
  ],
  // Consumer Expenditure Survey 2024: $78,535 average annual expenditures minus $9,797 personal
  // insurance and pensions = $68,738 a year, rounded to $5,750 a month.
  ceYear: 2024,
  ceSourceUrl: "https://www.bls.gov/news.release/cesan.nr0.htm",
  ceMonthlyMean: 5750,
};

// BLS-only series ids the fetch script requests from the BLS API (never from FRED).
export function blsSeries() {
  const ids = new Set();
  for (const l of CALC_LINES) if (l.source === "bls") ids.add(l.seriesId);
  for (const c of CALC_COMBOS) if (c.source === "bls") for (const p of c.parts) ids.add(p.seriesId);
  return [...ids];
}

// The de-duplicated list of FRED series the fetch script must request.
// kind "level"   → used for YoY / trend / avg-price (NSA levels)
// kind "levelSA" → used for MoM (seasonally adjusted levels)
// kind "rate"    → used for pre-computed yoy rates (no compute needed)
export function allSeries() {
  const seen = new Map();
  const add = (id, kind) => { if (!seen.has(id)) seen.set(id, { id, kind }); };
  add(HEADLINE.seriesId, "level");
  add(HEADLINE.momSeriesId, "levelSA");
  add(CORE.seriesId, "level");
  add(CORE.momSeriesId, "levelSA");
  for (const c of CATEGORIES) add(c.seriesId, "level");
  for (const p of AVG_PRICE_ITEMS) add(p.seriesId, "level");
  for (const m of ALT_MEASURES) add(m.seriesId, m.kind === "index" ? "level" : "rate");
  for (const w of WEEKLY_PRICES) add(w.seriesId, "level");
  for (const l of CALC_LINES) if (l.source === "fred") add(l.seriesId, "level");
  for (const v of BASKET.visible) add(v.seriesId, "level");
  return [...seen.values()];
}
