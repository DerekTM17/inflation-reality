import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASKET } from "../data/catalog.js";
import { emptyAnswers, isPersonal, personalRows, averageRows } from "../calculator/model.js";
import { panelModel, summaryText, finePrint } from "../calculator/panel.js";
import { getStorage, storageAvailable, loadAnswers, saveAnswers } from "../calculator/storage.js";
import YourCostsIntro from "./YourCostsIntro.jsx";
import Questions from "../components/Questions.jsx";
import Summary from "../components/Summary.jsx";
import ResultPanel from "../components/ResultPanel.jsx";
import Amounts from "../components/Amounts.jsx";
import Dock from "../components/Dock.jsx";
import Toast from "../components/Toast.jsx";
import LiveRegion from "../components/LiveRegion.jsx";

const withPeriod = (s) => (s.endsWith(".") ? s : `${s}.`);
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Fold on the first mount of a page load only; a later remount (tab switch, since
// App unmounts this view on route change) must not re-fold and lose an open toast.
let foldedThisLoad = false;

/**
 * The Your costs tab. States (spec "States"): Average until any answer or checkbox,
 * then Personal; a load with saved personal answers starts folded (Returning).
 * Folding happens only on load, never while someone is answering.
 */
export default function YourCosts({ data, base, onNavigate }) {
  const storage = useMemo(getStorage, []);
  const canSave = useMemo(() => storageAvailable(storage), [storage]);
  const [answers, setAnswers] = useState(() => loadAnswers(storage) ?? emptyAnswers());
  const [folded, setFolded] = useState(() => {
    if (foldedThisLoad) return false;
    foldedThisLoad = true;
    return isPersonal(answers);
  });
  const [amountsOpen, setAmountsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [cleared, setCleared] = useState(null); // { answers, key } while the Undo toast is up
  const [panelOnScreen, setPanelOnScreen] = useState(true);
  const [pendingFocus, setPendingFocus] = useState(null);
  const panelRef = useRef(null);

  const personal = isPersonal(answers);
  const mode = personal ? "personal" : "average";
  const rows = useMemo(
    () => (personal ? personalRows(answers, data) : averageRows(data, BASKET.ceMonthlyMean)),
    [personal, answers, data],
  );
  const model = useMemo(
    () => panelModel({ mode, rows, headlinePct: data.headline.yoy, referenceMonth: data.referenceMonth, answers }),
    [mode, rows, data, answers],
  );
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

  const toQuestions = () => {
    setFolded(false);
    setPendingFocus("questions");
  };
  const startOver = () => {
    setCleared((c) => ({ answers, key: (c?.key ?? 0) + 1 }));
    setAnswers(emptyAnswers());
    setFolded(false);
    setShowAll(false);
    setPendingFocus("undo-button");
  };
  const undo = () => {
    if (cleared) setAnswers(cleared.answers);
    setCleared(null);
    setPendingFocus("questions");
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
        <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={folded} />
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
      {cleared && <Toast key={cleared.key} onUndo={undo} onClose={closeToast} />}
    </>
  );
}
