// Merge static catalog metadata with a dynamic payload (from cpi.json or fallback.json)
// into render-ready objects for the app. Pure; no side effects.

export function buildViewData(catalog, dynamic) {
  const {
    HEADLINE, CORE, CATEGORIES, AVG_PRICE_ITEMS, ALT_MEASURES, WEEKLY_PRICES,
    CALC_LINES, CALC_COMBOS, BASKET,
  } = catalog;

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

  const weeklyPrices = (WEEKLY_PRICES || []).map(w => ({
    ...w,
    current: dynamic.weeklyPrices?.[w.key]?.current ?? null,
    yearAgo: dynamic.weeklyPrices?.[w.key]?.yearAgo ?? null,
    asOf: dynamic.weeklyPrices?.[w.key]?.asOf ?? null,
    asOfLabel: dynamic.weeklyPrices?.[w.key]?.asOfLabel ?? "",
    stale: dynamic.weeklyPrices?.[w.key]?.stale ?? false,
  }));

  // Calculator lines, keyed by id (CALC_LINES plus combos such as "doctor"). A line
  // with no published value has yoy null, never 0. Values stay at stored precision
  // (6 decimals); display rounds.
  const lines = Object.fromEntries(
    [...(CALC_LINES || []), ...(CALC_COMBOS || [])].map((l) => [l.id, {
      id: l.id,
      label: l.label,
      source: l.source,
      yoy: dynamic.lines?.[l.id]?.yoy ?? null,
      stale: dynamic.lines?.[l.id]?.stale ?? false,
    }]),
  );

  // Average-household basket. The payload keys weights and rates by visible id; a
  // stale basket may be a bare { stale: true }, so every field defaults to null.
  const b = dynamic.basket ?? {};
  const basket = {
    month: b.month ?? null,
    items: (BASKET?.visible || []).map((v) => ({
      id: v.id,
      label: v.label,
      weight: b.weights?.[v.id] ?? null,
      rate: b.rates?.[v.id] ?? null,
    })),
    restWeight: b.restWeight ?? null,
    residualYoy: b.residualYoy ?? null,
    headlineYoy: b.headlineYoy ?? null,
    stale: b.stale ?? false,
  };

  return {
    generatedAt: dynamic.generatedAt ?? null,
    referenceMonth: dynamic.referenceMonth ?? null,
    referenceMonthLabel: dynamic.referenceMonthLabel ?? "",
    yoyGap: dynamic.yoyGap ?? null,
    headline: macro(HEADLINE, dynamic.headline),
    core: macro(CORE, dynamic.core),
    categories,
    avgPrices,
    altMeasures,
    weeklyPrices,
    trend: dynamic.trend ?? [],
    lines,
    basket,
  };
}

// Given a list of merged items (categories/avgPrices/altMeasures/weeklyPrices entries,
// or the headline/core macro nodes passed ad hoc as [headline, core]), return the
// display labels of the stale ones — the input for a "using last known value" note
// in the UI. Items carry their display name as `label`, except avgPrices, which uses
// `item`.
export function staleLabels(items) {
  return (items || [])
    .filter((i) => i && i.stale)
    .map((i) => i.label ?? i.item)
    .filter(Boolean);
}
