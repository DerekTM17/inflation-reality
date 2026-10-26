import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST_HTML = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.html");

// Run `npm run build` first; the link lives in static markup so it shows before React loads.
test("built index.html links back to Translating Policy", () => {
  const html = readFileSync(DIST_HTML, "utf8");
  assert.match(
    html,
    /<a [^>]*href="https:\/\/translatingpolicy\.com"[^>]*>\s*←\s*Translating Policy\s*<\/a>/,
  );
});
