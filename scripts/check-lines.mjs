// scripts/check-lines.mjs
// Post-deploy gate: exit 1 when any BLS-sourced calculator line in public/cpi.json is on a last
// known value. The site has already deployed with those values; a red run (and GitHub's email)
// is how an expired BLS_API_KEY or a dead series id gets noticed.
import { readFileSync } from "node:fs";
import { staleBlsLines } from "./assemble.mjs";
import * as catalog from "../src/data/catalog.js";

const payload = JSON.parse(readFileSync(new URL("../public/cpi.json", import.meta.url), "utf8"));
const stale = staleBlsLines(payload, catalog);
if (stale.length) {
  console.log(`::error title=BLS calculator lines stale::${stale.join(", ")} used a last known value. Check the BLS_API_KEY secret (renew yearly) and the series ids.`);
  process.exit(1);
}
console.log("Calculator BLS lines are live.");
