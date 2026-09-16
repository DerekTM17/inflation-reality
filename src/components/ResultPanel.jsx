import { forwardRef } from "react";

function Bar({ bar, kind }) {
  return (
    <span className="bar-track" aria-hidden="true">
      <span className={kind ? `bar ${kind}` : "bar"} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
    </span>
  );
}

function LineRow({ row, showBars }) {
  return (
    <li className={row.quiet ? "line quiet" : "line"}>
      <span className="line-name">
        {row.label}
        {row.note && <span className="line-note">{row.note}</span>}
      </span>
      <span className="line-rate">{row.rateText}</span>
      <span className="line-amt">{row.dollarText}</span>
      {showBars && <Bar bar={row.bar} />}
    </li>
  );
}

/**
 * The result panel (spec "Result panel"): title, answer, rates line, bars, verdict,
 * basis, where the extra money goes, renewal prompts, actions, fine print.
 * Lays out panelModel() output; computes nothing.
 */
const ResultPanel = forwardRef(function ResultPanel(
  { model, fine, showAll, onToggleShowAll, onAction, onPrompt }, ref,
) {
  const rows = showAll ? model.main : model.top;
  return (
    <section className="result" ref={ref} aria-labelledby="result-title">
      <h2 id="result-title">{model.title}</h2>
      <p className="answer">{model.answer}</p>
      {model.ratesLine && <p className="rates">{model.ratesLine}</p>}
      {model.compare && (
        <div className="compare">
          <span>Your costs</span>
          <Bar bar={model.compare.you.bar} kind="you" />
          <span className="cmp-val">{model.compare.you.text}</span>
          <span>National</span>
          <Bar bar={model.compare.us.bar} kind="us" />
          <span className="cmp-val">{model.compare.us.text}</span>
        </div>
      )}
      {model.verdict && <p className="verdict">{model.verdict}</p>}
      {model.basis && <p className="basis">{model.basis}</p>}
      {model.main.length > 0 && (
        <>
          <h3 className="lines-title">Where the extra money goes</h3>
          <ul className="lines">
            {rows.map((r) => <LineRow key={r.id} row={r} showBars={model.bars} />)}
            {!showAll && model.smaller && (
              <li className="line">
                <span className="line-name">{model.smaller.text}</span>
                <span className="line-rate" />
                <span className="line-amt">{model.smaller.dollarText}</span>
              </li>
            )}
            {model.rest && <LineRow row={model.rest} showBars={model.bars} />}
          </ul>
        </>
      )}
      {model.prompts.length > 0 && (
        <ul className="prompts">
          {model.prompts.map((p) => (
            <li key={p.id}>
              <button type="button" className="text-btn" onClick={() => onPrompt(p.id)}>{p.text}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button type="button" className="btn" onClick={onAction}>{model.actionLabel}</button>
        {model.smaller && (
          <button type="button" className="text-btn" aria-expanded={showAll ? "true" : "false"} onClick={onToggleShowAll}>
            {showAll ? "Show fewer items" : `Show all ${model.allCount} items`}
          </button>
        )}
      </div>
      <div className="fine">
        {fine.map((text) => <p key={text}>{text}</p>)}
      </div>
    </section>
  );
});

export default ResultPanel;
