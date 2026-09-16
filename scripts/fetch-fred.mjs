// scripts/fetch-fred.mjs
// Build-time entry: fetch FRED series server-side (key from env), assemble, write public/cpi.json.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { assemblePayload, staleMacroKeys, calculatorWarnings } from "./assemble.mjs";
import { BLS_API_URL, blsRequestBody, parseBlsResponse } from "./bls.mjs";
// Import the whole catalog namespace and pass it straight through, so adding a new
// catalog export (e.g. a new measure group) can never be silently dropped here.
import * as catalog from "../src/data/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OBSERVATION_START = "2019-01-01"; // enough history for trailing-12 YoY on any month

const DEPLOYED_CPI_URL = "https://derektm17.github.io/inflation-reality/cpi.json";

// GitHub Actions annotation: shows on the run summary, not only in the log.
const warn = (title, message) => console.log(`::warning title=${title}::${message}`);

// BLS-only series in one POST. Never throws: a failed request returns ok:false and every id
// missing, so those lines fall back and check-lines.mjs turns the run red after deploy.
async function fetchBls(ids, registrationKey) {
  const year = new Date().getUTCFullYear();
  // Reach back to the basket's December weights month as well as a full year of history.
  const startYear = Math.min(year - 2, catalog.BASKET.riYear);
  try {
    const res = await fetch(BLS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blsRequestBody(ids, { startYear, endYear: year, registrationKey })),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, bySeries: {}, missing: [...ids] };
    return parseBlsResponse(await res.json(), ids);
  } catch (err) {
    return { ok: false, error: err.message, bySeries: {}, missing: [...ids] };
  }
}

// What production serves right now: fresher last-known values than the bundled snapshot.
// Three distinct ways this can come back null read identically in a build log unless each
// is named: the site being unreachable or its JSON unparseable, an HTTP error, and a response
// that parses but isn't a cpi.json we recognize (also the shape of a healthy first run, before
// anything has ever deployed). Never log the response body itself, just which case this was.
async function loadDeployedPayload() {
  let json;
  try {
    const res = await fetch(DEPLOYED_CPI_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      warn("Deployed cpi.json", `HTTP ${res.status} from the deployed site. Falling back to the bundled snapshot only.`);
      return null;
    }
    json = await res.json();
  } catch (err) {
    warn("Deployed cpi.json", `Fetch or parse failed: ${err.message}. Falling back to the bundled snapshot only.`);
    return null;
  }
  if (!(json && typeof json === "object" && json.headline)) {
    warn("Deployed cpi.json", "Response has no headline field — not a cpi.json we recognize, or the site has never deployed. Falling back to the bundled snapshot only.");
    return null;
  }
  return json;
}

async function fetchSeries(id, apiKey) {
  const url = `https://api.stlouisfed.org/fred/series/observations`
    + `?series_id=${id}&api_key=${apiKey}&file_type=json&observation_start=${OBSERVATION_START}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${id} → HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json.observations)) throw new Error(`FRED ${id} → no observations`);
  return json.observations.map(o => ({ date: o.date, value: o.value }));
}

async function main() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error("FATAL: FRED_API_KEY is not set. Add it as a GitHub Actions secret.");
    process.exit(1);
  }

  const bundledFallback = JSON.parse(readFileSync(resolve(ROOT, "src/data/fallback.json"), "utf8"));
  const series = catalog.allSeries();
  const observationsBySeries = {};
  let successes = 0;

  for (const { id } of series) {
    try {
      observationsBySeries[id] = await fetchSeries(id, apiKey);
      successes++;
    } catch (err) {
      console.warn(`WARN: ${err.message} — will fall back for this series.`);
      observationsBySeries[id] = [];
    }
  }

  if (successes === 0) {
    console.error("FATAL: every FRED request failed. Not overwriting cpi.json.");
    process.exit(1);
  }

  // BLS-only calculator series (not mirrored on FRED). Non-fatal here by design.
  const blsIds = catalog.blsSeries();
  let blsLive = 0;
  const blsKey = process.env.BLS_API_KEY;
  if (!blsKey) {
    warn("BLS API", "BLS_API_KEY is not set, so BLS calculator lines will use last known values.");
  } else {
    const bls = await fetchBls(blsIds, blsKey);
    if (!bls.ok) warn("BLS API", `Request failed: ${bls.error}. BLS keys must be renewed every year.`);
    else if (bls.missing.length) warn("BLS API", `No data for ${bls.missing.join(", ")}.`);
    for (const id of blsIds) observationsBySeries[id] = bls.bySeries[id] || [];
    blsLive = blsIds.length - bls.missing.length;
  }

  // Last known values: production's current cpi.json layered over the bundled snapshot.
  const deployed = await loadDeployedPayload();
  const fallback = { ...bundledFallback, ...(deployed || {}) };

  const payload = assemblePayload({
    observationsBySeries,
    catalog,
    fallback,
    generatedAt: new Date().toISOString(),
  });

  // Headline/core are load-bearing for the whole dashboard — unlike categories/prices/alt
  // measures, which are allowed to degrade to a fallback value, a stale macro node fatals
  // the build rather than shipping a frozen number silently (this happened for 5 weeks
  // when CPILFESNS quietly 404'd — see the comment on CORE in catalog.js).
  const staleKeys = staleMacroKeys(payload);
  if (staleKeys.length > 0) {
    const idsFor = (key) => {
      const spec = key === "headline" ? catalog.HEADLINE : catalog.CORE;
      return `${spec.seriesId} (yoy), ${spec.momSeriesId} (mom)`;
    };
    console.error(
      `FATAL: macro series fell back to a cached value — ${staleKeys.map(k => `${k} [${idsFor(k)}]`).join(", ")}. Not overwriting cpi.json.`,
    );
    process.exit(1);
  }

  mkdirSync(resolve(ROOT, "public"), { recursive: true });
  writeFileSync(resolve(ROOT, "public/cpi.json"), JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote public/cpi.json — reference month ${payload.referenceMonth}, ${successes + blsLive}/${series.length + blsIds.length} series live (FRED + BLS).`);
  for (const message of calculatorWarnings(payload, catalog, observationsBySeries)) warn("Calculator data", message);
  if (payload.yoyGap) {
    console.log(`Note: ${payload.yoyGap.latestMonthLabel} has no year-ago figure (${payload.yoyGap.missingMonthLabel} was never published), so CPI figures are for ${payload.referenceMonthLabel}.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
