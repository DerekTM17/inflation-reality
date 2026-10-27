import CountUp from "./CountUp.jsx";
import { answerSentence } from "../calculator/panel.js";
import { roundToStep } from "../calculator/format.js";

const MINUS = "−";

/** A bar from zero: right for increases, left for decreases (spec "Numbers"). Grows in on a first view. */
function Bar({ bar, kind, i, neg }) {
  return (
    <span
      className={`bar ${kind} grow${neg ? " neg" : ""}`}
      style={{ left: `${bar.left}%`, width: `${bar.width}%`, "--i": i }}
    />
  );
}

/** Your costs vs. the yardstick. Each bar is a hover target and, for keyboard users, a tab stop. */
function Compare({ compare, hover }) {
  return (
    <div className="compare">
      <span>Your costs</span>
      <span className="bar-track" tabIndex={0} role="img" aria-label={`Your costs ${compare.you.text}`} {...hover.target("cmp:you")}>
        <Bar bar={compare.you.bar} kind="you" i={0} neg={compare.you.text.startsWith(MINUS)} />
      </span>
      <span className="cmp-val">{compare.you.text}</span>
      <span>{compare.usLabel}</span>
      <span className="bar-track" tabIndex={0} role="img" aria-label={`${compare.usLabel} ${compare.us.text}`} {...hover.target("cmp:us")}>
        <Bar bar={compare.us.bar} kind="us" i={1} neg={compare.us.text.startsWith(MINUS)} />
      </span>
      <span className="cmp-val">{compare.us.text}</span>
    </div>
  );
}

/**
 * The spending mix (spec "Revision 4 layout"): one slice per family with spending, in
 * family order, sized by its share, and a legend ("Home 41%"). Slices open a card on
 * hover or tap; keyboard users reach the same cards through the legend buttons.
 */
function MixBar({ mix, hover, highlight }) {
  return (
    <div className={highlight ? "mix dim" : "mix"}>
      <div className="mix-bar" aria-hidden="true">
        {mix.map((s) => (
          <span
            key={s.id}
            className={highlight === s.id ? "slice hl" : "slice"}
            data-family={s.id}
            style={{ flexGrow: s.fraction }}
            {...hover.target(`fam:${s.id}`, s.id, { focus: false, tap: true })}
          />
        ))}
      </div>
      <div className="mix-legend" role="group" aria-label="Spending by kind">
        {mix.map((s) => (
          <button
            key={s.id}
            type="button"
            className={highlight === s.id ? "lg hl" : "lg"}
            data-family={s.id}
            {...hover.target(`fam:${s.id}`, s.id, { tap: true })}
          >
            <span className="dot" aria-hidden="true" />
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The sticky result strip, the view's one bordered raised surface. At 900px and wider it
 * has two columns: title, answer, rates line, bars and verdict on the left, the spending
 * mix on the right. Narrower, only the title, answer, bars and the Average state's pointer
 * stick; the rates line, verdict and mix go in .strip-more right after it, because a
 * sticky element only sticks inside its parent and these must scroll away.
 */
export default function ResultStrip({ model, mix, personal, wide, hover, highlight, onAnswerQuestions, stripRef }) {
  const rates = model.ratesLine ? <p className="rates">{model.ratesLine}</p> : null;
  const verdict = model.verdict ? <p className="verdict">{model.verdict}</p> : null;
  // Spec revision 5: the Average state says whose number it is and points to the questions.
  const average = !personal && model.total != null;
  const mixBar = mix.length > 0 ? <MixBar mix={mix} hover={hover} highlight={highlight} /> : null;
  return (
    <>
      <section className="strip" ref={stripRef} aria-labelledby="result-title">
        <div className="strip-main">
          <h2 id="result-title">{model.title}</h2>
          <p className="answer" id="answer" tabIndex={-1}>
            {average && <><span className="answer-lead">{model.answerLead}</span>{" "}</>}
            {model.total != null
              ? <CountUp value={model.total} duration={350} format={(v) => answerSentence(roundToStep(v, 50), { lower: !personal })} />
              : model.answer}
          </p>
          {average && (
            <button type="button" className="text-btn pointer" onClick={onAnswerQuestions}>
              That's the average. Answer four questions to see yours.
            </button>
          )}
          {wide && rates}
          {model.compare && <Compare compare={model.compare} hover={hover} />}
          {wide && verdict}
        </div>
        {wide && mixBar && <div className="strip-side">{mixBar}</div>}
      </section>
      {!wide && (rates || verdict || mixBar) && (
        <div className="strip-more">{rates}{verdict}{mixBar}</div>
      )}
    </>
  );
}
