#!/usr/bin/env python3
"""UI audit for Inflation Reality (spec "Testing", and "Revision 4: Audit and test changes").

Runs the user flows and the automatable Design rules (1, 2, 4, 5, 8) on every tab, in light and
dark themes, at 390px and 1280px, plus a random-amounts probe of the Your costs cards (amounts
include 0 and tiny values, which default amounts never hit). Numbers are read with reduced motion
emulated, since count-ups would otherwise be read mid-count against the fake clock; one separate
pass with motion on checks that values settle to the same numbers.

Local, against the built site (the default base URL):
    npm run build && node node_modules/vite/bin/vite.js preview --port 4719 --strictPort   # in another shell
    python3 scripts/audit/ui-audit.py
Live site, with the real cpi.json (the merge gate's "production data live" run):
    python3 scripts/audit/ui-audit.py --base-url https://derektm17.github.io/inflation-reality/ --live-data
--live-data is for the live site only: vite preview has no cpi.json, and every console error counts
(the audit stops if --live-data is given a localhost URL). --real-fonts loads Libre Franklin from Google
Fonts instead of stubbing it (needs the network), for the page-height gates with the real type.

By default cpi.json is answered with scripts/audit/fixture-cpi.json, so results don't move with each
month's data. Google Fonts requests are stubbed either way. The page runs on Playwright's fake clock
so the Undo toast's 8-second timer can be tested. Uses its own browser: the Playwright MCP browser is
shared with other sessions. A failed check is reported and the run continues; the exit code is 1 if
any failed. A missing element stops the run at once with exit code 1.
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
BANNED = ["—", "·", "→", "!", "Welcome back", "Here's", "Let's", "simply", "repriced", "reimagined", "/yr", "/mo"]
BANNED_YOUR_COSTS = ["CPI", "YoY", "relative importance"]
SHEETS = ["Your estimate", "Price changes", "Average prices", "Monthly trend", "How it works"]
MINUS = "−"
RENEWAL = "Add your renewal increase"

failures = []


def check(cond, msg):
    print(("ok:   " if cond else "FAIL: ") + msg)
    if not cond:
        failures.append(msg)


# Design rules 1, 2, 4 (emoji, code), 5 (revision 4 wording), radius by role, dark-mode surfaces.
# Returns a list of problems; empty means the view passes.
RULES_JS = r"""
(dark) => {
  const problems = [];
  const seen = new Set();
  const note = (msg) => { if (!seen.has(msg) && seen.size < 40) { seen.add(msg); problems.push(msg); } };
  const visible = (el, cs) => cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0;
  const name = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "");
  const families = new Set();
  // Roles: 3px bars, 5px slider tracks, 6px controls, chips and tinted rows, 8px tinted cards,
  // the hover card and the toast, 10px the result strip, 50% dots and slider thumbs.
  const radii = new Set(["0px", "3px", "5px", "6px", "8px", "10px", "50%"]);
  const lum = (rgb) => {
    const m = rgb.match(/[\d.]+/g); if (!m) return 0;
    const [r, g, b] = m.slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const transparent = (c) => c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
  const sides = ["Top", "Right", "Bottom", "Left"];
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
    const bordered = sides.every((s) => parseFloat(cs[`border${s}Width`]) > 0);
    // One bordered raised surface per view; fixed elements (toast, hover card) are exempt.
    const exempt = cs.position === "fixed" || el.closest(".hover-card");
    if (!exempt && bordered && !transparent(cs.backgroundColor) && parseFloat(cs.borderTopLeftRadius) >= 8) raised += 1;
    if (el.matches(".fam, .mrow") && sides.some((s) => parseFloat(cs[`border${s}Width`]) > 0)) {
      note(`rule 5: tinted ${name(el)} has a border`);
    }
    if (dark && !transparent(cs.backgroundColor) && lum(cs.backgroundColor) > 0.4
        && !el.closest(".bar-track, .toast, [aria-pressed='true'], .check, [data-family], [data-publisher], .slider")) {
      note(`dark: light background ${cs.backgroundColor} on ${name(el)}`);
    }
  }
  if (families.size > 2) note(`rule 1: ${families.size} font families: ${[...families].join(", ")}`);
  if (raised > 1) note(`rule 5: ${raised} bordered raised surfaces`);
  if (document.querySelector("code, pre, kbd, samp")) note("rule 1: a code element is rendered");
  const text = document.body.innerText;
  if (/\p{Extended_Pictographic}|️/u.test(text)) note("rule 4: emoji in rendered text");
  if (/NaN|Infinity|undefined|\[object Object\]/.test(text)) note("broken value (NaN, Infinity, undefined) in rendered text");
  if (document.documentElement.scrollWidth > window.innerWidth) note("horizontal scroll");
  return problems;
}
"""

# True when no bar is mid-animation: a scaleX transform makes the drawn width differ from the layout width.
FULL_BARS_JS = r"""
(sel) => [...document.querySelectorAll(sel)].filter((b) => b.offsetWidth > 0)
  .every((b) => Math.abs(b.getBoundingClientRect().width - b.offsetWidth) < 0.5)
"""

# Sets a range input the way a drag does, so React's onChange runs.
SET_SLIDER_JS = r"""
([sel, value]) => {
  const el = document.querySelector(sel);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(value));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
"""

AMOUNTS_END_JS = "() => document.querySelector('.amounts').getBoundingClientRect().bottom + window.scrollY"

FUEL_GAPS_JS = r"""
() => [...document.querySelectorAll(".fuel")].map((f) => {
  const h = [...f.querySelectorAll(".help")];
  return h.length < 2 ? null : h[1].getBoundingClientRect().top - h[0].getBoundingClientRect().bottom;
})
"""


def dollars(text):
    """'+$980 a year' -> 980, '−$40' -> -40, 'under $10 a year' -> 0, 'Add your renewal increase' -> 0."""
    t = text.strip().removesuffix(" a year")
    if t in ("", "under $10", "$0") or t.startswith("Add your renewal"):
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


def new_page(browser, args, width, theme, reduced=True, touch=False):
    context = browser.new_context(viewport={"width": width, "height": 900}, color_scheme=theme, has_touch=touch,
                                  reduced_motion="reduce" if reduced else "no-preference", accept_downloads=True)
    page = context.new_page()
    page.clock.install()
    errors = []
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    if not args.real_fonts:
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
    text = page.locator("body").inner_text()
    banned = BANNED + (BANNED_YOUR_COSTS if your_costs else [])
    found = [b for b in banned if b in text]
    check(found == [], f"{where}: voice guide banned strings {found}")


def hover(page, locator):
    """Scroll first (scrolling closes an open card), then point at the target."""
    locator.scroll_into_view_if_needed()
    page.wait_for_timeout(100)
    locator.hover()
    page.wait_for_timeout(150)


def focus_opens(page, locator):
    """Focus a target and report whether a card opened. The mouse moves to the page margin first, so a card
    opened by the resting pointer (Chrome re-sends pointer events after a scroll) never counts."""
    page.mouse.move(0, 0)
    page.locator("#page-title").focus()
    page.keyboard.press("Escape")
    page.wait_for_timeout(50)
    locator.focus()
    page.wait_for_timeout(150)
    return page.locator("#hover-card").count() == 1


def card_text(page):
    card = page.locator("#hover-card")
    return card.inner_text() if card.count() else ""


def quick_start(page, label):
    page.get_by_role("button", name=label, exact=True).click()
    page.wait_for_timeout(200)


def set_cards(page, expanded):
    """Phones: open (or fold) every family card. A no-op at 600px and wider, where cards never fold."""
    heads = page.locator(f"button.fam-head[aria-expanded='{'false' if expanded else 'true'}']")
    for _ in range(12):
        if heads.count() == 0:
            break
        heads.first.click()
        page.wait_for_timeout(50)


def card_sums_ok(page, where):
    """Card rows, and separately card headings, add up to the answer; no row shows the opposite sign of its rate."""
    answer = page.locator(".answer").text_content()
    total = answer_total(answer)
    if total is None:
        check(answer.startswith("Enter your monthly amounts") or answer.startswith("Price data"), f"{where}: zero-total message")
        return
    rows = [dollars(t) for t in page.locator(".fam .amt-adds").all_text_contents()]
    heads = [dollars(t) for t in page.locator(".fam .fam-total").all_text_contents()]
    check(len(rows) > 0 and sum(rows) == total, f"{where}: rows add up ({sum(rows)} vs {total})")
    check(sum(heads) == total, f"{where}: card headings add up ({sum(heads)} vs {total})")
    flips = []
    for row in page.locator(".fam .amt").all():
        rate = row.locator(".amt-rate").text_content() if row.locator(".amt-rate").count() else ""
        amt = row.locator(".amt-adds").text_content()
        if (rate.startswith("+") and amt.startswith(MINUS)) or (rate.startswith(MINUS) and amt.startswith("+")):
            flips.append(f"{rate} {amt}")
    check(flips == [], f"{where}: no row shows the opposite sign of its rate {flips}")


def flows(browser, args, base):
    """Phone flows at 390px, light, reduced motion."""
    context, page, errors = new_page(browser, args, 390, "light")
    text = lambda sel: page.locator(sel).first.text_content()

    # Average first screen: the strip, folded cards holding basket rows as text.
    go(page, base)
    check(page.title() == "Inflation Reality", "Your costs title")
    check(text(".strip h2").startswith("The average U.S. household vs. "), "Average title")
    check(answer_total(text(".answer")) is not None, "Average answer")
    check(page.locator(".verdict").count() == 0 and page.locator(".compare").count() == 0, "Average has no verdict or bars")
    check(page.locator(".strip-more .btn", has_text="Answer the questions").count() == 1, "390: Answer the questions sits under the strip")
    check(page.locator(".mix-legend .lg").count() == 7, "Average spending mix has one legend item per family")
    check(page.locator("button.fam-head").count() == 7
          and page.locator("button.fam-head[aria-expanded='true']").count() == 0, "390: every card starts folded")
    check(page.locator(".fam input").count() == 0, "Average rows are text, not inputs")
    check(text(".amounts-note") == "Answer the questions or pick a household to change these.", "Average note under the cards")
    card_sums_ok(page, "Average")
    rules(page, "Your costs, Average, 390 light", False, True)

    # Mortgage: 0% line, explanation, guesses, basis, owners' yardstick.
    page.get_by_role("button", name=re.compile("^Mortgage")).click()
    page.wait_for_timeout(200)
    check(page.locator(".opt.guess").count() == 3, "three guessed answers")
    check(text(".basis").startswith("Based on 1 answer and 3 guesses."), "basis wording")
    check(page.locator(".help").first.text_content().startswith("A fixed-rate payment"), "mortgage explanation")
    check("Prices other than housing" in text(".rates"), "owners compared with prices other than housing")
    verdict = text(".verdict")
    check("prices other than housing" in verdict or verdict.startswith("About the same as prices other than housing"),
          "owner verdict names the yardstick")
    check(page.locator(".amt", has_text="Mortgage payment").locator(".amt-rate").text_content() == "0%", "mortgage line is 0%")

    # Empty renewal box: the row and the folded heading both say so; a phone heading opens its sliders.
    home = page.locator(".fam[data-family='home']")
    head = home.locator("button.fam-head")
    insurance = home.locator(".amt", has_text="Home insurance").locator(".amt-adds")
    check(insurance.text_content() == RENEWAL, "empty renewal box shows the prompt in its row")
    check(home.locator("button.fam-head .fam-prompt").count() == 1 and home.locator(".fam-prompt").text_content() == RENEWAL,
          "empty renewal box shows the prompt inside the folded heading's button")
    check(home.locator(".slider").first.is_hidden(), "390: a folded card hides its sliders")
    head.click()
    page.wait_for_timeout(100)
    check(head.get_attribute("aria-expanded") == "true" and home.locator(".slider").first.is_visible()
          and page.locator("#" + head.get_attribute("aria-controls")).count() == 1,
          "390: a card heading toggles aria-expanded and reveals its sliders")
    page.locator("#renewal-homeIns").fill("8")
    page.wait_for_timeout(200)
    check(insurance.text_content() != RENEWAL, "the row's prompt leaves once a rate is typed")

    # Daycare checkbox adds a line.
    page.get_by_role("checkbox", name="Daycare").check()
    page.wait_for_timeout(200)
    check(page.locator(".amt", has_text="Daycare").count() == 1, "daycare line appears")

    # A falling price renders as −$ (bus and train fares fall in the fixture).
    page.get_by_role("button", name=re.compile("^No car")).click()
    page.wait_for_timeout(200)
    if not args.live_data:
        fares = page.locator(".amt", has_text="Bus and train fares").locator(".amt-adds").text_content()
        check(fares.startswith(MINUS + "$"), f"a falling price shows {MINUS}$ ({fares})")
    card_sums_ok(page, "Personal, defaults")
    set_cards(page, True)
    rules(page, "Your costs, Personal, 390 light, cards open", False, True)
    for sel in (".lg", ".compare .bar-track", "#amount-groceries"):
        check(not focus_opens(page, page.locator(sel).first), f"390: focus on {sel} opens no card")

    # Sliders: live, and an amount above the slider's range pins the thumb.
    before = text(".answer")
    page.evaluate(SET_SLIDER_JS, ["#slider-groceries", 1200])
    page.wait_for_timeout(150)
    check(page.locator("#amount-groceries").input_value() == "1200", "the slider fills its dollar box")
    check(text(".answer") != before, "the slider changes the answer live")
    check(page.locator("#slider-groceries").get_attribute("aria-valuetext") == "$1,200 a month", "slider aria-valuetext")
    page.locator("#amount-groceries").fill("4000")
    page.wait_for_timeout(150)
    check(page.locator("#slider-groceries").input_value() == "1900" and page.locator("#amount-groceries").input_value() == "4000",
          "an amount above the slider's max pins the thumb at the end")

    # Random amounts, including 0 and tiny values: totals add up, no sign flips, no NaN.
    rng = random.Random(args.seed)
    print(f"random amounts seed {args.seed}")
    choices = [0, 0, 1, 4, 5, 6, 9, 14, 15, 37, 120, 999, 2500]
    inputs = page.locator("input[id^='amount-']")
    for round_ in range(args.rounds):
        for i in range(inputs.count()):
            inputs.nth(i).fill(str(rng.choice(choices + [rng.randint(0, 6000)])))
        page.wait_for_timeout(200)
        card_sums_ok(page, f"random amounts round {round_ + 1}")
        check("NaN" not in page.locator(".calc").inner_text(), f"random amounts round {round_ + 1}: no NaN")
    for i in range(inputs.count()):
        inputs.nth(i).fill("0")
    page.wait_for_timeout(200)
    check(text(".answer") == "Enter your monthly amounts to see your estimate.", "all amounts 0: zero-total message")
    check(page.locator(".fam .slider").count() > 0 and page.locator(".mix").count() == 0, "all amounts 0: cards stay, no mix bar")
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
    check(text(".strip h2").startswith("The average U.S. household"), "Start over returns to Average")
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
    check(text(".strip h2").startswith("Your costs vs. "), "Undo restores answers")

    # Quick starts: plain buttons; a tap fills everything in, folds the questions and offers Undo.
    quick = page.locator(".quick .btn")
    check(quick.count() == 4 and all(b.get_attribute("aria-pressed") is None for b in quick.all()),
          "four quick starts, never toggles")
    quick_start(page, "Commuter")
    check(page.locator(".summary").count() == 1 and page.locator("#questions").count() == 0, "a quick start folds the questions")
    check(text(".summary p").startswith("Rent, gas car, electric heat, health insurance through work."), "Commuter summary")
    check(text(".basis") == "Based on your answers.", "a quick start counts as answered")
    check(text(".toast").startswith("Filled in as Commuter."), "quick start Undo toast")
    check(page.evaluate("document.activeElement.id") == "answer", "focus moves to the answer")
    check(page.locator("#amount-gasoline").input_value() == "380", "Commuter gas amount")
    set_cards(page, False)
    end = page.evaluate(AMOUNTS_END_JS)
    check(end <= 2000, f"390: Commuter amounts end within 2,000px with every card folded ({end:.0f})")
    page.get_by_role("button", name="Undo").click()
    page.wait_for_timeout(200)
    check(page.locator(".summary").count() == 0 and page.locator("#questions").count() == 1, "Undo unfolds the questions it folded")
    check(page.locator(".amt", has_text="Mortgage payment").count() == 1, "Undo restores the answers from before the tap")

    # Folded questions stay folded across tab switches.
    quick_start(page, "Retiree")
    page.get_by_role("link", name="Sources", exact=True).click()
    page.wait_for_timeout(300)
    page.get_by_role("link", name="Your costs", exact=True).click()
    page.wait_for_timeout(300)
    check(page.locator(".summary").count() == 1, "folded questions stay folded after switching tabs")

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
    check(page.locator(".trend-chart[aria-hidden]").count() == 0, "National: the chart is not aria-hidden")
    check(page.locator(".measures .mrow").count() >= 3, "National: other measures listed")
    check(page.locator(".mrow .mrow-blurb").count() == page.locator(".mrow").count(), "390: each measure's blurb shows under its row")
    check(not focus_opens(page, page.locator(".mrow").first), "390: focus on a measure row opens no card")
    chip = page.locator(".chip").first
    chip.click()
    page.wait_for_timeout(100)
    check(chip.get_attribute("aria-pressed") == "true" and page.locator(".measures.focusing").count() == 1,
          "National: a publisher chip highlights its rows")
    chip.click()
    page.wait_for_timeout(100)
    check(chip.get_attribute("aria-pressed") == "false" and page.locator(".measures.focusing").count() == 0,
          "National: the chip toggles off")
    ticks = page.locator(".trend-chart .recharts-yAxis .recharts-cartesian-axis-tick-value").all_text_contents()
    nums = [float(t.replace("%", "").replace(MINUS, "-")) for t in ticks]
    steps = {round(b - a, 4) for a, b in zip(nums, nums[1:])}
    check(len(nums) >= 3 and len(steps) == 1 and 0 in nums, f"National: evenly spaced y-axis ticks {ticks}")
    if not args.live_data:
        check("Using the last known value for Median CPI." in page.locator("main").inner_text(), "National: stale note")
    go(page, base, "#price-check")
    check(page.locator(".data-table tbody tr th[scope=row]").count() == 21, "Price check: 21 average prices")
    check(page.locator(".bar-list .bar-row").count() == 10 and page.locator(".bar-list .bar-row .dot").count() == 10,
          "Price check: 10 biggest changes, each with a family dot")
    check(page.locator(".fuel").count() == 2, "Price check: gas and diesel")
    gaps = page.evaluate(FUEL_GAPS_JS)
    check(any(g is not None for g in gaps) and all(g is None or g >= 4 for g in gaps), f"Price check: fuel notes are separate paragraphs {gaps}")
    go(page, base, "#sources")
    yard = page.locator("table[aria-labelledby='series-yardstick']").inner_text()
    lines = page.locator("table[aria-labelledby='series-household']").inner_text()
    check("CUUR0000SA0L2" in yard and "CUUR0000SA0L2" not in lines, "Sources: the yardstick is a source series, not a line")
    bls = page.locator("a", has_text="CUUR0000SETE").first.get_attribute("href")
    check(bls == "https://data.bls.gov/timeseries/CUUR0000SETE", "Sources: BLS series link to BLS")
    check(page.locator("table[aria-labelledby='series-household'] .dot").count() == 17, "Sources: a family dot on each household series")

    # Download: five sheets, and the estimate sheet is the saved (Retiree) household.
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
            check("Home repairs" in sheet1 and "Your costs vs." in sheet1, "spreadsheet has the saved estimate")
    page.wait_for_timeout(200)
    check(page.locator(".status").inner_text() == "Spreadsheet downloaded.", "download status")

    check(errors == [], f"no console errors in the phone flows {errors}")
    context.close()


def desktop_flows(browser, args, base, seen):
    """Hover cards, keyboard focus and page height at 1280px, light, reduced motion."""
    context, page, errors = new_page(browser, args, 1280, "light")
    go(page, base)
    check(page.locator(".strip .mix").count() == 1 and page.locator(".strip-more").count() == 0,
          "1280: the mix bar sits inside the strip")
    check(page.locator(".fam-head[tabindex='0']").count() == page.locator(".fam").count() > 0,
          "1280: card headings are focusable labels, not fold buttons")
    check(focus_opens(page, page.locator(".amt.avg").first), "1280: keyboard focus on an Average row opens its card")
    page.locator("#page-title").focus()
    quick_start(page, "Commuter")
    seen["commuter"] = page.locator(".answer").text_content()
    end = page.evaluate(AMOUNTS_END_JS)
    check(end <= 1500, f"1280: Commuter amounts end within 1,500px ({end:.0f})")
    card_sums_ok(page, "Commuter, 1280")

    # Hovering a row shows a card with its dollar figures, and the highlights link up.
    row = page.locator(".amt", has_text="Gas for the car")
    hover(page, row)
    body = card_text(page)
    adds = row.locator(".amt-adds").text_content().removesuffix(" a year")
    check("You pay now" in body and "$380 a month, $4,560 a year" in body and "Adds this year" in body and adds in body,
          f"hovering a row shows its dollar figures ({body!r})")
    described = page.locator("#amount-gasoline").get_attribute("aria-describedby") or ""
    check("hover-card" in described.split() and "hint-gasoline" in described.split() and row.get_attribute("aria-describedby") is None,
          f"the row's dollar box points at its card and its hint, the row itself at nothing ({described!r})")
    check(page.locator(".fam.hl[data-family='around']").count() == 1, "the row's card is highlighted")
    check(page.locator(".mix.dim .slice.hl[data-family='around']").count() == 1, "its mix slice stands out")
    check(page.locator(".mix-legend .lg.hl[data-family='around']").count() == 1, "its legend item stands out")
    page.mouse.move(2, 2)
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 0, "the card closes when the pointer leaves")
    hover(page, page.locator(".lg", has_text="Food"))
    check(page.locator(".fam.hl[data-family='food']").count() == 1 and "Share of your spending" in card_text(page),
          "pointing at a legend item shows its card and highlights its family card")
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    check(page.locator("#hover-card").count() == 0, "Escape closes the card")
    page.mouse.move(2, 2)
    page.locator(".fam-head[tabindex='0']").first.focus()
    page.wait_for_timeout(150)
    check("Share of your spending" in card_text(page), "keyboard focus on a card heading opens its card")
    page.locator("#amount-gasoline").focus()
    page.wait_for_timeout(150)
    page.evaluate(SET_SLIDER_JS, ["#slider-gasoline", 480])
    page.wait_for_timeout(150)
    check("$480 a month" in card_text(page), "an open row card updates while its slider moves")
    for sel in (".lg", ".compare .bar-track", "#amount-gasoline"):
        check(focus_opens(page, page.locator(sel).first), f"1280: keyboard focus on {sel} opens its card")
    page.locator("#page-title").focus()
    hover(page, page.locator(".compare .bar-track").first)
    check("weighted by what you spend" in card_text(page), "the Your costs bar has a card")

    # National numbers: the crosshair's keyboard steps, measure and big-number cards.
    go(page, base, "#national-numbers")
    seen["stats"] = page.locator(".stat-value").all_text_contents()
    months = page.locator(".trend-chart + table tbody th").all_text_contents()
    chart = page.locator(".trend-chart [tabindex='0']").first
    chart.scroll_into_view_if_needed()
    chart.focus()
    page.wait_for_timeout(200)
    tip = page.locator(".chart-card .hc-title")
    shown = lambda: tip.text_content() if tip.count() else None
    check(shown() == months[-1], f"trend: focus shows the latest month ({shown()})")
    page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(150)
    check(shown() == months[-2], f"trend: ArrowLeft steps back a month ({shown()})")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(150)
    check(shown() == months[-1], "trend: ArrowRight steps forward again")
    page.keyboard.press("Escape")
    page.wait_for_timeout(150)
    check(tip.count() == 0, "trend: Escape closes the chart's card")
    chart.blur()
    chart.focus()
    page.wait_for_timeout(150)
    page.keyboard.press("Tab")
    page.wait_for_timeout(150)
    check(tip.count() == 0, "trend: the chart's card closes when focus leaves the chart")
    page.locator("#page-title").focus()
    hover(page, page.locator(".mrow[data-publisher='commerce']").first)
    body = card_text(page)
    check("Published by" in body and "prices overall" in body, f"a measure row's card compares it with prices overall ({body!r})")
    hover(page, page.locator(".stat.overall"))
    check("This is the number in the news." in card_text(page), "the big number's card says how it is measured")
    page.mouse.move(2, 2)
    check(page.locator(".mrow-blurb").count() == 0, "1280: measure blurbs live in the cards")
    for sel in (".mrow", ".stat"):
        check(focus_opens(page, page.locator(sel).first), f"1280: keyboard focus on {sel} opens its card")
    go(page, base, "#price-check")
    check(focus_opens(page, page.locator(".bar-list .bar-row").first), "1280: keyboard focus on a price change row opens its card")
    page.locator("#page-title").focus()
    hover(page, page.locator(".bar-list .bar-row").first)
    body = card_text(page)
    check("Price now" in body and "A year ago" in body, f"a price change row's card shows both prices ({body!r})")

    # Reduced motion: bars are at full width on first paint.
    page.goto(base + "#national-numbers")
    page.wait_for_selector("#page-title")
    check(page.evaluate(FULL_BARS_JS, ".bar, .pace-bar"), "reduced motion: bars are at full width on first paint")

    check(errors == [], f"no console errors in the desktop flows {errors}")
    context.close()


def touch_flows(browser, args, base):
    """Touch: rows, sliders and fold buttons open no card; a legend tap pins one; a tap elsewhere closes it."""
    context, page, errors = new_page(browser, args, 390, "light", touch=True)
    go(page, base)
    page.get_by_role("button", name="Commuter", exact=True).tap()
    page.wait_for_timeout(200)
    head = page.locator(".fam[data-family='around'] button.fam-head")
    head.tap()
    page.wait_for_timeout(100)
    check(head.get_attribute("aria-expanded") == "true" and page.locator("#hover-card").count() == 0,
          "touch: a fold button opens its card and no hover card")
    page.locator(".amt", has_text="Gas for the car").locator(".amt-label").tap()
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 0, "touch: tapping a row opens no card")
    page.locator("#slider-gasoline").tap()
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 0, "touch: tapping a slider opens no card")
    page.locator(".lg").first.tap()
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 1, "touch: tapping a legend item shows its card")
    page.locator("#page-title").tap()
    page.wait_for_timeout(150)
    check(page.locator("#hover-card").count() == 0, "touch: a tap elsewhere closes the card")
    head.tap()
    page.wait_for_timeout(100)
    check(head.get_attribute("aria-expanded") == "false" and page.locator("#hover-card").count() == 0,
          "touch: the fold button folds the card and opens no hover card")
    check(errors == [], f"touch at 390: no console errors {errors}")
    context.close()
    # A touch tablet is wide enough for focus cards, but a tapped dollar box must not open one.
    context, page, errors = new_page(browser, args, 820, "light", touch=True)
    go(page, base)
    page.get_by_role("button", name="Commuter", exact=True).tap()
    page.wait_for_timeout(200)
    page.locator("#amount-gasoline").tap()
    page.wait_for_timeout(150)
    check(page.evaluate("document.activeElement.id") == "amount-gasoline" and page.locator("#hover-card").count() == 0,
          "tablet touch: tapping a dollar box focuses it and opens no card")
    check(errors == [], f"touch at 820: no console errors {errors}")
    context.close()


def motion_pass(browser, args, base, seen):
    """One pass with motion on: count-ups and bars settle to the same numbers as with reduced motion."""
    context, page, errors = new_page(browser, args, 1280, "light", reduced=False)
    go(page, base, "#national-numbers")
    page.clock.run_for(2000)       # count-ups and the line draw-in run on requestAnimationFrame (fake clock)
    page.wait_for_timeout(1000)    # CSS bar animations run on the real clock
    check(page.locator(".stat-value").all_text_contents() == seen["stats"], "motion on: big numbers settle to the same values")
    check(page.evaluate(FULL_BARS_JS, ".bar, .pace-bar"), "motion on: bars settle at full width")
    go(page, base)
    quick_start(page, "Commuter")
    page.clock.run_for(1000)
    page.wait_for_timeout(100)
    check(page.locator(".answer").text_content() == seen["commuter"], "motion on: the answer settles to the same number")
    check(errors == [], f"motion on: no console errors {errors}")
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
            go(page, base)
            check(page.evaluate("getComputedStyle(document.querySelector('.strip')).position") == "sticky",
                  f"{width} {theme}: the result strip is sticky")
            page.evaluate("window.scrollTo(0, 1500)")
            page.wait_for_timeout(100)
            top = page.evaluate("document.querySelector('.strip').getBoundingClientRect().top")
            check(top <= 1, f"{width} {theme}: the strip stays at the top after scrolling ({top:.0f})")
            if width == 1280 and theme == "dark":
                quick_start(page, "Family with kids")
                rules(page, "Your costs, Personal, 1280 dark", True, True)
            check(errors == [], f"{width} {theme}: no console errors {errors}")
            context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:4719/inflation-reality/")
    parser.add_argument("--live-data", action="store_true", help="use the site's real cpi.json (live site only)")
    parser.add_argument("--real-fonts", action="store_true", help="load the real web fonts instead of stubbing them (needs the network)")
    parser.add_argument("--seed", type=int, default=random.randrange(1_000_000), help="random-amounts seed (printed)")
    parser.add_argument("--rounds", type=int, default=6, help="random-amounts rounds")
    args = parser.parse_args()
    base = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
    if args.live_data and re.match(r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)[:/]", base):
        sys.exit("--live-data needs the live site: vite preview has no cpi.json, so it logs a 404 and every console "
                 "error counts. Drop --live-data, or pass --base-url https://derektm17.github.io/inflation-reality/.")
    print(f"auditing {base} with {'live data' if args.live_data else 'the fixture'}")
    seen = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        flows(browser, args, base)
        desktop_flows(browser, args, base, seen)
        touch_flows(browser, args, base)
        motion_pass(browser, args, base, seen)
        matrix(browser, args, base)
        browser.close()
    print(f"\n{len(failures)} failed" if failures else "\naudit passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
