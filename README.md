# Inflation Reality

A personal inflation tracker dashboard built with Vite + React. Visualizes
BLS CPI-U data — headline vs. core inflation, category breakdowns, average
prices, and trends — with charts powered by Recharts and Excel export via
the `xlsx` library.

## Data

CPI numbers are fetched from the [FRED API](https://fred.stlouisfed.org/) at build
time by `scripts/fetch-fred.mjs` and written to `public/cpi.json`. The app loads that
file at runtime and falls back to `src/data/fallback.json` if it is unavailable.
YoY figures use NSA series (e.g. `CPIAUCNS`); MoM figures use seasonally-adjusted
series (e.g. `CPIAUCSL`). A GitHub Actions schedule refreshes the data on the 13th
and 16th of each month. Set the `FRED_API_KEY` repo secret to enable fetching.

The dashboard also displays alternative official inflation measures alongside headline CPI
and core CPI — Core PCE (`PCEPILFE`), Median CPI (`MEDCPIM159SFRBCLE`), 16% Trimmed-Mean
CPI (`TRMMEANCPIM159SFRBCLE`), and Sticky-Price Core CPI (`CORESTICKM159SFRBATL`) — all
sourced from FRED via the same build-time pipeline. Each carries metadata and a FRED series
badge for full provenance.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Deployment

Pushes to `main` are built and published to the `gh-pages` branch by the
GitHub Actions workflow in `.github/workflows/deploy.yml`. The Vite `base`
path is set to `/inflation-reality/` to match the GitHub Pages project URL.

Live site: https://derektm17.github.io/inflation-reality/
