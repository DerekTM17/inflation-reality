// Section routes (spec "Other tabs"): Your costs has no hash; the others are hashes.
// Pure helpers; App.jsx owns the history and event wiring.

export const ROUTES = [
  { id: "your-costs", label: "Your costs" },
  { id: "national-numbers", label: "National numbers" },
  { id: "price-check", label: "Price check" },
  { id: "sources", label: "Sources" },
];

/** location.hash → route id. No hash or an unknown hash renders Your costs. */
export function routeFromHash(hash) {
  const id = String(hash ?? "").replace(/^#/, "");
  return id !== "your-costs" && ROUTES.some((r) => r.id === id) ? id : "your-costs";
}

/** Link target for a route under the site base path ("/inflation-reality/"). */
export function hrefFor(id, base) {
  return id === "your-costs" ? base : `${base}#${id}`;
}

/**
 * document.title for a route. Your costs keeps the bare site name, matching the
 * link preview; the other tabs put their own name first so browser tabs differ.
 */
export function titleFor(id) {
  const r = ROUTES.find((x) => x.id === id);
  return !r || r.id === "your-costs" ? "Inflation Reality" : `${r.label} | Inflation Reality`;
}

/** A plain left click with no modifier: safe to handle in-page instead of letting the browser navigate. */
export function isPlainClick(e) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
