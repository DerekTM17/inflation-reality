// Questions, lines and copy for the Your costs calculator.
//
// Monthly `amount` values are ILLUSTRATIVE starting estimates: people see and edit
// them. Rates never live here, except EMPLOYER_HEALTH_DEFAULT, a published survey
// figure the person is told to replace with their own.

export const QUESTIONS = [
  {
    id: "home", legend: "Your home",
    options: [
      { id: "rent", label: "Rent" },
      { id: "mortgage", label: "Mortgage, fixed rate" },
      { id: "owned", label: "Own it outright" },
    ],
  },
  {
    id: "car", legend: "Getting around",
    options: [
      { id: "gas", label: "Gas car" },
      { id: "hybrid", label: "Hybrid" },
      { id: "electric", label: "Electric car" },
      { id: "none", label: "No car" },
    ],
  },
  {
    id: "heat", legend: "Home heating",
    options: [
      { id: "electric", label: "Electric" },
      { id: "gas", label: "Natural gas" },
      { id: "oil", label: "Heating oil" },
      { id: "included", label: "Included in my rent" },
    ],
  },
  {
    id: "health", legend: "Health insurance",
    options: [
      { id: "work", label: "Through work" },
      { id: "own", label: "I buy my own" },
      { id: "none", label: "I don't pay a premium" },
    ],
  },
];

/** "Also paying for" checkboxes. Never answers or guesses; unchecked means not paying. */
export const ALSO = [
  { id: "daycare", label: "Daycare", phrase: "daycare" },
  { id: "tuition", label: "College tuition", phrase: "college tuition" },
];

/** Common answers, shown as guesses for unanswered questions. */
export const COMMON = { home: "rent", car: "gas", heat: "gas", health: "work" };

/** KFF 2025 average employer family premium increase, percent. */
export const EMPLOYER_HEALTH_DEFAULT = 6;

const HEALTH_HELP =
  "Use the increase from your renewal notice. The government's health insurance index measures insurance company earnings instead of premiums, so we don't use it.";

/** One or two sentences shown under a question for the chosen (or guessed) option. */
export const EXPLANATIONS = {
  home: {
    mortgage:
      "A fixed-rate payment stays the same from year to year, so it adds nothing here. The official inflation rate leaves mortgage payments out too. Home insurance and repairs still go up.",
  },
  car: { electric: "Most people charge at home, so we use the change in home electricity prices." },
  health: { work: HEALTH_HELP, own: HEALTH_HELP },
};

/** Phrases for the returning visitor's summary sentence. */
export const SUMMARY_PHRASES = {
  home: { rent: "rent", mortgage: "fixed-rate mortgage", owned: "home owned outright" },
  car: { gas: "gas car", hybrid: "hybrid", electric: "electric car", none: "no car" },
  heat: { electric: "electric heat", gas: "natural gas heat", oil: "heating oil", included: "heat included in rent" },
  health: { work: "health insurance through work", own: "buying your own health insurance", none: "no health insurance premium" },
};

/**
 * Personal lines. `amount` = illustrative monthly default; `note` = small text under
 * the label; `hint` = help beside the amount box; `renewal` = rate comes from the
 * person's renewal notice; `because` = verdict phrase ("mainly because of …").
 * Labels for series-backed lines match CALC_LINES in src/data/catalog.js (tested).
 */
export const LINES = {
  rent:      { label: "Rent", amount: 1650, because: "rent" },
  mortgage:  { label: "Mortgage payment", amount: 1900, note: "Fixed payment", because: "your fixed mortgage payment" },
  homeIns:   { label: "Home insurance", amount: 140, renewal: true, because: "home insurance" },
  upkeep:    { label: "Home repairs", amount: 130, note: "Estimate", because: "home repairs" },
  groceries: { label: "Groceries", amount: 620, because: "grocery prices" },
  dining:    { label: "Eating out", amount: 220, because: "restaurant prices" },
  gasoline:  { label: "Gas for the car", amount: 190, hint: "Drive less or work from home? Lower this.", because: "gas prices" },
  charging:  { label: "Charging the car", amount: 55, because: "electricity prices" },
  carIns:    { label: "Car insurance", amount: 160, because: "car insurance" },
  carUpkeep: { label: "Car repairs", amount: 60, because: "car repairs" },
  transit:   { label: "Bus and train fares", amount: 90, because: "bus and train fares" },
  electric:  { label: "Electricity", amount: 110, because: "electricity prices" },
  heatGas:   { label: "Natural gas bill", amount: 70, because: "natural gas prices" },
  heatOil:   { label: "Heating oil", amount: 120, because: "heating oil prices" },
  daycare:   { label: "Daycare", amount: 1100, because: "daycare costs" },
  tuition:   { label: "College tuition", amount: 900, because: "college tuition" },
  health:    { label: "Health insurance", amount: 180, renewal: true, because: "health insurance" },
  doctor:    { label: "Doctor and pharmacy", amount: 90, because: "doctor and pharmacy costs" },
  clothing:  { label: "Clothing", amount: 80, because: "clothing prices" },
  fun:       { label: "Entertainment", amount: 150, because: "entertainment prices" },
  rest:      { label: "Everything else", amount: 250, note: "Estimated from the national rate" },
};

/** The note on a health line that is still using EMPLOYER_HEALTH_DEFAULT. */
export const EMPLOYER_DEFAULT_NOTE = "Average for employer plans, change to yours";
