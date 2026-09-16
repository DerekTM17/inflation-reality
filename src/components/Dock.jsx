/** Phone dock: shows the answer while the result panel is off screen (hidden by CSS at ≥ 900px). */
export default function Dock({ label, answer, away, onSeeDetails }) {
  return (
    <div className={away ? "dock away" : "dock"} aria-hidden={away ? "true" : undefined}>
      <div className="dock-text">
        <span className="dock-label">{label}</span>
        <span className="dock-amt">{answer}</span>
      </div>
      <button type="button" className="dock-btn" tabIndex={away ? -1 : undefined} onClick={onSeeDetails}>
        See details
      </button>
    </div>
  );
}
