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
  seriesId: "CPILFESNS",
  momSeriesId: "CPILFESL",
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
];

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
  return [...seen.values()];
}
