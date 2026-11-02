import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Reads source files, not dist/: CI runs tests before the build, and Vite copies
// public/ to the site root and passes index.html's head through unchanged.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const ORIGIN = "https://inflation.translatingpolicy.com/";

test("robots.txt allows everything and points at the sitemap", () => {
  const robots = read("public/robots.txt");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: \S/m);
  assert.match(robots, new RegExp(`^Sitemap: ${ORIGIN}sitemap\\.xml$`, "m"));
});

test("sitemap.xml lists the canonical home page", () => {
  const sitemap = read("public/sitemap.xml");
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]), [ORIGIN]);
});

test("index.html has a canonical link and complete social tags", () => {
  const html = read("index.html");
  assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}" />`));
  for (const tag of ['property="og:site_name"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"']) {
    assert.match(html, new RegExp(`<meta ${tag} content="[^"]+" />`), tag);
  }
  assert.ok(html.includes(`<meta name="twitter:image" content="${ORIGIN}og-image.png" />`));
});

test("index.html carries a heading and intro before JavaScript runs, outside the React root", () => {
  const html = read("index.html");
  const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/);
  assert.ok(noscript, "has a <noscript> block");
  assert.match(noscript[1], /<h1>How much more are you paying than a year ago\?<\/h1>/);
  assert.match(noscript[1], /<p>[^<]{40,}<\/p>/);
  assert.match(html, /<div id="root"><\/div>/, "React mounts into an empty root");
});
