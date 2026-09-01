# inflation-reality — Lessons Learned

Durable, reusable takeaways from building this project — the things worth
remembering next time, not a play-by-play. Newest first.

## 2026-09-01 — A resilience layer hides the failure it handles

- **A silent fallback is a silent bug.** `assemblePayload` correctly detected
  that core CPI's NSA series returned nothing, correctly substituted the
  bundled fallback, and correctly set `stale: true`. Every piece worked — and
  the net effect was a five-week-old wrong number displayed with the same
  confidence as live ones, because nothing rendered the flag. Graceful
  degradation only counts as graceful if the degraded state is *visible*.
  Design the fallback and its indicator in the same change, never separately.

- **Audit the whole manifest, not the interesting part of it.** July's series
  audit found four dead category ids, fixed them, and verified "0 stale
  categories" — a true statement that quietly excluded the headline and core
  macro nodes, which sit outside the `CATEGORIES` loop. The method was right;
  the scope was drawn around the part that had already broken. When validating
  a manifest, enumerate it programmatically (`allSeries()`) rather than by the
  category you happen to be thinking about.

- **`CPILFESNS` does not exist on FRED; the NSA core id is `CPILFENS`.** The
  `S`-for-seasonal convention that gives `CPIAUCNS`/`CPIAUCSL` its symmetry does
  not extend to the less-food-and-energy series. Confirm every id resolves
  (`fredgraph.csv?id=<ID>` → HTTP 200, not a 404 HTML page) before trusting it;
  a plausible-looking id is not a real one.

- **The build log had the answer all along.** `fetch-fred.mjs` prints
  `N/M series live` on every run — it was reporting 38/39 for five weeks and
  nobody read it. A counter nobody looks at is not monitoring. Either fail the
  build on the condition or surface it where someone will see it.


## 2026-05-21 — Scaffolding a single-component dashboard onto GitHub Pages

- **A `export default` component drops in with zero glue.** The source
  `personal-inflation-tracker.jsx` exported a default function, so it became
  `src/App.jsx` verbatim — `main.jsx` just imports `App` and mounts it. The
  function's internal name (`InflationTracker`) is irrelevant to the import.
  Worth checking the export style before scaffolding; a named-only export
  would have needed a rename or re-export.

- **Vite `base` must equal the repo name for GitHub Pages project sites.**
  Project pages serve from `https://<user>.github.io/<repo>/`, so
  `base: "/inflation-reality/"` is what makes asset URLs resolve. Verify by
  grepping the built `dist/index.html` for `/<repo>/assets/...` rather than
  trusting the config — the build output is the source of truth.

- **GitHub Pages needs two separate switches.** Pushing to `gh-pages` via the
  Actions workflow only publishes the artifact; the site stays 404 until
  Pages is *also* pointed at that branch. Did it in one shot with
  `gh api -X POST repos/<owner>/<repo>/pages -f "source[branch]=gh-pages" -f "source[path]=/"`.

- **`peaceiris/actions-gh-pages` requires `permissions: contents: write`.**
  The default `GITHUB_TOKEN` is read-only on newer repos; without the explicit
  grant the deploy step can't push the `gh-pages` branch.

- **`xlsx` + `recharts` make a heavy bundle (851 kB / 258 kB gzip).** Tripped
  Vite's 500 kB chunk warning on a brand-new project. Not a build failure, but
  a real first-load cost — the fix (deferred to BACKLOG) is a dynamic
  `import()` of xlsx so it only loads when the user actually exports.

- **GitHub is force-migrating Actions off Node 20 (June 2 2026).**
  `checkout@v4`, `setup-node@v4`, and `peaceiris@v4` all flagged the
  deprecation on the first run. Pinning to the latest action majors up front
  would have avoided the warning.
