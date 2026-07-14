// scripts/fetch-fred.mjs
// Build-time entry: fetch FRED series server-side (key from env), assemble, write public/cpi.json.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { assemblePayload } from "./assemble.mjs";
// Import the whole catalog namespace and pass it straight through, so adding a new
// catalog export (e.g. a new measure group) can never be silently dropped here.
import * as catalog from "../src/data/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OBSERVATION_START = "2019-01-01"; // enough history for trailing-12 YoY on any month

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

  const fallback = JSON.parse(readFileSync(resolve(ROOT, "src/data/fallback.json"), "utf8"));
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

  const payload = assemblePayload({
    observationsBySeries,
    catalog,
    fallback,
    generatedAt: new Date().toISOString(),
  });

  mkdirSync(resolve(ROOT, "public"), { recursive: true });
  writeFileSync(resolve(ROOT, "public/cpi.json"), JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote public/cpi.json — reference month ${payload.referenceMonth}, ${successes}/${series.length} series live.`);
}

main().catch(err => { console.error(err); process.exit(1); });
