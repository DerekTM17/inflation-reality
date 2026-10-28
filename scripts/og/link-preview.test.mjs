import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const meta = (attr, key) => new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];
const DESCRIPTION = "See how much prices rose for a household like yours, in dollars, using government price data.";

// Spec "Front-end architecture", Link previews.
test("index.html carries the spec's link preview tags", () => {
  assert.match(html, /<title>Inflation Reality<\/title>/);
  assert.equal(meta("name", "description"), DESCRIPTION);
  assert.equal(meta("property", "og:site_name"), "Inflation Reality");
  assert.equal(meta("property", "og:title"), "How much more are you paying than a year ago?");
  assert.equal(meta("property", "og:description"), DESCRIPTION);
  assert.equal(meta("property", "og:url"), "https://inflation.translatingpolicy.com/");
  assert.equal(meta("property", "og:image"), "https://inflation.translatingpolicy.com/og-image.png");
  assert.equal(meta("property", "og:image:width"), "1200");
  assert.equal(meta("property", "og:image:height"), "630");
  assert.ok(meta("property", "og:image:alt"));
  assert.equal(meta("name", "twitter:card"), "summary_large_image");
});

test("public/og-image.png is a 1200x630 PNG small enough for every preview service", () => {
  const png = readFileSync(resolve(root, "public/og-image.png"));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 1_000_000, `${png.length} bytes`);
});
