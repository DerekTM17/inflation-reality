import { useEffect, useMemo, useRef, useState } from "react";
import * as catalog from "./data/catalog.js";
import { buildViewData } from "./data/merge.js";
import { isPlausiblePayload } from "./data/payload.js";
import fallbackDynamic from "./data/fallback.json";
import { routeFromHash, hrefFor, titleFor } from "./routes.js";
import SectionNav from "./components/SectionNav.jsx";
import YourCosts from "./views/YourCosts.jsx";
import NationalNumbers from "./views/NationalNumbers.jsx";
import PriceCheck from "./views/PriceCheck.jsx";
import Sources from "./views/Sources.jsx";

const BASE = import.meta.env.BASE_URL;

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

  // Every route names its tab in document.title. A route change (not the first
  // render of a page load) also moves focus to the new view's heading (#page-title),
  // so screen reader and keyboard users land at the top of what just appeared.
  // Child effects have committed by now, so the new heading exists. Comparing with
  // the previous route (not a "first render" flag) stays correct under StrictMode,
  // which runs effects twice in development.
  const shownRoute = useRef(route);
  useEffect(() => {
    document.title = titleFor(route);
    if (shownRoute.current === route) return;
    shownRoute.current = route;
    document.getElementById("page-title")?.focus({ preventScroll: true });
  }, [route]);

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
        {route === "your-costs" ? <YourCosts data={data} base={BASE} onNavigate={navigate} />
          : route === "national-numbers" ? <NationalNumbers data={data} />
          : route === "price-check" ? <PriceCheck data={data} />
          : <Sources data={data} />}
      </main>
    </div>
  );
}
