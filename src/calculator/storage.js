// Saved answers, in this browser only (spec "States": inflation-reality:answers:v1).
// parseSaved is pure and does all validation; the rest wrap localStorage and never throw.

import { QUESTIONS, ALSO, LINES } from "./config.js";
import { emptyAnswers, isPersonal } from "./model.js";
import { clampAmount, clampRenewal } from "./format.js";

export const STORAGE_KEY = "inflation-reality:answers:v1";
export const STORAGE_VERSION = 1;

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

export function serializeAnswers(answers) {
  const { answered, also, amounts, renewals } = answers;
  return JSON.stringify({ version: STORAGE_VERSION, answered, also, amounts, renewals });
}

/**
 * Raw stored string → answers, or null when unparseable or another version.
 * Unknown questions, options, line ids and bad values are dropped one by one;
 * the rest is kept.
 */
export function parseSaved(raw) {
  if (typeof raw !== "string") return null;
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(saved) || saved.version !== STORAGE_VERSION) return null;

  const answers = emptyAnswers();
  const answered = isObject(saved.answered) ? saved.answered : {};
  for (const q of QUESTIONS) {
    if (q.options.some((o) => o.id === answered[q.id])) answers.answered[q.id] = answered[q.id];
  }
  const also = isObject(saved.also) ? saved.also : {};
  for (const a of ALSO) if (also[a.id] === true) answers.also[a.id] = true;
  if (isObject(saved.amounts)) {
    for (const [id, v] of Object.entries(saved.amounts)) {
      if (Object.hasOwn(LINES, id) && isNumber(v)) answers.amounts[id] = clampAmount(v);
    }
  }
  if (isObject(saved.renewals)) {
    for (const [id, v] of Object.entries(saved.renewals)) {
      if (!Object.hasOwn(LINES, id) || !LINES[id].renewal) continue;
      if (v === null) answers.renewals[id] = null;
      else if (isNumber(v)) answers.renewals[id] = clampRenewal(v);
    }
  }
  return answers;
}

/** window.localStorage, or null when the browser blocks access. */
export function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** True when writes actually work (Safari private mode and blocked site data fail here). */
export function storageAvailable(storage) {
  if (!storage) return false;
  try {
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function loadAnswers(storage) {
  try {
    return parseSaved(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

/** Saves personal answers; clears the key otherwise (Average, or after Start over). */
export function saveAnswers(storage, answers) {
  try {
    if (isPersonal(answers)) storage.setItem(STORAGE_KEY, serializeAnswers(answers));
    else storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
