import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..");
const css = readFileSync(resolve(here, "tokens.css"), "utf8");

// Hex color tokens inside the first block matching `selector {`.
function tokens(selectorPattern) {
  const m = new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(m, `block ${selectorPattern} exists`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].map((x) => [x[1], x[2]]));
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

const light = tokens(":root");
const darkMedia = tokens(':root:not\\(\\[data-theme="light"\\]\\)');
const darkAttr = tokens(':root\\[data-theme="dark"\\]');

test("both dark blocks are identical and every theme defines the same tokens", () => {
  assert.deepEqual(darkMedia, darkAttr);
  assert.deepEqual(Object.keys(darkAttr).sort(), Object.keys(light).sort());
  assert.equal(Object.keys(light).length, 15);
});

// Design rule 7.
for (const [name, t] of [["light", light], ["dark", darkAttr]]) {
  test(`contrast (${name}): text pairs at least 4.5:1`, () => {
    const pairs = [
      ["ink", "ground"], ["ink", "surface"], ["ink-2", "ground"], ["ink-2", "surface"],
      ["ink-3", "ground"], ["ink-3", "surface"], ["accent-ink", "accent"], ["dock-ink", "dock"],
    ];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= 4.5, `--${fg} on --${bg} is ${ratio.toFixed(2)}`);
    }
  });

  test(`contrast (${name}): non-text pairs at least 3:1`, () => {
    const pairs = [
      ["control-edge", "surface"], ["accent", "surface"], ["bar-us", "surface"], ["bar-line", "surface"],
      ["accent", "ground"],
    ];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= 3, `--${fg} on --${bg} is ${ratio.toFixed(2)}`);
    }
  });
}

// "Components never use literal colors." Scans the new UI files that exist so far.
test("no literal colors outside tokens.css in the new UI", () => {
  const files = [];
  for (const dir of ["styles", "components"]) {
    const full = join(src, dir);
    if (!existsSync(full)) continue;
    for (const f of readdirSync(full)) {
      if (/\.(css|jsx|js)$/.test(f) && f !== "tokens.css") files.push(join(full, f));
    }
  }
  for (const f of ["views/YourCosts.jsx", "App.jsx"]) {
    if (existsSync(join(src, f))) files.push(join(src, f));
  }
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/.test(text), `literal color in ${file}`);
  }
});
