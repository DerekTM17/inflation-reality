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
// Property taxes have no published national rate (they turn on your county and your
// reassessment), so owners are told what is left out instead of being asked for a number.
const LOCAL_HOME_COSTS =
  "Property taxes are left out because they depend on where you live.";
// The national rate counts what owners would pay to rent their own home; owners never
// pay that in cash, so the panel compares them with prices other than housing instead.
export const OWNER_YARDSTICK =
  "We compare you with prices other than housing, because the national rate counts rent that owners don't pay.";

export const EXPLANATIONS = {
  home: {
    mortgage:
      `A fixed-rate payment stays the same from year to year, so it adds nothing here. The official inflation rate leaves mortgage payments out too. ${LOCAL_HOME_COSTS} ${OWNER_YARDSTICK}`,
    owned:
      `With no mortgage payment, your home costs here are repairs. ${LOCAL_HOME_COSTS} ${OWNER_YARDSTICK}`,
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
 * person's renewal notice; `because` = verdict phrase ("mainly because of …");
 * `family` = the card the line sits in (a FAMILIES id); `about` = one plain sentence on
 * what the price covers, for the row's hover card. Labels for series-backed lines
 * match CALC_LINES in src/data/catalog.js (tested).
 */
export const LINES = {
  rent:      { label: "Rent", amount: 1650, because: "rent", family: "home",
               about: "Rent for the home or apartment you live in, not counting utilities." },
  mortgage:  { label: "Mortgage payment", amount: 1900, note: "Fixed payment", because: "your fixed mortgage payment", family: "home",
               about: "A fixed-rate payment stays the same from year to year, so its price change is zero." },
  upkeep:    { label: "Home repairs", amount: 130, note: "Estimate", because: "home repairs", family: "home",
               about: "Furniture, appliances and household services, the closest published prices to home repairs." },
  groceries: { label: "Groceries", amount: 620, because: "grocery prices", family: "food",
               about: "Food and drinks from stores, to eat at home." },
  dining:    { label: "Eating out", amount: 220, because: "restaurant prices", family: "food",
               about: "Meals and snacks from restaurants, cafeterias and takeout." },
  gasoline:  { label: "Gas for the car", amount: 190, hint: "Drive less or work from home? Lower this.", because: "gas prices", family: "around",
               about: "Gas at the pump, all grades." },
  charging:  { label: "Charging the car", amount: 55, because: "electricity prices", family: "around",
               about: "Home electricity prices, since most people charge at home." },
  carIns:    { label: "Car insurance", amount: 160, because: "car insurance", family: "around",
               about: "Premiums for car insurance." },
  carUpkeep: { label: "Car repairs", amount: 60, because: "car repairs", family: "around",
               about: "Repairs, maintenance and parts for your car." },
  transit:   { label: "Bus and train fares", amount: 90, because: "bus and train fares", family: "around",
               about: "Local bus, subway and train fares." },
  electric:  { label: "Electricity", amount: 110, because: "electricity prices", family: "util",
               about: "Electricity bills at home." },
  heatGas:   { label: "Natural gas bill", amount: 70, because: "natural gas prices", family: "util",
               about: "Natural gas piped to your home." },
  heatOil:   { label: "Heating oil", amount: 120, because: "heating oil prices", family: "util",
               about: "Heating oil and other fuels delivered to your home." },
  daycare:   { label: "Daycare", amount: 1100, because: "daycare costs", family: "kids",
               about: "Daycare and preschool." },
  tuition:   { label: "College tuition", amount: 900, because: "college tuition", family: "kids",
               about: "College tuition and fees." },
  health:    { label: "Health insurance", amount: 180, renewal: true, because: "health insurance", family: "health",
               about: "Your health insurance premium, using the increase on your renewal notice." },
  doctor:    { label: "Doctor and pharmacy", amount: 90, because: "doctor and pharmacy costs", family: "health",
               about: "Doctor visits and prescription drugs." },
  clothing:  { label: "Clothing", amount: 80, because: "clothing prices", family: "fun",
               about: "Clothes and shoes." },
  fun:       { label: "Entertainment", amount: 150, because: "entertainment prices", family: "fun",
               about: "Streaming and TV, pets, toys, sports gear and hobbies." },
  rest:      { label: "Everything else", amount: 250, note: "Estimated from the national rate", family: "rest",
               about: "Everything not listed above, like phone plans and personal care. Its price change is estimated from the national rate." },
};

/**
 * Kinds of spending, in the fixed order the cards and the mix bar use (never re-sorted
 * by size, so cards don't jump while someone drags a slider). `token` names the CSS
 * color token; the colors themselves live only in tokens.css.
 */
export const FAMILIES = [
  { id: "home", label: "Home", token: "--f-home" },
  { id: "around", label: "Getting around", token: "--f-around" },
  { id: "food", label: "Food", token: "--f-food" },
  { id: "util", label: "Utilities", token: "--f-util" },
  { id: "fun", label: "Clothing and fun", token: "--f-fun" },
  { id: "health", label: "Health", token: "--f-health" },
  { id: "kids", label: "Kids and school", token: "--f-kids" },
  { id: "rest", label: "Everything else", token: "--f-rest" },
];

/**
 * The average household's rows use basket ids (BASKET.visible in catalog.js, plus
 * "rest"). Some match a line id with a different meaning ("health" here is all medical
 * care; the line "health" is insurance), so basket rows get their own family and about
 * text. Never look a basket row up in LINES.
 */
export const BASKET_ROWS = {
  housing:   { family: "home", about: "Rent, plus what homeowners would pay to rent their own home." },
  groceries: { family: "food", about: "Food and drinks from stores, to eat at home." },
  dining:    { family: "food", about: "Meals and snacks from restaurants, cafeterias and takeout." },
  energy:    { family: "util", about: "Electricity, natural gas and other fuels used at home." },
  gasoline:  { family: "around", about: "Gas and other fuel at the pump." },
  health:    { family: "health", about: "Doctors, hospitals, prescription drugs and other medical care." },
  clothing:  { family: "fun", about: "Clothes and shoes." },
  fun:       { family: "fun", about: "Streaming and TV, pets, toys, sports gear and hobbies." },
  rest:      { family: "rest", about: "Everything else the average household buys, like cars, phone plans and personal care. Its price change is set so the total matches the national rate." },
};

/** The note on a health line that is still using EMPLOYER_HEALTH_DEFAULT. */
export const EMPLOYER_DEFAULT_NOTE = "Average for employer plans, change to yours";

/**
 * Quick-start households (spec "Quick starts"). Tapping one replaces every answer,
 * checkbox and amount edit (renewal rates are kept); all four questions count as
 * answered. Lines without an edit use their normal starting amount. Plain buttons,
 * never toggles: a quick start has no selected state.
 */
export const QUICK_STARTS = [
  {
    id: "renter", label: "Young renter",
    answered: { home: "rent", car: "none", heat: "included", health: "work" },
    also: { daycare: false, tuition: false },
    amounts: { rent: 1450, groceries: 380, dining: 300, fun: 180 },
  },
  {
    id: "family", label: "Family with kids",
    answered: { home: "mortgage", car: "gas", heat: "gas", health: "work" },
    also: { daycare: true, tuition: false },
    amounts: { groceries: 1100, gasoline: 280, dining: 260 },
  },
  {
    id: "commuter", label: "Commuter",
    answered: { home: "rent", car: "gas", heat: "electric", health: "work" },
    also: { daycare: false, tuition: false },
    amounts: { gasoline: 380, carUpkeep: 90 },
  },
  {
    id: "retiree", label: "Retiree",
    answered: { home: "owned", car: "hybrid", heat: "gas", health: "none" },
    also: { daycare: false, tuition: false },
    amounts: { doctor: 220, groceries: 520, gasoline: 90 },
  },
];
