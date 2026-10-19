import { QUICK_STARTS } from "../calculator/config.js";

/**
 * "Start from a household like yours" and four plain buttons (spec "Quick starts").
 * Shown in every state. Never a selected state: no aria-pressed, no checkmark.
 */
export default function QuickStarts({ onPick }) {
  return (
    <section className="quick" aria-labelledby="quick-title">
      <h2 id="quick-title">Start from a household like yours</h2>
      <div className="quick-row">
        {QUICK_STARTS.map((q) => (
          <button key={q.id} type="button" className="btn" onClick={() => onPick(q)}>{q.label}</button>
        ))}
      </div>
    </section>
  );
}
