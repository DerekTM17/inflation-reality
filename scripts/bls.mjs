// scripts/bls.mjs
// BLS Public Data API v2: request body and response parsing. Pure — the network call lives in
// fetch-fred.mjs. Rows come out in the raw FRED observation shape ({ date: "YYYY-MM-01",
// value: "123.456" | "." }, oldest first), so parseObservations/compute/assemble need no
// BLS-specific logic. A missing month must become "." (not null): parseObservations turns "."
// into null, but Number(null) would be a real zero.

export const BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

export function blsRequestBody(seriesIds, { startYear, endYear, registrationKey }) {
  return {
    seriesid: seriesIds,
    startyear: String(startYear),
    endyear: String(endYear),
    registrationkey: registrationKey,
  };
}

const MONTHLY_PERIOD = /^M(0[1-9]|1[0-2])$/; // M01–M12; drops M13 annual averages

// ok:false → the whole request failed (quota, bad key, malformed): every requested id is missing.
// ok:true  → `missing` lists requested ids that came back with no monthly rows.
export function parseBlsResponse(json, requestedIds) {
  if (!json || json.status !== "REQUEST_SUCCEEDED") {
    const detail = Array.isArray(json?.message) && json.message.length
      ? json.message.join(" ")
      : `status ${json?.status ?? "missing"}`;
    return { ok: false, error: detail, bySeries: {}, missing: [...requestedIds] };
  }
  const bySeries = {};
  for (const s of json.Results?.series ?? []) {
    const rows = (s.data ?? [])
      .filter((d) => MONTHLY_PERIOD.test(d.period))
      .map((d) => ({
        date: `${d.year}-${d.period.slice(1)}-01`,
        value: d.value === "-" || d.value === "" || d.value == null ? "." : String(d.value),
      }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (rows.length) bySeries[s.seriesID] = rows;
  }
  return { ok: true, error: null, bySeries, missing: requestedIds.filter((id) => !bySeries[id]) };
}
