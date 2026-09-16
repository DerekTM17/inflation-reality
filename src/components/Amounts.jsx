import { LINES } from "../calculator/config.js";
import { formatDollars, parseAmountInput, parseRenewalInput } from "../calculator/format.js";
import NumberField from "./NumberField.jsx";

/**
 * "Adjust monthly amounts" (Personal, editable) or "See the monthly amounts"
 * (Average, read-only), collapsed by default. Renewal lines also take the
 * increase from the person's renewal notice.
 */
export default function Amounts({ rows, personal, monthlyMean, open, onToggle, onAmount, onRenewal }) {
  return (
    <section className="amounts" aria-label="Monthly amounts">
      <button
        type="button"
        className="disclosure"
        aria-expanded={open ? "true" : "false"}
        aria-controls="amounts-body"
        onClick={onToggle}
      >
        {personal ? "Adjust monthly amounts" : "See the monthly amounts"}
      </button>
      <div className="amounts-body" id="amounts-body" hidden={!open}>
        {rows == null ? (
          <p>Average household figures are not available right now.</p>
        ) : (
          <>
            <p>
              {personal
                ? "These are starting estimates. Change any amount to match what you pay."
                : `The average U.S. household spends about ${formatDollars(monthlyMean)} a month. Answer the questions to enter your own amounts.`}
            </p>
            <div className="amt-list">
              {rows.map((r) => {
                const line = Object.hasOwn(LINES, r.id) ? LINES[r.id] : null;
                const hintId = line?.hint ? `hint-${r.id}` : undefined;
                return (
                  <div className="amt-row" key={r.id}>
                    {personal ? (
                      <label className="amt-label" htmlFor={`amount-${r.id}`}>
                        {r.label}
                        {line?.hint && <span className="amt-hint" id={hintId}>{line.hint}</span>}
                      </label>
                    ) : (
                      <span className="amt-label">{r.label}</span>
                    )}
                    {personal ? (
                      <span className="money">
                        $
                        <NumberField
                          id={`amount-${r.id}`}
                          value={r.monthly}
                          parse={parseAmountInput}
                          onCommit={(v) => onAmount(r.id, v)}
                          inputMode="numeric"
                          describedBy={hintId}
                        />
                        <span className="per">a month</span>
                      </span>
                    ) : (
                      <span className="amt-value">
                        {formatDollars(r.monthly)} <span className="per">a month</span>
                      </span>
                    )}
                    {personal && line?.renewal && (
                      <div className="amt-sub">
                        <label htmlFor={`renewal-${r.id}`}>Increase on your renewal notice</label>
                        <span className="money">
                          <NumberField
                            id={`renewal-${r.id}`}
                            className="pct"
                            value={r.rate}
                            parse={parseRenewalInput}
                            onCommit={(v) => onRenewal(r.id, v)}
                            inputMode="decimal"
                          />
                          %
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
