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

/** A plain left click with no modifier: safe to handle in-page instead of letting the browser navigate. */
export function isPlainClick(e) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
