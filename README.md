# Inflation Reality

A personal inflation tracker dashboard built with Vite + React. Visualizes
BLS CPI-U data — headline vs. core inflation, category breakdowns, average
prices, and trends — with charts powered by Recharts and Excel export via
the `xlsx` library.

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
