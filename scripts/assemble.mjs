// scripts/assemble.mjs
// Turn raw FRED observations into the dynamic-only payload the app consumes.
import {
  parseObservations, computeYoY, computeMoM, computeMoMAnnualized,
  buildTrend, avgPrice, referenceMonthLabel,
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
  const refDate = latestNonNullDate(headObs);
  const referenceMonth = refDate ? refDate.slice(0, 7) : (fb.referenceMonth || "");
  const referenceMonthLabelStr = refDate ? referenceMonthLabel(refDate) : (fb.referenceMonthLabel || "");

  const macro = (spec, fbNode = {}) => {
    const level = obs(spec.seriesId);
    const sa = obs(spec.momSeriesId);
    const yoy = computeYoY(level);
    const mom = computeMoM(sa);
    const momAnnualized = computeMoMAnnualized(sa);
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
    const yoy = computeYoY(obs(c.seriesId));
    if (yoy == null) categories[c.id] = { yoy: fb.categories?.[c.id]?.yoy ?? null, stale: true };
    else categories[c.id] = { yoy };
  }

  const avgPrices = {};
  for (const p of catalog.AVG_PRICE_ITEMS) {
    const { current, yearAgo } = avgPrice(obs(p.seriesId));
    if (current == null) avgPrices[p.seriesId] = { ...(fb.avgPrices?.[p.seriesId] || { current: null, yearAgo: null }), stale: true };
    else avgPrices[p.seriesId] = { current, yearAgo };
  }

  const trend = headObs.length ? buildTrend(headObs, 12) : (fb.trend || []);

  return {
    generatedAt,
    referenceMonth,
    referenceMonthLabel: referenceMonthLabelStr,
    headline: macro(catalog.HEADLINE, fb.headline),
    core: macro(catalog.CORE, fb.core),
    categories,
    avgPrices,
    trend,
  };
}
