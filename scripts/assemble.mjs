// scripts/assemble.mjs
// Turn raw FRED observations into the dynamic-only payload the app consumes.
import {
  parseObservations, computeYoY, computeMoM, computeMoMAnnualized,
  buildTrend, avgPrice, latestValue, referenceMonthLabel, weeklyPrice, weekLabel,
  yoyAnchorDate, shiftMonths,
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
  };
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
