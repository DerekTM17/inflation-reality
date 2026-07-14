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

export function computeYoY(observations) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prior = map.get(shiftMonths(d, -12));
  if (now == null || prior == null || prior === 0) return null;
  return round1((now / prior - 1) * 100);
}

export function computeMoM(observations) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prev = map.get(shiftMonths(d, -1));
  if (now == null || prev == null || prev === 0) return null;
  return round1((now / prev - 1) * 100);
}

export function computeMoMAnnualized(observations) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return null;
  const now = map.get(d);
  const prev = map.get(shiftMonths(d, -1));
  if (now == null || prev == null || prev === 0) return null;
  return round1(((now / prev) ** 12 - 1) * 100);
}

export function buildTrend(observations, count = 12) {
  const map = toMap(observations);
  const d = latestDate(observations);
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

export function avgPrice(observations) {
  const map = toMap(observations);
  const d = latestDate(observations);
  if (!d) return { current: null, yearAgo: null };
  const current = map.get(d) ?? null;
  const yearAgo = map.get(shiftMonths(d, -12)) ?? null;
  return { current, yearAgo };
}

export function monthLabel(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(-2)}`;
}

export function referenceMonthLabel(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}
