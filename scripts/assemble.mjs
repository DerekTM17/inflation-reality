// scripts/assemble.mjs
// Turn raw FRED observations into the dynamic-only payload the app consumes.
import {
  parseObservations, computeYoY, computeMoM, computeMoMAnnualized,
  buildTrend, avgPrice, latestValue, referenceMonthLabel, weeklyPrice, weekLabel,
  yoyAnchorDate, shiftMonths,
  valueAt, yoyAt, round6, rolledWeights, combineRates, residualRate,
} from "./compute.mjs";

// latestDateLabel isn't exported by compute; derive reference month from the headline series here.
function latestNonNullDate(observations) {
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value != null) return observations[i].date;
  }
  return null;
}

export function assemblePayload({ observationsBySeries, catalog, fallback, generatedAt }) {
  const obs = (id) => parseObservations(observationsBySeries[id] || []);
  const fb = fallback || {};

  const headObs = obs(catalog.HEADLINE.seriesId);
  const latestHeadDate = latestNonNullDate(headObs);
  // Normally the latest month. When that month has no year-ago figure (every CPI series is
  // missing October 2025, so October 2026 can't produce a year-over-year change), this steps
  // back to the newest month that can, and yoyGap records why so the page can say so.
  const refDate = yoyAnchorDate(headObs);
  const yoyGap = latestHeadDate && refDate && refDate !== latestHeadDate
    ? {
        latestMonth: latestHeadDate.slice(0, 7),
        latestMonthLabel: referenceMonthLabel(latestHeadDate),
        missingMonthLabel: referenceMonthLabel(shiftMonths(latestHeadDate, -12)),
      }
    : null;
  // Pin CPI series to the reference month only when there IS a gap. Otherwise each series
  // keeps its own latest month, as before — FRED can post one release's series hours apart.
  const anchor = yoyGap ? refDate : undefined;
  const referenceMonth = refDate ? refDate.slice(0, 7) : (fb.referenceMonth || "");
  const referenceMonthLabelStr = refDate ? referenceMonthLabel(refDate) : (fb.referenceMonthLabel || "");

  const macro = (spec, fbNode = {}) => {
    const level = obs(spec.seriesId);
    const sa = obs(spec.momSeriesId);
    const yoy = computeYoY(level, anchor);
    const mom = computeMoM(sa, anchor);
    const momAnnualized = computeMoMAnnualized(sa, anchor);
    // headline/core draw from two series (yoy from seriesId, mom from momSeriesId);
    // if EITHER sub-series had to fall back, the entry is stale — not only when both fail.
    const usedFallback = yoy == null || mom == null;
    return {
      yoy: yoy ?? fbNode.yoy ?? null,
      mom: mom ?? fbNode.mom ?? null,
      momAnnualized: momAnnualized ?? fbNode.momAnnualized ?? null,
      ...(usedFallback ? { stale: true } : {}),
    };
  };

  const categories = {};
  for (const c of catalog.CATEGORIES) {
    const yoy = computeYoY(obs(c.seriesId), anchor);
    if (yoy == null) categories[c.id] = { yoy: fb.categories?.[c.id]?.yoy ?? null, stale: true };
    else categories[c.id] = { yoy };
  }

  const avgPrices = {};
  for (const p of catalog.AVG_PRICE_ITEMS) {
    const { current, yearAgo } = avgPrice(obs(p.seriesId), anchor);
    if (current == null) avgPrices[p.seriesId] = { ...(fb.avgPrices?.[p.seriesId] || { current: null, yearAgo: null }), stale: true };
    else avgPrices[p.seriesId] = { current, yearAgo };
  }

  const trend = headObs.length ? buildTrend(headObs, 12, anchor) : (fb.trend || []);

  // Alt measures and weekly fuel keep their own latest dates: they come from other
  // publishers (BEA, the regional Feds, EIA) on other schedules, not the BLS CPI release.
  const altMeasures = {};
  for (const m of catalog.ALT_MEASURES || []) {
    const series = obs(m.seriesId);
    const raw = m.kind === "index" ? computeYoY(series) : latestValue(series);
    if (raw == null) altMeasures[m.key] = { yoy: fb.altMeasures?.[m.key]?.yoy ?? null, stale: true };
    else altMeasures[m.key] = { yoy: parseFloat(raw.toFixed(1)) };
  }

  const weeklyPrices = {};
  for (const w of catalog.WEEKLY_PRICES || []) {
    const { current, yearAgo, asOf } = weeklyPrice(obs(w.seriesId));
    if (current == null) weeklyPrices[w.key] = { ...(fb.weeklyPrices?.[w.key] || { current: null, yearAgo: null, asOf: null }), stale: true };
    else weeklyPrices[w.key] = { current, yearAgo, asOf, asOfLabel: weekLabel(asOf) };
  }

  const lines = (catalog.CALC_LINES || catalog.CALC_COMBOS)
    ? calculatorLines(obs, catalog, refDate, fb.lines)
    : null;
  const basket = catalog.BASKET ? averageBasket(obs, catalog.BASKET, refDate, headObs, fb.basket) : null;

  return {
    generatedAt,
    referenceMonth,
    referenceMonthLabel: referenceMonthLabelStr,
    ...(yoyGap ? { yoyGap } : {}),
    headline: macro(catalog.HEADLINE, fb.headline),
    core: macro(catalog.CORE, fb.core),
    categories,
    avgPrices,
    altMeasures,
    weeklyPrices,
    trend,
    ...(lines ? { lines } : {}),
    ...(basket ? { basket } : {}),
  };
}

// ── Calculator lines and the average-household basket ─────────────────────
// Unlike categories (pinned to the reference month only when there is a yoyGap), these are
// ALWAYS computed at the reference month: the basket residual combines them with the headline,
// so every rate must describe the same month — BLS can post a month before FRED mirrors it.
// No value for that month (or its year-ago) means stale, carrying the last known value.
function calculatorLines(obs, catalog, refDate, fbLines) {
  const lines = {};
  const set = (id, yoy) => {
    lines[id] = yoy == null
      ? { yoy: fbLines?.[id]?.yoy ?? null, stale: true }
      : { yoy: round6(yoy) };
  };
  for (const l of catalog.CALC_LINES || []) set(l.id, refDate ? yoyAt(obs(l.seriesId), refDate) : null);

  // Combos roll their parts' December weights forward the same way the basket does, so they
  // need BASKET.riYear for the December date. A catalog with CALC_COMBOS but no BASKET leaves
  // decDate null, so every combo falls back permanently (set() below) with no warning that
  // distinguishes "catalog missing BASKET" from "series unreadable" — a manifest bug, not a data one.
  const decDate = catalog.BASKET ? `${catalog.BASKET.riYear}-12-01` : null;
  for (const c of catalog.CALC_COMBOS || []) {
    let yoy = null;
    if (refDate && decDate) {
      // The parts form one aggregate, so the all-items factor cancels: roll by their own prices.
      const weights = rolledWeights(
        c.parts.map((p) => ({
          key: p.seriesId,
          riDec: p.riDec,
          levelDec: valueAt(obs(p.seriesId), decDate),
          levelT: valueAt(obs(p.seriesId), refDate),
        })),
        { allDec: 1, allT: 1 },
      );
      const rates = Object.fromEntries(c.parts.map((p) => [p.seriesId, yoyAt(obs(p.seriesId), refDate)]));
      yoy = weights ? combineRates(weights, rates) : null;
    }
    set(c.id, yoy);
  }
  return lines;
}

const mapValues = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));

function averageBasket(obs, basket, refDate, headObs, fbBasket) {
  if (refDate) {
    const decDate = `${basket.riYear}-12-01`;
    const weights = rolledWeights(
      basket.visible.map((v) => ({
        key: v.id,
        riDec: v.riDec,
        levelDec: valueAt(obs(v.seriesId), decDate),
        levelT: valueAt(obs(v.seriesId), refDate),
      })),
      { allDec: valueAt(headObs, decDate), allT: valueAt(headObs, refDate) },
    );
    const rates = Object.fromEntries(basket.visible.map((v) => [v.id, yoyAt(obs(v.seriesId), refDate)]));
    const headlineYoy = yoyAt(headObs, refDate);
    const residualYoy = weights && headlineYoy != null ? residualRate(headlineYoy, weights, rates) : null;
    if (residualYoy != null) {
      const visibleTotal = Object.values(weights).reduce((s, w) => s + w, 0);
      return {
        month: refDate.slice(0, 7),
        weights: mapValues(weights, round6),
        rates: mapValues(rates, round6),
        restWeight: round6(100 - visibleTotal),
        residualYoy: round6(residualYoy),
        headlineYoy: round6(headlineYoy),
      };
    }
  }
  return { ...(fbBasket || {}), stale: true };
}

// Ids of BLS-sourced calculator lines that are stale or missing. scripts/check-lines.mjs fails
// the run (after deploy) when this is non-empty, so an expired BLS key can't go unnoticed.
export function staleBlsLines(payload, catalog) {
  const ids = [
    ...(catalog.CALC_LINES || []).filter((l) => l.source === "bls").map((l) => l.id),
    ...(catalog.CALC_COMBOS || []).filter((c) => c.source === "bls").map((c) => c.id),
  ];
  return ids.filter((id) => !payload?.lines?.[id] || payload.lines[id].stale === true);
}

// Diagnostic-only re-check of what rolledWeights/residualRate needed for the basket, run
// independently of averageBasket so a stale basket's warning can name which series caused it
// without averageBasket itself dropping the all-or-nothing rule (see the comment there) or any
// published number being touched. `getObs` is the same `obs(id)` accessor assemblePayload uses.
function basketFailureIds(getObs, basket, catalog, refDate, headObs) {
  if (!refDate) return [];
  const decDate = `${basket.riYear}-12-01`;
  const ids = [];
  if (!(valueAt(headObs, decDate) > 0) || !(valueAt(headObs, refDate) > 0)) ids.push(catalog.HEADLINE.seriesId);
  for (const v of basket.visible) {
    // Mirror rolledWeights' own guards exactly: `null >= 0` is true in JS, so riDec needs its
    // own null check first or a missing weight reads as valid here.
    const ok = v.riDec != null && v.riDec >= 0
      && valueAt(getObs(v.seriesId), decDate) > 0 && valueAt(getObs(v.seriesId), refDate) > 0;
    if (!ok) ids.push(v.seriesId);
  }
  return ids;
}

// Build-log warnings for calculator data; fetch-fred.mjs prints each as a ::warning:: annotation.
// `catalog`/`observationsBySeries` are optional (older calls, and most tests, still get the
// generic message) — pass both to have a stale basket name the series that caused it.
export function calculatorWarnings(payload, catalog, observationsBySeries, maxResidualGap = 3) {
  const out = [];
  const stale = Object.entries(payload?.lines || {}).filter(([, v]) => v.stale).map(([id]) => id);
  if (stale.length) out.push(`Calculator lines on a last known value: ${stale.join(", ")}`);
  const b = payload?.basket;
  if (!b || b.stale) {
    let ids = [];
    if (catalog?.BASKET && observationsBySeries && payload?.referenceMonth) {
      const getObs = (id) => parseObservations(observationsBySeries[id] || []);
      ids = basketFailureIds(getObs, catalog.BASKET, catalog, `${payload.referenceMonth}-01`, getObs(catalog.HEADLINE.seriesId));
    }
    out.push(
      ids.length
        ? `Average-household basket fell back to a last known value (unreadable: ${ids.join(", ")})`
        : "Average-household basket fell back to a last known value",
    );
  } else if (Math.abs(b.residualYoy - b.headlineYoy) > maxResidualGap) {
    out.push(`Everything else rate ${b.residualYoy.toFixed(2)}% is more than ${maxResidualGap} points from the headline ${b.headlineYoy.toFixed(2)}%`);
  }
  return out;
}

// Which macro nodes (headline/core) are running on a fallback value rather than
// a fresh fetch. Unlike categories/prices/alt measures, these two are load-bearing
// for the whole dashboard, so the build treats a stale one as fatal (see fetch-fred.mjs).
// A missing node (e.g. a malformed payload) counts as stale too, not healthy.
export function staleMacroKeys(payload) {
  return ["headline", "core"].filter((key) => {
    const node = payload?.[key];
    return !node || node.stale === true;
  });
}
