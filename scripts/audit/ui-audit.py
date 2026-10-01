#!/usr/bin/env python3
"""UI audit for Inflation Reality (spec "Testing": the Phase 2 audit).

Runs the user flows and the automatable Design rules (1, 2, 4, 5, 8) on every tab,
in light and dark themes, at 390px and 1280px, plus a random-amounts probe of the
Your costs panel (amounts include 0 and tiny values, which default amounts never hit).

Local, against the built site (the default base URL):
    npm run build && npx vite preview --port 4719 --strictPort     # in another shell
    python3 scripts/audit/ui-audit.py
Live site, with the real cpi.json (the merge gate's "production data live" run):
    python3 scripts/audit/ui-audit.py --base-url https://derektm17.github.io/inflation-reality/ --live-data

By default cpi.json is answered with scripts/audit/fixture-cpi.json, so results don't
move with each month's data. Google Fonts requests are stubbed either way. The page
runs on Playwright's fake clock so the Undo toast's 8-second timer can be tested.
Uses its own browser: the Playwright MCP browser is shared with other sessions.
Every check runs; the exit code is 1 if any failed.
"""
import argparse
import random
import re
import sys
import tempfile
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
FIXTURE = HERE / "fixture-cpi.json"
ROUTES = [("your-costs", "", "Your costs"), ("national-numbers", "#national-numbers", "National numbers"),
          ("price-check", "#price-check", "Price check"), ("sources", "#sources", "Sources")]
BANNED = ["—", "·", "→", "!", "Welcome back", "Here's", "Let's", "simply", "repriced", "reimagined"]
BANNED_YOUR_COSTS = ["CPI", "YoY", "relative importance"]
SHEETS = ["Your estimate", "Price changes", "Average prices", "Monthly trend", "How it works"]
MINUS = "−"

failures = []


def check(cond, msg):
    print(("ok:   " if cond else "FAIL: ") + msg)
    if not cond:
        failures.append(msg)


# Design rules 1, 2, 4 (emoji, code), 5, plus radius-by-role and dark-mode surfaces.
# Returns a list of problems; empty means the view passes.
RULES_JS = r"""
(dark) => {
  const problems = [];
  const seen = new Set();
  const note = (msg) => { if (!seen.has(msg) && seen.size < 40) { seen.add(msg); problems.push(msg); } };
  const visible = (el, cs) => cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0;
  const name = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "");
  const families = new Set();
  // Roles: 6px controls, 10px panel and dock (0px is the default for plain boxes).
  // Also allowed because real rules use them: 2px bar fills (calculator.css:90 .bar) and 8px for the toast (calculator.css:187).
  const radii = new Set(["0px", "2px", "6px", "8px", "10px"]);
  const lum = (rgb) => {
    const m = rgb.match(/[\d.]+/g); if (!m) return 0;
    const [r, g, b] = m.slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const transparent = (c) => c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
  let raised = 0;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    families.add(cs.fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase());
    if (/mono/i.test(cs.fontFamily)) note(`rule 1: monospace font on ${name(el)}`);
    if (cs.textTransform === "uppercase") note(`rule 2: uppercase on ${name(el)}`);
    const ls = parseFloat(cs.letterSpacing);
    if (ownText && ls > 0 && parseFloat(cs.fontSize) < 20) note(`rule 2: letter-spacing ${cs.letterSpacing} on ${name(el)}`);
    for (const k of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"]) {
      if (!radii.has(cs[k])) note(`rule 5: radius ${cs[k]} on ${name(el)}`);
    }
    const bordered = ["Top", "Right", "Bottom", "Left"].every((s) => parseFloat(cs[`border${s}Width`]) > 0);
    if (cs.position !== "fixed" && bordered && !transparent(cs.backgroundColor) && parseFloat(cs.borderTopLeftRadius) >= 8) raised += 1;
    if (dark && !transparent(cs.backgroundColor) && lum(cs.backgroundColor) > 0.4
        && !el.closest(".bar-track, .dock, .toast, [aria-pressed='true'], .check")) {
      note(`dark: light background ${cs.backgroundColor} on ${name(el)}`);
    }
  }
  if (families.size > 2) note(`rule 1: ${families.size} font families: ${[...families].join(", ")}`);
  if (raised > 1) note(`rule 5: ${raised} raised surfaces`);
  if (document.querySelector("code, pre, kbd, samp")) note("rule 1: a code element is rendered");
  const text = document.body.innerText;
  if (/\p{Extended_Pictographic}|️/u.test(text)) note("rule 4: emoji in rendered text");
  if (/NaN|Infinity|undefined|\[object Object\]/.test(text)) note("broken value (NaN, Infinity, undefined) in rendered text");
  if (document.documentElement.scrollWidth > window.innerWidth) note("horizontal scroll");
  return problems;
}
"""


def dollars(text):
    """'+$1,450' -> 1450, '−$40' -> -40, 'under $10' -> 0."""
    t = text.strip()
    if t in ("", "under $10", "$0"):
        return 0
    return (-1 if t.startswith(MINUS) else 1) * int(re.sub(r"[^\d]", "", t))


def answer_total(text):
    if text.startswith("About the same"):
        return 0
    m = re.fullmatch(r"About \$([\d,]+) (more|less) a year", text)
    if not m:
        return None
    v = int(m.group(1).replace(",", ""))
    return v if m.group(2) == "more" else -v


def new_page(browser, args, width, theme):
    context = browser.new_context(viewport={"width": width, "height": 900}, color_scheme=theme, accept_downloads=True)
    page = context.new_page()
    page.clock.install()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    page.route("https://fonts.gstatic.com/**", lambda r: r.abort())
    if not args.live_data:
        page.route("**/cpi.json", lambda r: r.fulfill(path=str(FIXTURE), content_type="application/json"))
    return context, page, errors


def go(page, base, hash_=""):
    page.goto(base + hash_)
    page.wait_for_selector("#page-title")
    page.wait_for_timeout(400)


def rules(page, where, dark, your_costs):
    problems = page.evaluate(RULES_JS, dark)
    check(problems == [], f"{where}: design rules {problems}")
    text = page.locator("main").inner_text()
    banned = BANNED + (BANNED_YOUR_COSTS if your_costs else [])
    found = [b for b in banned if b in text]
    check(found == [], f"{where}: voice guide banned strings {found}")


def panel_sum_ok(page, where):
    """Rendered line amounts (top rows, smaller items, Everything else) add up to the answer."""
    total = answer_total(page.locator(".answer").inner_text())
    if total is None:
        check(page.locator(".answer").inner_text().startswith("Enter your monthly amounts"), f"{where}: zero-total message")
        return
    amounts = [dollars(t) for t in page.locator(".lines .line-amt").all_inner_texts()]
    check(sum(amounts) == total, f"{where}: lines add up ({sum(amounts)} vs {total})")
    flips = []
    for row in page.locator(".lines .line").all():
        rate = row.locator(".line-rate").inner_text()
        amt = row.locator(".line-amt").inner_text()
        if (rate.startswith("+") and amt.startswith(MINUS)) or (rate.startswith(MINUS) and amt.startswith("+")):
            flips.append(f"{rate} {amt}")
    check(flips == [], f"{where}: no line shows the opposite sign of its rate {flips}")


def flows(browser, args, base):
    context, page, errors = new_page(browser, args, 390, "light")
    text = lambda sel: page.locator(sel).first.inner_text()

    # Average first screen.
    go(page, base)
    check(page.title() == "Inflation Reality", "Your costs title")
    check(text(".result h2").startswith("The average U.S. household vs. "), "Average title")
    check(answer_total(text(".answer")) is not None, "Average answer")
    check(page.locator(".verdict").count() == 0 and page.locator(".compare").count() == 0, "Average has no verdict or bars")
    panel_sum_ok(page, "Average")
    rules(page, "Your costs, Average, 390 light", False, True)

    # Mortgage: 0% line, explanation, guesses, basis, owners' yardstick.
    page.get_by_role("button", name=re.compile("^Mortgage")).click()
    page.wait_for_timeout(200)
    check(page.locator(".opt.guess").count() == 3, "three guessed answers")
    check(text(".basis").startswith("Based on 1 answer and 3 guesses."), "basis wording")
    check(page.locator(".help").first.inner_text().startswith("A fixed-rate payment"), "mortgage explanation")
    check("Prices other than housing" in text(".rates"), "owners compared with prices other than housing")
    check("prices other than housing" in text(".verdict") or text(".verdict").startswith("About the same as prices other than housing"),
          "owner verdict names the yardstick")
    show_all = page.get_by_role("button", name=re.compile(r"^Show all \d+ items$"))
    if show_all.count():
        check(show_all.get_attribute("aria-controls") == "result-lines" and page.locator("#result-lines").count() == 1,
              "Show all has aria-controls")
        show_all.click()
        page.wait_for_timeout(150)
    mortgage_row = page.locator(".line", has_text="Mortgage payment")
    check(mortgage_row.locator(".line-rate").inner_text() == "0%", "mortgage line is 0%")

    # Daycare checkbox adds a line.
    page.get_by_label("Daycare").check()
    page.wait_for_timeout(200)
    check(page.locator(".line", has_text="Daycare").count() == 1, "daycare line appears")

    # A falling price renders as −$ (bus and train fares fall in the fixture).
    page.get_by_role("button", name=re.compile("^No car")).click()
    page.wait_for_timeout(200)
    more = page.get_by_role("button", name=re.compile(r"^Show all \d+ items$"))
    if more.count():
        more.click()
        page.wait_for_timeout(150)
    if not args.live_data:
        fares = page.locator(".line", has_text="Bus and train fares").locator(".line-amt").inner_text()
        check(fares.startswith(MINUS + "$"), f"a falling price shows {MINUS}$ ({fares})")
    panel_sum_ok(page, "Personal, defaults")
    rules(page, "Your costs, Personal, 390 light", False, True)

    # Renewal prompt focuses its input.
    page.get_by_role("button", name="Home insurance: add your renewal increase").click()
    page.wait_for_timeout(300)
    check(page.evaluate("document.activeElement.id") == "renewal-homeIns", "prompt focuses the renewal box")
    page.keyboard.type("8")
    page.wait_for_timeout(200)
    check(page.locator(".prompts").count() == 0, "prompt row leaves once a rate is typed")

    # Random amounts, including 0 and tiny values: totals add up, no sign flips, no NaN.
    rng = random.Random(args.seed)
    print(f"random amounts seed {args.seed}")
    choices = [0, 0, 1, 4, 5, 6, 9, 14, 15, 37, 120, 999, 2500]
    inputs = page.locator("input[id^='amount-']")
    for round_ in range(args.rounds):
        for i in range(inputs.count()):
            inputs.nth(i).fill(str(rng.choice(choices + [rng.randint(0, 6000)])))
        page.wait_for_timeout(200)
        panel_sum_ok(page, f"random amounts round {round_ + 1}")
        check("NaN" not in page.locator(".result").inner_text(), f"random amounts round {round_ + 1}: no NaN")
    for i in range(inputs.count()):
        inputs.nth(i).fill("0")
    page.wait_for_timeout(200)
    check(text(".answer") == "Enter your monthly amounts to see your estimate.", "all amounts 0: zero-total message")
    for i in range(inputs.count()):
        inputs.nth(i).fill("")
        inputs.nth(i).fill(str(rng.randint(50, 900)))
    page.wait_for_timeout(200)

    # Saved answers: reload folds to the summary; Start over, toast timer, Undo.
    saved = page.evaluate("localStorage.getItem('inflation-reality:answers:v1')")
    check(bool(saved) and '"version":1' in saved, "answers saved")
    page.reload()
    page.wait_for_selector("#page-title")
    page.wait_for_timeout(400)
    check(text(".lede").startswith("Updated with "), "returning lede")
    check(text(".summary p").startswith("Fixed-rate mortgage, no car"), "returning summary")
    page.get_by_role("button", name="Start over").click()
    page.wait_for_timeout(200)
    check(text(".toast").startswith("Answers cleared."), "Undo toast")
    check(text(".result h2").startswith("The average U.S. household"), "Start over returns to Average")
    page.clock.fast_forward(9000)
    page.wait_for_timeout(200)
    check(page.locator(".toast").count() == 1, "toast stays while Undo has focus")
    page.locator("#page-title").focus()
    page.clock.fast_forward(9000)
    page.wait_for_timeout(200)
    check(page.locator(".toast").count() == 0, "toast closes 8 seconds after focus leaves")
    page.get_by_role("button", name=re.compile("^Mortgage")).click()
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Start over").click()
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Undo").click()
    page.wait_for_timeout(200)
    check(text(".result h2").startswith("Your costs vs. "), "Undo restores answers")

    # Section links: hash, aria-current, title, focus on the new heading, Back.
    for rid, hash_, label in ROUTES[1:]:
        page.get_by_role("link", name=label, exact=True).click()
        page.wait_for_timeout(400)
        check(page.url.endswith(hash_), f"{label}: link sets the hash")
        check(page.locator("[aria-current=page]").inner_text() == label, f"{label}: aria-current")
        check(page.title() == f"{label} | Inflation Reality", f"{label}: document title")
        check(page.evaluate("document.activeElement.id") == "page-title", f"{label}: focus moves to the heading")
        check(text("h1") == label, f"{label}: heading")
    page.go_back()
    page.wait_for_timeout(400)
    check(page.locator("[aria-current=page]").inner_text() == "Price check", "Back returns to the previous tab")
    page.goto(base + "#unknown")
    page.wait_for_timeout(400)
    check(page.locator("[aria-current=page]").inner_text() == "Your costs", "unknown hash renders Your costs")

    # Tab contents.
    go(page, base, "#national-numbers")
    check(page.locator(".stat").count() == 2, "National: headline and core")
    check(page.locator(".trend-chart svg").count() >= 1, "National: trend chart drawn")
    check(page.locator(".bar-list .bar-row").count() >= 3, "National: other measures listed")
    if not args.live_data:
        check("Using the last known value for Median CPI." in page.locator("main").inner_text(), "National: stale note")
    go(page, base, "#price-check")
    check(page.locator(".data-table tbody tr th[scope=row]").count() == 21, "Price check: 21 average prices")
    check(page.locator(".bar-list .bar-row").count() == 10, "Price check: 10 biggest changes")
    check(page.locator(".fuel").count() == 2, "Price check: gas and diesel")
    go(page, base, "#sources")
    yard = page.locator("table[aria-labelledby='series-yardstick']").inner_text()
    lines = page.locator("table[aria-labelledby='series-household']").inner_text()
    check("CUUR0000SA0L2" in yard and "CUUR0000SA0L2" not in lines, "Sources: the yardstick is a source series, not a line")
    bls = page.locator("a", has_text="CUUR0000SETE").first.get_attribute("href")
    check(bls == "https://data.bls.gov/timeseries/CUUR0000SETE", "Sources: BLS series link to BLS")

    # Download: five sheets, and the estimate sheet is the saved (mortgage) household.
    with page.expect_download() as dl:
        page.get_by_role("button", name="Download the spreadsheet (.xlsx)").click()
    download = dl.value
    check(re.fullmatch(r"inflation-reality-(\d{4}-\d{2}|data)\.xlsx", download.suggested_filename) is not None,
          f"download name {download.suggested_filename}")
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "book.xlsx"
        download.save_as(path)
        with zipfile.ZipFile(path) as z:
            names = re.findall(r'<sheet name="([^"]+)"', z.read("xl/workbook.xml").decode())
            check(names == SHEETS, f"spreadsheet sheets {names}")
            sheet1 = z.read("xl/worksheets/sheet1.xml").decode()
            check("Mortgage payment" in sheet1 and "Your costs vs." in sheet1, "spreadsheet has the saved estimate")
    page.wait_for_timeout(200)
    check(page.locator(".status").inner_text() == "Spreadsheet downloaded.", "download status")

    real = [e for e in errors if "cpi.json" not in e]
    check(real == [], f"no console errors in the flows {real}")
    context.close()


def matrix(browser, args, base):
    for width in (390, 1280):
        for theme in ("light", "dark"):
            context, page, errors = new_page(browser, args, width, theme)
            for rid, hash_, label in ROUTES:
                go(page, base, hash_)
                if theme == "dark":
                    ground = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ground').trim().toLowerCase()")
                    check(ground == "#161a1e", f"{label}, {width} dark: dark tokens apply")
                rules(page, f"{label}, {width} {theme}", theme == "dark", rid == "your-costs")
            if width == 1280:
                go(page, base)
                check(page.evaluate("getComputedStyle(document.querySelector('.result-col')).position") == "sticky",
                      "desktop: result panel is sticky")
            real = [e for e in errors if "cpi.json" not in e]
            check(real == [], f"{width} {theme}: no console errors {real}")
            context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:4719/inflation-reality/")
    parser.add_argument("--live-data", action="store_true", help="use the site's real cpi.json instead of the fixture")
    parser.add_argument("--seed", type=int, default=random.randrange(1_000_000), help="random-amounts seed (printed)")
    parser.add_argument("--rounds", type=int, default=6, help="random-amounts rounds")
    args = parser.parse_args()
    base = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
    print(f"auditing {base} with {'live data' if args.live_data else 'the fixture'}")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        flows(browser, args, base)
        matrix(browser, args, base)
        browser.close()
    print(f"\n{len(failures)} failed" if failures else "\naudit passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
