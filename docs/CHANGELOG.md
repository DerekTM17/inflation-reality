# inflation-reality — Changelog

A record of significant changes. Entries grouped by date (descending,
most recent first). Each covers **What** + **Why**; bigger decisions
also include **Tradeoffs / Alternatives considered**.

Curated, not exhaustive — `git log` has every commit.

## 2026-05-21

### Scaffold: Vite + React dashboard deployed to GitHub Pages

**Why:** Wired the existing personal-inflation-tracker.jsx (BLS CPI-U dashboard, Recharts + xlsx) into a fresh Vite + React 18 app and shipped it public. App.jsx is the component verbatim (default export drops straight in as App); main.jsx mounts it with a minimal CSS reset. vite.config base is /inflation-reality/ to match the GitHub Pages project URL — verified in the built dist/index.html asset paths. A GitHub Actions workflow (.github/workflows/deploy.yml) builds on push to main and publishes dist/ to gh-pages via peaceiris/actions-gh-pages; Pages is configured to serve from that branch. First deploy ran green in ~17s.

