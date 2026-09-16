import { test } from "node:test";
import assert from "node:assert/strict";
import { blsRequestBody, parseBlsResponse } from "./bls.mjs";
import { parseObservations } from "./compute.mjs";

// Shape of a live v2 response (checked 2026-09-14): series newest first; "-" for a month BLS
// never published (October 2025); M13 annual averages appear only if annualaverage is requested.
const ok = {
  status: "REQUEST_SUCCEEDED",
  message: ["No Data Available for Series CUUR0000XXXX Year: 2026"],
  Results: {
    series: [
      {
        seriesID: "CUUR0000SETE",
        data: [
          { year: "2026", period: "M08", periodName: "August", latest: "true", value: "912.345", footnotes: [{}] },
          { year: "2025", period: "M13", periodName: "Annual", value: "900.000", footnotes: [{}] },
          { year: "2025", period: "M11", periodName: "November", value: "901.000", footnotes: [{}] },
          { year: "2025", period: "M10", periodName: "October", value: "-", footnotes: [{ code: "X", text: "Data unavailable." }] },
          { year: "2025", period: "M08", periodName: "August", value: "955.100", footnotes: [{}] },
        ],
      },
      { seriesID: "CUUR0000XXXX", data: [] },
    ],
  },
};

test("blsRequestBody uses the exact v2 field names, years as strings", () => {
  assert.deepEqual(
    blsRequestBody(["A", "B"], { startYear: 2024, endYear: 2026, registrationKey: "k" }),
    { seriesid: ["A", "B"], startyear: "2024", endyear: "2026", registrationkey: "k" },
  );
});

test("parseBlsResponse returns FRED-shaped rows, oldest first, without annual averages", () => {
  const r = parseBlsResponse(ok, ["CUUR0000SETE", "CUUR0000XXXX"]);
  assert.equal(r.ok, true);
  assert.equal(r.error, null);
  assert.deepEqual(r.bySeries.CUUR0000SETE, [
    { date: "2025-08-01", value: "955.100" },
    { date: "2025-10-01", value: "." },
    { date: "2025-11-01", value: "901.000" },
    { date: "2026-08-01", value: "912.345" },
  ]);
  assert.deepEqual(r.missing, ["CUUR0000XXXX"]);
});

test('a "-" month reads as null through parseObservations, never as zero', () => {
  const obs = parseObservations(parseBlsResponse(ok, ["CUUR0000SETE"]).bySeries.CUUR0000SETE);
  assert.equal(obs.find(o => o.date === "2025-10-01").value, null);
});

test("a requested id BLS does not mention at all is missing too", () => {
  assert.deepEqual(parseBlsResponse(ok, ["CUUR0000SETE", "CUUR0000ZZZZ"]).missing, ["CUUR0000ZZZZ"]);
});

test("any status other than REQUEST_SUCCEEDED fails the whole request", () => {
  const r = parseBlsResponse(
    { status: "REQUEST_NOT_PROCESSED", message: ["The daily threshold for total number of requests has been reached."], Results: {} },
    ["CUUR0000SETE"],
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /daily threshold/);
  assert.deepEqual(r.bySeries, {});
  assert.deepEqual(r.missing, ["CUUR0000SETE"]);
  assert.equal(parseBlsResponse(null, ["A"]).ok, false);
  assert.match(parseBlsResponse({ status: "REQUEST_FAILED", message: [] }, ["A"]).error, /REQUEST_FAILED/);
});
