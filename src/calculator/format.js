// Display formatting and rounding for the Your costs calculator. Pure.
// Rules come from the spec's "Numbers" section.

const MINUS = "−"; // U+2212, never a hyphen, in displayed negatives
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Round to one decimal (display precision). null stays null. */
export function round1(n) {
  if (n == null) return null;
  const r = Math.round(n * 10) / 10;
  return r === 0 ? 0 : r; // drop -0
}

/** "+24.6%", "−4.5%", "0.0%"; a fixed mortgage passes { fixed: true } and shows "0%". */
export function formatRate(pct, { fixed = false } = {}) {
  if (fixed) return "0%";
  if (pct == null) return "";
  const r = round1(pct);
  if (r === 0) return "0.0%";
  return `${r > 0 ? "+" : MINUS}${Math.abs(r).toFixed(1)}%`;
}

/** "rose 3.4%", "fell 0.5%", "did not change" — for sentences like "Prices overall rose 3.4%." */
export function movePhrase(pct) {
  const r = round1(pct);
  if (r === 0) return "did not change";
  return `${r > 0 ? "rose" : "fell"} ${Math.abs(r).toFixed(1)}%`;
}

/** "$1,450" from the absolute value, whole dollars. The caller supplies any sign or wording. */
export function formatDollars(n) {
  const whole = String(Math.round(Math.abs(n)));
  return "$" + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "+$150", "−$40", "$0". */
export function signedDollars(n) {
  if (n === 0) return "$0";
  return (n > 0 ? "+" : MINUS) + formatDollars(n);
}

/** Round half away from zero to a step (50 for totals, 10 for lines), so −125 → −150 like 125 → 150. */
export function roundToStep(n, step) {
  const v = Math.sign(n) * Math.round(Math.abs(n) / step) * step;
  return v === 0 ? 0 : v;
}

/**
 * Largest-remainder allocation: round each value to `step` so the results sum
 * exactly to `total` (already a multiple of `step`). Works with mixed signs.
 * Floors every value, then hands the leftover steps to the largest fractional
 * parts (or takes them from the smallest when the floors overshoot). Ties go to
 * the earlier index.
 */
export function allocateRounded(values, total, step = 10) {
  const units = values.map((v) => v / step);
  const out = units.map(Math.floor);
  if (out.length === 0) return out;
  const order = units
    .map((u, i) => ({ i, frac: u - out[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  let k = Math.round(total / step) - out.reduce((s, u) => s + u, 0);
  for (let j = 0; k > 0; j++, k--) out[order[j % order.length].i] += 1;
  for (let j = 0; k < 0; j++, k++) out[order[order.length - 1 - (j % order.length)].i] -= 1;
  return out.map((u) => (u === 0 ? 0 : u * step));
}

/**
 * Horizontal bar placement for values that may be negative. Returns
 * { left, width } in percent of the track. Zero sits at the left edge when
 * nothing is negative; otherwise it moves right so decreases extend left.
 */
export function barGeometry(values) {
  const pos = Math.max(0, ...values);
  const neg = Math.max(0, ...values.map((v) => -v));
  const span = pos + neg;
  if (span === 0) return values.map(() => ({ left: 0, width: 0 }));
  const zero = (neg / span) * 100;
  return values.map((v) => {
    const width = (Math.abs(v) / span) * 100;
    return { left: v < 0 ? zero - width : zero, width };
  });
}

/** "2026-08" → "August 2026"; yearOffset −1 → "August 2025". Missing month → "". */
export function monthLabel(referenceMonth, yearOffset = 0) {
  const m = /^(\d{4})-(\d{2})$/.exec(referenceMonth ?? "");
  if (!m) return "";
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[1]) + yearOffset}`;
}

/** ["a"] → "a"; ["a","b"] → "a and b"; ["a","b","c"] → "a, b, and c". */
export function joinAnd(items) {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Whole dollars a month, clamped 0–100,000. */
export function clampAmount(n) {
  return Math.min(100000, Math.max(0, Math.round(n)));
}

/** Renewal increase in percent, one decimal, clamped −50 to 100. */
export function clampRenewal(n) {
  const r = Math.min(100, Math.max(-50, Math.round(n * 10) / 10));
  return r === 0 ? 0 : r;
}

/** Text typed into an amount box → a clamped number. Blank or non-numeric counts as 0. */
export function parseAmountInput(text) {
  const n = Number(String(text).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? clampAmount(n) : 0;
}

/** Text typed into a renewal box → clamped number, or null when blank (the line leaves the total). */
export function parseRenewalInput(text) {
  const t = String(text).replace(/[%\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? clampRenewal(n) : 0;
}
