import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { ROUTES } from "./routes.js";

const here = dirname(fileURLToPath(import.meta.url));

test("the old dashboard is gone and nothing imports it", () => {
  assert.ok(!existsSync(resolve(here, "views/LegacyDashboard.jsx")));
  const files = [resolve(here, "App.jsx"), resolve(here, "main.jsx")];
  for (const dir of ["views", "components"]) {
    for (const f of readdirSync(join(here, dir))) files.push(join(here, dir, f));
  }
  for (const f of files) assert.ok(!readFileSync(f, "utf8").includes("LegacyDashboard"), f);
});

test("every route has a view with a focusable #page-title heading", () => {
  const app = readFileSync(resolve(here, "App.jsx"), "utf8");
  const views = { "your-costs": "YourCostsIntro", "national-numbers": "NationalNumbers", "price-check": "PriceCheck", sources: "Sources" };
  assert.deepEqual(Object.keys(views), ROUTES.map((r) => r.id));
  for (const [id, view] of Object.entries(views)) {
    if (id !== "your-costs") assert.ok(app.includes(`<${view} `), `App renders ${view}`);
    const jsx = readFileSync(resolve(here, "views", `${view}.jsx`), "utf8");
    assert.match(jsx, /<h1 id="page-title" tabIndex=\{-1\}>/, `${view} heading`);
  }
});
