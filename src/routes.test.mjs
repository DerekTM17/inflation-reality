import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUTES, routeFromHash, hrefFor, isPlainClick, titleFor } from "./routes.js";

test("routeFromHash: known hashes, empty, unknown", () => {
  assert.equal(routeFromHash(""), "your-costs");
  assert.equal(routeFromHash(undefined), "your-costs");
  assert.equal(routeFromHash("#national-numbers"), "national-numbers");
  assert.equal(routeFromHash("#price-check"), "price-check");
  assert.equal(routeFromHash("#sources"), "sources");
  assert.equal(routeFromHash("#your-costs"), "your-costs");
  assert.equal(routeFromHash("#nope"), "your-costs");
});

test("hrefFor: Your costs is the bare base path, the rest are hashes", () => {
  const base = "/inflation-reality/";
  assert.equal(hrefFor("your-costs", base), "/inflation-reality/");
  assert.equal(hrefFor("price-check", base), "/inflation-reality/#price-check");
  assert.deepEqual(ROUTES.map((r) => r.label), ["Your costs", "National numbers", "Price check", "Sources"]);
});

test("isPlainClick ignores modified and non-left clicks", () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  assert.equal(isPlainClick(click), true);
  assert.equal(isPlainClick({ ...click, metaKey: true }), false);
  assert.equal(isPlainClick({ ...click, button: 1 }), false);
});

test("titleFor: the site name alone on Your costs, the tab name first elsewhere", () => {
  assert.equal(titleFor("your-costs"), "Inflation Reality");
  assert.equal(titleFor("national-numbers"), "National numbers | Inflation Reality");
  assert.equal(titleFor("price-check"), "Price check | Inflation Reality");
  assert.equal(titleFor("sources"), "Sources | Inflation Reality");
  assert.equal(titleFor("nope"), "Inflation Reality");
});
