import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_HTML = resolve(dirname(fileURLToPath(import.meta.url)), "..", "index.html");

// Reads the source file, not dist/: CI runs tests before the build, and Vite passes this markup through unchanged.
test("index.html links back to Translating Policy", () => {
  const html = readFileSync(SOURCE_HTML, "utf8");
  assert.match(
    html,
    /<a [^>]*href="https:\/\/translatingpolicy\.com"[^>]*>\s*←\s*Translating Policy\s*<\/a>/,
  );
});
