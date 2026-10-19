import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASKET } from "../data/catalog.js";
import { emptyAnswers, isPersonal, applyQuickStart } from "../calculator/model.js";
import { createVisit, foldOnMount } from "../calculator/visit.js";
import { summaryText, finePrint } from "../calculator/panel.js";
import { estimateFor } from "../tabs/estimate.js";
import { getStorage, storageAvailable, loadAnswers, saveAnswers } from "../calculator/storage.js";
import YourCostsIntro from "./YourCostsIntro.jsx";
import QuickStarts from "../components/QuickStarts.jsx";
import Questions from "../components/Questions.jsx";
import Summary from "../components/Summary.jsx";
import ResultPanel from "../components/ResultPanel.jsx";
import Amounts from "../components/Amounts.jsx";
import Dock from "../components/Dock.jsx";
import Toast from "../components/Toast.jsx";
import LiveRegion from "../components/LiveRegion.jsx";

const withPeriod = (s) => (s.endsWith(".") ? s : `${s}.`);
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Lasts for the visit, never saved: once the questions fold (saved answers on load, or a
// quick start) they stay folded across tab switches (App unmounts this view on route
// change) until Change answers or Start over.
const visit = createVisit();

/**
 * The Your costs tab. States (spec "States"): Average until any answer or checkbox,
 * then Personal; a load with saved personal answers starts folded (Returning).
 * Folding happens only on load, never while someone is answering.
 */
export default function YourCosts({ data, base, onNavigate }) {
  const storage = useMemo(getStorage, []);
  const canSave = useMemo(() => storageAvailable(storage), [storage]);
  const [answers, setAnswers] = useState(() => loadAnswers(storage) ?? emptyAnswers());
  const [folded, setFoldedState] = useState(() => foldOnMount(visit, isPersonal(answers)));
  const [amountsOpen, setAmountsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [cleared, setCleared] = useState(null); // { answers, folded, refold, message, key } while the Undo toast is up
  const [panelOnScreen, setPanelOnScreen] = useState(true);
  const [pendingFocus, setPendingFocus] = useState(null);
  const panelRef = useRef(null);

  // One source for the panel's numbers, shared with the spreadsheet download.
  const { mode, rows, model } = useMemo(() => estimateFor(answers, data), [answers, data]);
  const personal = mode === "personal";
  const fine = useMemo(() => finePrint({ mode, rows, data }), [mode, rows, data]);

  useEffect(() => {
    if (canSave) saveAnswers(storage, answers);
  }, [answers, canSave, storage]);

  // The dock shows only while the panel is off screen.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setPanelOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Move focus after the render that makes the target exist (unfolded questions,
  // opened amounts, the Undo toast). The toast case skips scrollIntoView so
  // pressing Start over on a phone doesn't jump the page.
  useEffect(() => {
    if (!pendingFocus) return;
    const el = document.getElementById(pendingFocus);
    if (el) {
      el.focus({ preventScroll: true });
      if (pendingFocus !== "undo-button") {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  // Any real change to the answers closes a pending Undo toast, so Undo can never
  // silently overwrite newer answers with the cleared ones.
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
    setShowAll(false);
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
  const openRenewal = (id) => {
    setAmountsOpen(true);
    setPendingFocus(`renewal-${id}`);
  };
  const seeDetails = () =>
    panelRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  const liveText = [model.title, model.answer, model.verdict].filter(Boolean).map(withPeriod).join(" ");

  return (
    <>
      <section className="calc" aria-label="Your costs">
        <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={folded && visit.returning} />
        <div className="questions-area">
          <QuickStarts onPick={onQuickStart} />
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
        <div className="result-col">
          <ResultPanel
            ref={panelRef}
            model={model}
            fine={fine}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((v) => !v)}
            onAction={toQuestions}
            onPrompt={openRenewal}
          />
        </div>
        <Amounts
          rows={rows}
          personal={personal}
          monthlyMean={BASKET.ceMonthlyMean}
          open={amountsOpen}
          onToggle={() => setAmountsOpen((v) => !v)}
          onAmount={onAmount}
          onRenewal={onRenewal}
        />
      </section>
      <LiveRegion text={liveText} />
      <Dock
        label={personal ? "Your costs" : "Average U.S. household"}
        answer={model.answer}
        away={panelOnScreen}
        onSeeDetails={seeDetails}
      />
      {cleared && <Toast key={cleared.key} message={cleared.message} onUndo={undo} onClose={closeToast} />}
    </>
  );
}
