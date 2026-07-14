// Merge static catalog metadata with a dynamic payload (from cpi.json or fallback.json)
// into render-ready objects for the app. Pure; no side effects.

export function buildViewData(catalog, dynamic) {
  const { HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES } = catalog;

  const macro = (spec, node = {}) => ({
    ...spec,
    yoy: node.yoy ?? null,
    mom: node.mom ?? null,
    momAnnualized: node.momAnnualized ?? null,
    stale: node.stale ?? false,
  });

  const categories = CATEGORIES.map(c => ({
    ...c,
    yoy: dynamic.categories?.[c.id]?.yoy ?? null,
    stale: dynamic.categories?.[c.id]?.stale ?? false,
  }));

  const avgPrices = AVG_PRICE_ITEMS.map(p => ({
    ...p,
    current: dynamic.avgPrices?.[p.seriesId]?.current ?? null,
    yearAgo: dynamic.avgPrices?.[p.seriesId]?.yearAgo ?? null,
    stale: dynamic.avgPrices?.[p.seriesId]?.stale ?? false,
  }));

  const altMeasures = (ALT_MEASURES || []).map(m => ({
    ...m,
    yoy: dynamic.altMeasures?.[m.key]?.yoy ?? null,
    stale: dynamic.altMeasures?.[m.key]?.stale ?? false,
  }));

  return {
    generatedAt: dynamic.generatedAt ?? null,
    referenceMonth: dynamic.referenceMonth ?? null,
    referenceMonthLabel: dynamic.referenceMonthLabel ?? "",
    headline: macro(HEADLINE, dynamic.headline),
    core: macro(CORE, dynamic.core),
    categories,
    avgPrices,
    altMeasures,
    trend: dynamic.trend ?? [],
  };
}
