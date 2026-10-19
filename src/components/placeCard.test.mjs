import { test } from "node:test";
import assert from "node:assert/strict";
import { placeCard } from "./placeCard.js";

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test("placeCard: centered above the target", () => {
  assert.deepEqual(placeCard(rect(500, 400, 100, 40), 200, 120, 1280, 900), { x: 450, y: 272 });
});

test("placeCard: below when there is no room above, and never past the bottom", () => {
  assert.deepEqual(placeCard(rect(500, 60, 100, 40), 200, 120, 1280, 900), { x: 450, y: 108 });
  assert.deepEqual(placeCard(rect(500, 60, 100, 800), 200, 120, 1280, 900), { x: 450, y: 764 });
});

test("placeCard: kept 16px inside the viewport at the edges and on a phone", () => {
  assert.equal(placeCard(rect(0, 400, 40, 40), 200, 120, 390, 800).x, 16);
  assert.equal(placeCard(rect(370, 400, 20, 40), 200, 120, 390, 800).x, 174);
  assert.equal(placeCard(rect(100, 400, 40, 40), 400, 120, 390, 800).x, 16, "wider than the room: pinned to the left margin");
});
