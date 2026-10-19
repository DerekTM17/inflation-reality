import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emptyAnswers, isPersonal, applyQuickStart } from "../calculator/model.js";
import { summaryText, finePrint } from "../calculator/panel.js";
import { familyCards, familyHover, compareHover, rowHover } from "../calculator/cards.js";
import { createVisit, foldOnMount, toggleOpen } from "../calculator/visit.js";
import { estimateFor } from "../tabs/estimate.js";
import { getStorage, storageAvailable, loadAnswers, saveAnswers } from "../calculator/storage.js";
import YourCostsIntro from "./YourCostsIntro.jsx";
import ResultStrip from "../components/ResultStrip.jsx";
import QuickStarts from "../components/QuickStarts.jsx";
import Questions from "../components/Questions.jsx";
import Summary from "../components/Summary.jsx";
import FamilyCards from "../components/FamilyCards.jsx";
import Toast from "../components/Toast.jsx";
import LiveRegion from "../components/LiveRegion.jsx";
import HoverCard from "../components/HoverCard.jsx";
import { useHover } from "../components/useHover.js";
import { useMediaQuery } from "../components/useMedia.js";
import { useFirstView } from "../components/useMotion.js";

const withPeriod = (s) => (s.endsWith(".") ? s : `${s}.`);
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Lasts for the visit, never saved: once the questions fold (saved answers on load, or a
// quick start) they stay folded across tab switches (App unmounts this view on route
// change) until Change answers or Start over.
const visit = createVisit();

/**
 * The Your costs tab (spec "Revision 4 layout"): headline, the sticky result strip,
 * basis, quick starts, the questions (or the Summary), the monthly amounts, fine print.
 * States (spec "States"): Average until any answer or checkbox, then Personal; a load
 * with saved personal answers starts folded (Returning).
 */
export default function YourCosts({ data, base, onNavigate }) {
  const storage = useMemo(getStorage, []);
  const canSave = useMemo(() => storageAvailable(storage), [storage]);
  const [answers, setAnswers] = useState(() => loadAnswers(storage) ?? emptyAnswers());
  const [folded, setFoldedState] = useState(() => foldOnMount(visit, isPersonal(answers)));
  const [open, setOpen] = useState(() => visit.open); // family cards open on a phone, for the visit
  const [hl, setHl] = useState(null); // the family card the pointer is over, for linked highlights
  const [cleared, setCleared] = useState(null); // { answers, folded, refold, message, key } while the Undo toast is up
  const [pendingFocus, setPendingFocus] = useState(null);
  const stripRef = useRef(null);
  const wide = useMediaQuery("(min-width: 900px)");
  const hover = useHover();
  const play = useFirstView("your-costs");

  // One source for the strip's numbers, shared with the spreadsheet download.
  const { mode, rows, model } = useMemo(() => estimateFor(answers, data), [answers, data]);
  const personal = mode === "personal";
  const fine = useMemo(() => finePrint({ mode, rows, data }), [mode, rows, data]);
  const { cards, mix } = useMemo(() => familyCards({ mode, rows, model, answers }), [mode, rows, model, answers]);

  useEffect(() => {
    if (canSave) saveAnswers(storage, answers);
  }, [answers, canSave, storage]);

  // Focused controls and in-page jumps must land below the sticky strip, whose height
  // changes with its content: keep it in a CSS variable that scroll-padding-top reads.
  useEffect(() => {
    const el = stripRef.current;
    const root = document.documentElement;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      root.style.setProperty("--strip-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--strip-h");
    };
  }, []);

  // Move focus after the render that makes the target exist (unfolded questions, the
  // answer after a quick start, the Undo toast). The toast and the answer skip
  // scrollIntoView: the toast so Start over on a phone doesn't jump the page, the answer
  // because it sits in the sticky strip, which is always on screen.
  useEffect(() => {
    if (!pendingFocus) return;
    const el = document.getElementById(pendingFocus);
    if (el) {
      el.focus({ preventScroll: true });
      if (pendingFocus !== "undo-button" && pendingFocus !== "answer") {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  // Any real change to the answers closes a pending Undo toast, so Undo can never
  // silently overwrite newer answers with the earlier ones.
  const update = (fn) => {
    setAnswers((prev) => fn(prev));
    setCleared(null);
  };
  const onAnswer = (qid, option) => update((a) => ({ ...a, answered: { ...a.answered, [qid]: option } }));
  const onAlso = (id, checked) => update((a) => ({ ...a, also: { ...a.also, [id]: checked } }));
  const onAmount = (id, value) => update((a) => ({ ...a, amounts: { ...a.amounts, [id]: value } }));
  const onRenewal = (id, value) => update((a) => ({ ...a, renewals: { ...a.renewals, [id]: value } }));

  const fold = (value) => {
    visit.folded = value;
    setFoldedState(value);
  };
  // A quick start replaces everything the person entered (renewal rates are kept), so it
  // offers Undo like Start over. Undo also puts the questions back as they were.
  const onQuickStart = (quick) => {
    setCleared((c) => ({ answers, folded, refold: true, message: `Filled in as ${quick.label}.`, key: (c?.key ?? 0) + 1 }));
    setAnswers((prev) => applyQuickStart(prev, quick));
    visit.returning = false;
    fold(true);
    setPendingFocus("answer");
  };
  const toQuestions = () => {
    fold(false);
    setPendingFocus("questions");
  };
  const startOver = () => {
    setCleared((c) => ({ answers, folded: false, refold: false, message: "Answers cleared.", key: (c?.key ?? 0) + 1 }));
    setAnswers(emptyAnswers());
    visit.returning = false;
    fold(false);
    setPendingFocus("undo-button");
  };
  const undo = () => {
    if (cleared) {
      setAnswers(cleared.answers);
      if (cleared.refold) fold(cleared.folded);
    }
    setCleared(null);
    setPendingFocus(cleared?.refold && cleared.folded ? "answer" : "questions");
  };
  // Also covers the toast closing on its own (its timer never runs while focus is
  // inside it, but this stays correct if that ever changes): don't strand focus on
  // a node that's about to unmount.
  const closeToast = useCallback(() => {
    const insideToast = document.activeElement?.closest?.(".toast");
    setCleared(null);
    if (insideToast) setPendingFocus("questions");
  }, []);

  const toggleCard = (id) => {
    const next = toggleOpen(open, id);
    visit.open = next;
    setOpen(next);
  };
  // Linked highlights: the card under the pointer, else the family whose card is open.
  const highlight = hl ?? hover.state?.family ?? null;
  // Card content comes from the latest numbers on every render, so an open card
  // follows its slider live (spec "Hover detail cards").
  const hoverContent = (key) => {
    if (!key) return null;
    const [kind, id] = key.split(":");
    if (kind === "fam") {
      const card = cards.find((c) => c.id === id);
      return card ? familyHover(card, personal) : null;
    }
    if (kind === "row") {
      const row = cards.flatMap((c) => c.rows).find((r) => r.id === id);
      return row ? rowHover(row, data.referenceMonth, personal) : null;
    }
    if (kind === "cmp") return compareHover(model, id);
    return null;
  };

  const liveText = [model.title, model.answer, model.verdict].filter(Boolean).map(withPeriod).join(" ");

  return (
    <>
      <section className={play ? "calc play" : "calc"} aria-label="Your costs">
        <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={folded && visit.returning} />
        <ResultStrip
          model={model}
          mix={mix}
          personal={personal}
          wide={wide}
          hover={hover}
          highlight={highlight}
          onAnswerQuestions={toQuestions}
          stripRef={stripRef}
        />
        {model.basis && <p className="basis">{model.basis}</p>}
        <QuickStarts onPick={onQuickStart} />
        <div className="questions-area">
          {folded ? (
            <Summary
              text={summaryText(answers, rows)}
              canSave={canSave}
              onChangeAnswers={toQuestions}
              onStartOver={startOver}
            />
          ) : (
            <>
              <Questions answers={answers} personal={personal} onAnswer={onAnswer} onAlso={onAlso} />
              {personal && (
                <p className="saved">
                  {canSave && "Saved in this browser only. "}
                  <button type="button" className="text-btn" onClick={startOver}>Start over</button>
                </p>
              )}
            </>
          )}
        </div>
        <FamilyCards
          cards={cards}
          personal={personal}
          narrow={!hover.wide}
          open={open}
          onToggle={toggleCard}
          highlight={highlight}
          onHighlight={setHl}
          hover={hover}
          onAmount={onAmount}
          onRenewal={onRenewal}
        />
        <div className="fine">
          {fine.map((text) => <p key={text}>{text}</p>)}
        </div>
      </section>
      <LiveRegion text={liveText} />
      {cleared && <Toast key={cleared.key} message={cleared.message} onUndo={undo} onClose={closeToast} />}
      <HoverCard anchor={hover.state?.el ?? null} content={hoverContent(hover.state?.key)} />
    </>
  );
}
