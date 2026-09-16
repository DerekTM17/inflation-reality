/** Returning visitor's folded answers. Deliberately unboxed (not a raised surface). */
export default function Summary({ text, canSave, onChangeAnswers, onStartOver }) {
  return (
    <section className="summary" aria-labelledby="summary-title">
      <h2 id="summary-title">Your answers</h2>
      <p>{text}</p>
      {canSave && <p className="saved">Saved in this browser only.</p>}
      <div className="row">
        <button type="button" className="btn" onClick={onChangeAnswers}>Change answers</button>
        <button type="button" className="text-btn" onClick={onStartOver}>Start over</button>
      </div>
    </section>
  );
}
