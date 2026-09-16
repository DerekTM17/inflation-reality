import { QUESTIONS, ALSO, COMMON, EXPLANATIONS } from "../calculator/config.js";
import { effectiveChoices } from "../calculator/model.js";

/**
 * The four questions plus "Also paying for". In Personal, unanswered questions show
 * the common answer as a guess (dashed, "our guess", aria-pressed="false").
 */
export default function Questions({ answers, personal, onAnswer, onAlso }) {
  const choices = effectiveChoices(answers);
  return (
    <div className="questions" id="questions" tabIndex={-1}>
      {QUESTIONS.map((q) => {
        const answered = answers.answered[q.id];
        const explanation = personal ? EXPLANATIONS[q.id]?.[choices[q.id]] : null;
        return (
          <fieldset className="q" key={q.id}>
            <legend>{q.legend}</legend>
            <div className="opts">
              {q.options.map((o) => {
                const guessed = personal && !answered && COMMON[q.id] === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={guessed ? "opt guess" : "opt"}
                    aria-pressed={answered === o.id ? "true" : "false"}
                    onClick={() => onAnswer(q.id, o.id)}
                  >
                    {o.label}
                    {guessed && <span className="guess-tag">our guess</span>}
                  </button>
                );
              })}
            </div>
            {explanation && <p className="help">{explanation}</p>}
          </fieldset>
        );
      })}
      <fieldset className="q">
        <legend>Also paying for</legend>
        <div className="checks">
          {ALSO.map((a) => (
            <label className="check" key={a.id}>
              <input
                type="checkbox"
                checked={answers.also[a.id]}
                onChange={(e) => onAlso(a.id, e.target.checked)}
              />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
