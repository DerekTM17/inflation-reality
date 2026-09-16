// Shape check for a fetched cpi.json before it replaces the bundled fallback.
// Deliberately loose: only the keys the legacy views cannot render without.
// The calculator's `lines` and `basket` are optional here; buildViewData turns
// their absence into nulls, and the page says the data is missing.

export function isPlausiblePayload(json) {
  return json !== null && typeof json === "object"
    && Array.isArray(json.trend)
    && json.categories !== null && typeof json.categories === "object" && !Array.isArray(json.categories);
}
