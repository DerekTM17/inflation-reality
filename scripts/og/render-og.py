#!/usr/bin/env python3
"""Render scripts/og/og-image.html to public/og-image.png (1200x630) for link previews.

Run from anywhere: python3 scripts/og/render-og.py
Needs Python Playwright and network access for the Libre Franklin font. Uses its own
browser (the Playwright MCP browser is shared with other sessions).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "public" / "og-image.png"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    page.goto((HERE / "og-image.html").as_uri())
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready.then(() => true)")
    if not page.evaluate("document.fonts.check('800 82px \"Libre Franklin\"')"):
        raise SystemExit("Libre Franklin did not load; check the network and run again.")
    OUT.parent.mkdir(exist_ok=True)
    page.screenshot(path=str(OUT))
    browser.close()
print(f"wrote {OUT}")
