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
 *
 * Entries that are exactly 0 always stay 0. Entries that display "under $10"
 * (|value| < step/2, non-zero) also stay 0 and take no leftover steps, unless
 * every non-zero entry is that small, in which case they carry the total (the
 * exact-sum guarantee always wins). The remaining "eligible" entries floor
 * toward zero and then receive/lose leftover steps by largest/smallest
 * fractional remainder, same as before, but wrapping only across themselves.
 * Adding or removing a step prefers not to flip an eligible entry's sign
 * (removal takes from positive entries first, addition avoids pushing a
 * negative entry positive); when every preference is exhausted the sum
 * guarantee still wins. Ties go to the earlier index (later index for removal,
 * matching the original tie-break).
 */
export function allocateRounded(values, total, step = 10) {
  const n = values.length;
  if (n === 0) return [];
  const half = step / 2;
  const isZero = values.map((v) => v === 0);
  const isTiny = values.map((v, i) => !isZero[i] && Math.abs(v) < half);
  const anyBig = values.some((v, i) => !isZero[i] && !isTiny[i]);
  const eligible = [];
  for (let i = 0; i < n; i++) {
    if (isZero[i]) continue;
    if (isTiny[i] && anyBig) continue; // a bigger entry exists to carry the leftover instead
    eligible.push(i);
  }

  const units = values.map((v) => v / step);
  const floor = units.map(Math.floor);
  const frac = (i) => units[i] - floor[i];
  const out = new Array(n).fill(0);
  for (const i of eligible) out[i] = floor[i];

  let k = Math.round(total / step) - eligible.reduce((s, i) => s + floor[i], 0);
  if (k > 0) {
    // Largest remainder first; keep a negative-valued entry from going positive
    // as long as some other candidate can take the step instead.
    const order = eligible.slice().sort((a, b) => frac(b) - frac(a) || a - b);
    const safe = order.filter((i) => values[i] >= 0 || (out[i] + 1) * step <= 0);
    const risky = order.filter((i) => !(values[i] >= 0 || (out[i] + 1) * step <= 0));
    const queue = [...safe, ...risky, ...order];
    for (let j = 0; k > 0; j++, k--) out[queue[j % queue.length]] += 1;
  } else if (k < 0) {
    // Smallest remainder first; prefer taking from positive-valued entries so a
    // negative entry doesn't get pushed further negative unnecessarily.
    const order = eligible.slice().sort((a, b) => frac(a) - frac(b) || b - a);
    const safe = order.filter((i) => values[i] > 0);
    const risky = order.filter((i) => values[i] <= 0);
    const queue = [...safe, ...risky, ...order];
    for (let j = 0; k < 0; j++, k++) out[queue[j % queue.length]] -= 1;
  }
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
