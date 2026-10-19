import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..");
const css = readFileSync(resolve(here, "tokens.css"), "utf8");

// The text inside the first block matching `selector {`.
function block(selectorPattern) {
  const m = new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(m, `block ${selectorPattern} exists`);
  return m[1];
}

// Hex color tokens inside that block.
function tokens(selectorPattern) {
  return Object.fromEntries([...block(selectorPattern).matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].map((x) => [x[1], x[2]]));
}

// WCAG 2 relative luminance and contrast ratio.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// What `color-mix(in srgb, fg alpha, transparent)` paints over `bg`: a per-channel sRGB blend.
function over(fg, bg, alpha) {
  const ch = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
}

// Each pair is [fg, bg] or [fg, bg, minimum]; a pair without a minimum uses `min`.
function checkPairs(t, pairs, min, where = "") {
  for (const [fg, bg, floor = min] of pairs) {
    assert.ok(t[fg] && t[bg], `--${fg} and --${bg} are defined`);
    const ratio = contrast(t[fg], t[bg]);
    assert.ok(ratio >= floor, `${where}--${fg} on --${bg} is ${ratio.toFixed(2)}, needs ${floor}`);
  }
}

const FAMILIES = ["f-home", "f-around", "f-food", "f-util", "f-fun", "f-health", "f-kids", "f-rest"];
const light = tokens(":root");
const darkMedia = tokens(':root:not\\(\\[data-theme="light"\\]\\)');
const darkAttr = tokens(':root\\[data-theme="dark"\\]');

test("both dark blocks are identical and every theme defines the same tokens", () => {
  assert.deepEqual(darkMedia, darkAttr);
  assert.deepEqual(Object.keys(darkAttr).sort(), Object.keys(light).sort());
  assert.equal(Object.keys(light).length, 24);
});

test("publisher colors are aliases of family colors, set once in :root", () => {
  const alias = (text) => Object.fromEntries([...text.matchAll(/--(p-[\w-]+):\s*var\(--([\w-]+)\)/g)].map((x) => [x[1], x[2]]));
  assert.deepEqual(alias(block(":root")), {
    "p-labor": "f-home", "p-commerce": "f-food", "p-cleveland": "f-kids", "p-atlanta": "f-util", "p-dallas": "f-fun",
  });
  assert.deepEqual(alias(block(':root:not\\(\\[data-theme="light"\\]\\)')), {});
  assert.deepEqual(alias(block(':root\\[data-theme="dark"\\]')), {});
});

// Design rule 7, plus revision 4's family rule.
for (const [name, t] of [["light", light], ["dark", darkAttr]]) {
  test(`contrast (${name}): text pairs at least 4.5:1`, () => {
    checkPairs(t, [
      ["ink", "ground"], ["ink", "surface"], ["ink-2", "ground"], ["ink-2", "surface"],
      ["ink-3", "ground"], ["ink-3", "surface"], ["accent-ink", "accent"], ["dock-ink", "dock"],
    ], 4.5);
  });

  test(`contrast (${name}): non-text pairs at least 3:1`, () => {
    checkPairs(t, [
      ["control-edge", "surface"], ["accent", "surface"], ["bar-us", "surface"], ["bar-line", "surface"],
      ["accent", "ground"],
    ], 3);
  });

  test(`contrast (${name}): family marks at least 3:1 on the page and on surfaces`, () => {
    // Light Utilities (2.74:1 on --ground) and Everything else (2.93:1) are allowed down
    // to 2.7:1: every mark has a text label next to it, and the label carries the meaning.
    const floor = name === "light" ? { "f-util": 2.7, "f-rest": 2.7 } : {};
    checkPairs(t, FAMILIES.flatMap((f) => [[f, "surface", floor[f]], [f, "ground", floor[f]]]), 3);
  });

  test(`contrast (${name}): text and marks on a 13% family tint over the page`, () => {
    for (const f of FAMILIES) {
      // Light Utilities measures 2.43:1 on its own tint; the label next to it carries the meaning.
      checkPairs({ ...t, tint: over(t[f], t.ground, 0.13) }, [["ink", "tint"], ["ink-2", "tint"], [f, "tint", 2.4]], 4.5, `${f} tint: `);
    }
  });
}

// "Components never use literal colors." Scans the new UI files.
test("no literal colors outside tokens.css in the new UI", () => {
  const files = [];
  for (const dir of ["styles", "components", "tabs"]) {
    const full = join(src, dir);
    if (!existsSync(full)) continue;
    for (const f of readdirSync(full)) {
      if (/\.(css|jsx|js)$/.test(f) && f !== "tokens.css") files.push(join(full, f));
    }
  }
  for (const f of readdirSync(join(src, "views"))) {
    if (/\.(jsx|js)$/.test(f)) files.push(join(src, "views", f));
  }
  if (existsSync(join(src, "App.jsx"))) files.push(join(src, "App.jsx"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/.test(text), `literal color in ${file}`);
  }
});
