import { useEffect, useMemo, useState } from "react";
import * as catalog from "./data/catalog.js";
import { buildViewData } from "./data/merge.js";
import { isPlausiblePayload } from "./data/payload.js";
import fallbackDynamic from "./data/fallback.json";
import { routeFromHash, hrefFor } from "./routes.js";
import SectionNav from "./components/SectionNav.jsx";
import YourCosts from "./views/YourCosts.jsx";
import LegacyDashboard from "./views/LegacyDashboard.jsx";

const BASE = import.meta.env.BASE_URL;

// Until Phase 2b rebuilds them, the other sections render the old dashboard's views.
const LEGACY_VIEW = { "national-numbers": "dashboard", "price-check": "prices", sources: "methodology" };

/** Shell only: data loading (bundled fallback, then cpi.json), hash routing, section nav. */
export default function App() {
  const [dynamic, setDynamic] = useState(fallbackDynamic);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}cpi.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`cpi.json HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled) return;
        if (!isPlausiblePayload(json)) {
          console.warn("Using bundled fallback data: cpi.json payload failed shape check (missing/invalid trend or categories)");
          return;
        }
        setDynamic(json);
      })
      .catch((err) => { console.warn("Using bundled fallback data:", err.message); });
    return () => { cancelled = true; };
  }, []);

  const data = useMemo(() => buildViewData(catalog, dynamic), [dynamic]);

  const [route, setRoute] = useState(() => routeFromHash(window.location.hash));
  useEffect(() => {
    const sync = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  // Section links push a normal history entry. pushState (not a bare href) because
  // leaving a hash for the bare base path would otherwise reload the page.
  const navigate = (id) => {
    if (id !== route) {
      window.history.pushState(null, "", hrefFor(id, BASE));
      setRoute(id);
    }
    window.scrollTo(0, 0);
  };

  return (
    <div className="wrap">
      <SectionNav route={route} base={BASE} onNavigate={navigate} />
      <main>
        {route === "your-costs"
          ? <YourCosts data={data} base={BASE} onNavigate={navigate} />
          : <LegacyDashboard dynamic={dynamic} view={LEGACY_VIEW[route]} />}
      </main>
    </div>
  );
}
