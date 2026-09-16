// scripts/compute.mjs
// Pure functions over FRED observation arrays. No network, no side effects.

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function parseObservations(raw) {
  return raw
    .map(o => ({ date: o.date, value: o.value === "." ? null : Number(o.value) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function shiftMonths(dateStr, n) {
  const [y, m] = dateStr.split("-").map(Number);
  const zero = (y * 12 + (m - 1)) + n;          // months since year 0
  const ny = Math.floor(zero / 12);
  const nm = (zero % 12) + 1;
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-01`;
}

function toMap(observations) {
  const map = new Map();
  for (const o of observations) map.set(o.date, o.value);
  return map;
}

function latestDate(observations) {
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value != null) return observations[i].date;
  }
  return null;
}

function round1(n) { return Math.round(n * 10) / 10; }

// The monthly functions below take an optional `anchor` (a YYYY-MM-01 date) to compute
// for a specific month instead of the latest one — see yoyAnchorDate.
export function computeYoY(observations, anchor) {
  const map = toMap(observations);
  const d = anchor ?? latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prior = map.get(shiftMonths(d, -12));
  if (now == null || prior == null || prior === 0) return null;
  return round1((now / prior - 1) * 100);
}

// The month a year-over-year figure should be reported for: the latest month, unless it
// has no year-ago observation (BLS never published October 2025, so October 2026 can't be
// compared), in which case step back up to maxLookback months to the newest month that can.
// If none can, return the latest month anyway, so the caller's YoY comes back null and the
// failure stays visible instead of quietly reporting an older month.
export function yoyAnchorDate(observations, maxLookback = 2) {
  const latest = latestDate(observations);
  if (!latest) return null;
  const map = toMap(observations);
  for (let i = 0; i <= maxLookback; i++) {
    const d = shiftMonths(latest, -i);
    const now = map.get(d);
    const prior = map.get(shiftMonths(d, -12));
    if (now != null && prior != null && prior !== 0) return d;
  }
  return latest;
}

export function computeMoM(observations, anchor) {
  const map = toMap(observations);
  const d = anchor ?? latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prev = map.get(shiftMonths(d, -1));
  if (now == null || prev == null || prev === 0) return null;
  return round1((now / prev - 1) * 100);
}

export function computeMoMAnnualized(observations, anchor) {
  const map = toMap(observations);
  const d = anchor ?? latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prev = map.get(shiftMonths(d, -1));
  if (now == null || prev == null || prev === 0) return null;
  return round1(((now / prev) ** 12 - 1) * 100);
}

export function buildTrend(observations, count = 12, anchor) {
  const map = toMap(observations);
  const d = anchor ?? latestDate(observations);
  if (!d) return [];
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = shiftMonths(d, -i);
    const now = map.get(month);
    const prior = map.get(shiftMonths(month, -12));
    const yoy = (now == null || prior == null || prior === 0) ? null : round1((now / prior - 1) * 100);
    const entry = { month: monthLabel(month), headline: yoy };
    if (yoy === null) entry.gap = true;
    out.push(entry);
  }
  return out;
}

export function latestValue(observations) {
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value != null) return observations[i].value;
  }
  return null;
}

export function avgPrice(observations, anchor) {
  const map = toMap(observations);
  const d = anchor ?? latestDate(observations);
  if (!d) return { current: null, yearAgo: null };
  const current = map.get(d) ?? null;
  const yearAgo = map.get(shiftMonths(d, -12)) ?? null;
  return { current, yearAgo };
}

const DAY_MS = 86400000;

// Average-price lookup for WEEKLY series (EIA fuel). avgPrice() can't be reused:
// it finds the year-ago value by exact key (shiftMonths(d,-12) → YYYY-MM-01), which
// only ever matches a monthly series. Weekly observations land on Mondays, so we take
// the observation closest to 365 days back and reject it if nothing falls within
// toleranceDays — 52 weeks is 364 days, so a real match is at most a day or two off.
export function weeklyPrice(observations, toleranceDays = 10) {
  const rows = observations.filter(o => o.value != null);
  if (!rows.length) return { current: null, yearAgo: null, asOf: null };
  const last = rows[rows.length - 1];
  const target = Date.parse(last.date) - 365 * DAY_MS;
  let best = null, bestGap = Infinity;
  for (const o of rows) {
    const gap = Math.abs(Date.parse(o.date) - target);
    if (gap < bestGap) { bestGap = gap; best = o; }
  }
  return {
    current: last.value,
    yearAgo: best && bestGap <= toleranceDays * DAY_MS ? best.value : null,
    asOf: last.date,
  };
}

// "Aug 31, 2026" — weekly readings need a day, unlike the monthly reference label.
export function weekLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

export function monthLabel(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(-2)}`;
}

export function referenceMonthLabel(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

// ── Calculator weights ────────────────────────────────────────────────────
export function round6(n) { return Math.round(n * 1e6) / 1e6; }

export function valueAt(observations, date) {
  const v = toMap(observations).get(date);
  return v == null ? null : v;
}

// Unrounded 12-month change at exactly `date` (no fallback to another month).
export function yoyAt(observations, date) {
  const map = toMap(observations);
  const now = map.get(date);
  const prior = map.get(shiftMonths(date, -12));
  if (now == null || prior == null || prior === 0) return null;
  return (now / prior - 1) * 100;
}

// BLS publishes relative importance for December. A component's weight in a later month t is
// its December weight moved by its own price change relative to all items:
//   w_i(t) = w_i(Dec) × (I_i,t / I_i,Dec) ÷ (I_all,t / I_all,Dec)
// Using December weights unrolled was off by 0.7 points for the basket residual in Aug 2026.
export function rolledWeights(parts, { allDec, allT }) {
  if (!(allDec > 0) || !(allT > 0)) return null;
  const allMove = allT / allDec;
  const out = {};
  for (const p of parts) {
    if (p.riDec == null || !(p.riDec >= 0)) return null;
    if (!(p.levelDec > 0) || !(p.levelT > 0)) return null;
    out[p.key] = p.riDec * (p.levelT / p.levelDec) / allMove;
  }
  return out;
}

// Combine parts' 12-month changes using their current-month shares: 1/(1+R) = Σ s_i/(1+r_i).
// Exact for a fixed basket across the window; approximate when it crosses January's reweighting.
export function combineRates(weights, rates) {
  const keys = Object.keys(weights);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  if (!(total > 0)) return null;
  let inverse = 0;
  for (const k of keys) {
    if (rates[k] == null) return null;
    inverse += (weights[k] / total) / (1 + rates[k] / 100);
  }
  return (1 / inverse - 1) * 100;
}

// The rate for "everything else" (weight 100 − Σ visible) that makes the visible parts plus the
// rest reproduce the headline: 1+r_rest = s_rest ÷ (1/(1+R) − Σ s_i/(1+r_i)).
export function residualRate(headlinePct, weights, rates, minRest = 10) {
  if (headlinePct == null) return null;
  const keys = Object.keys(weights);
  const rest = 100 - keys.reduce((s, k) => s + weights[k], 0);
  if (rest < minRest) return null;
  let visibleInverse = 0;
  for (const k of keys) {
    if (rates[k] == null) return null;
    visibleInverse += (weights[k] / 100) / (1 + rates[k] / 100);
  }
  const restInverse = 1 / (1 + headlinePct / 100) - visibleInverse;
  if (!(restInverse > 0)) return null;
  return ((rest / 100) / restInverse - 1) * 100;
}
