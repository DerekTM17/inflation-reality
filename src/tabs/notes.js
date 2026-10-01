// Notes shared by the National numbers and Price check tabs, in the voice guide's
// wording (the old StaleNote and yoyGap notes used em dashes and "CPI"). Pure.

import { joinAnd, monthLabel } from "../calculator/format.js";

/** "Using the last known value for Median CPI and Core PCE." null when nothing is stale. */
export function staleNote(labels, noun = "value") {
  if (!labels || labels.length === 0) return null;
  return `Using the last known ${noun} for ${joinAnd(labels)}.`;
}

/** Why the numbers are for an older month than the newest release. null when there is no gap. */
export function gapNote(data) {
  if (!data.yoyGap) return null;
  return `The newest price data is for ${data.yoyGap.latestMonthLabel}, but no figures were published for ${data.yoyGap.missingMonthLabel}, so these numbers use ${monthLabel(data.referenceMonth)}.`;
}
