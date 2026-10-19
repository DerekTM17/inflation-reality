/** A bar from zero: right for increases, left for decreases (spec "Numbers"). */
function Bar({ bar, kind }) {
  return <span className={`bar ${kind}`} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />;
}

/** Your costs vs. the yardstick. Each bar is a hover target and, for keyboard users, a tab stop. */
function Compare({ compare, hover }) {
  return (
    <div className="compare">
      <span>Your costs</span>
      <span className="bar-track" tabIndex={0} role="img" aria-label={`Your costs ${compare.you.text}`} {...hover.target("cmp:you")}>
        <Bar bar={compare.you.bar} kind="you" />
      </span>
      <span className="cmp-val">{compare.you.text}</span>
      <span>{compare.usLabel}</span>
      <span className="bar-track" tabIndex={0} role="img" aria-label={`${compare.usLabel} ${compare.us.text}`} {...hover.target("cmp:us")}>
        <Bar bar={compare.us.bar} kind="us" />
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
 * mix on the right. Narrower, only the title, answer and bars stick; the rates line,
 * verdict, mix and the Average state's button go in .strip-more right after it, because
 * a sticky element only sticks inside its parent and these must scroll away.
 */
export default function ResultStrip({ model, mix, personal, wide, hover, highlight, onAnswerQuestions, stripRef }) {
  const rates = model.ratesLine ? <p className="rates">{model.ratesLine}</p> : null;
  const verdict = model.verdict ? <p className="verdict">{model.verdict}</p> : null;
  const action = personal ? null : (
    <button type="button" className="btn" onClick={onAnswerQuestions}>Answer the questions</button>
  );
  const mixBar = mix.length > 0 ? <MixBar mix={mix} hover={hover} highlight={highlight} /> : null;
  return (
    <>
      <section className="strip" ref={stripRef} aria-labelledby="result-title">
        <div className="strip-main">
          <h2 id="result-title">{model.title}</h2>
          <p className="answer" id="answer" tabIndex={-1}>{model.answer}</p>
          {wide && rates}
          {model.compare && <Compare compare={model.compare} hover={hover} />}
          {wide && verdict}
          {wide && action}
        </div>
        {wide && mixBar && <div className="strip-side">{mixBar}</div>}
      </section>
      {!wide && (rates || verdict || mixBar || action) && (
        <div className="strip-more">{rates}{verdict}{mixBar}{action}</div>
      )}
    </>
  );
}
