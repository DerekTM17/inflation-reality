# Inflation Reality

A household inflation calculator built with Vite + React. "Your costs" turns a
household's monthly spending (four questions plus editable amounts) and BLS CPI-U
12-month price changes into "about $X more a year". Other tabs show national
numbers, average prices and the sources, with an Excel export via the `xlsx` library.

## Data

CPI numbers are fetched at build time by `scripts/fetch-fred.mjs` and written to
`public/cpi.json`. The app loads that file at runtime and falls back to
`src/data/fallback.json` if it is unavailable. Most series come from the
[FRED API](https://fred.stlouisfed.org/) (`FRED_API_KEY`). Calculator series that FRED
does not mirror (car insurance `CUUR0000SETE`, bus and train fares, heating oil, daycare,
college tuition, doctors' services and prescription drugs) come from the BLS Public Data
API v2 (`BLS_API_KEY`). The series list lives in `src/data/catalog.js`. YoY figures use
NSA series (e.g. `CPIAUCNS`); MoM figures use seasonally-adjusted series (e.g.
`CPIAUCSL`). A GitHub Actions schedule refreshes the data on the 13th and 16th of each
month. Set both repo secrets to enable fetching.

The calculator's method is documented on the site's Sources tab, which explains every
line one by one: its price data, how its rate is set, and its starting amount (the copy
lives in `src/tabs/sources.js` and is built from `src/calculator/config.js`, so it
cannot drift from the numbers). Mortgage payments count as 0%; home and health insurance
use the person's renewal increase (health through work starts at the KFF 2025 employer
average); car insurance uses its own CPI series.

The National numbers tab also shows alternative official inflation measures alongside
headline and core CPI: Core PCE (`PCEPILFE`), Median CPI (`MEDCPIM159SFRBCLE`), 16%
Trimmed-Mean CPI (`TRMMEANCPIM159SFRBCLE`), Sticky-Price Core CPI
(`CORESTICKM159SFRBATL`) and Trimmed-Mean PCE (`PCETRIM12M159SFRBDAL`), all from FRED.

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
path is `/`, and `public/CNAME` keeps the custom domain across deploys.

Live site: https://inflation.translatingpolicy.com/
