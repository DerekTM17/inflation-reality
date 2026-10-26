import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("vite serves from the root of the custom domain", () => {
  const config = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
  assert.ok(config.includes('base: "/"'));
});

test("public/CNAME names the custom domain", () => {
  const cname = readFileSync(new URL("../public/CNAME", import.meta.url), "utf8");
  assert.equal(cname.trim(), "inflation.translatingpolicy.com");
});
