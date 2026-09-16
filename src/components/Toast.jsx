import { useEffect, useRef } from "react";

/**
 * "Answers cleared. [Undo]" for 8 seconds. The timer pauses while the pointer is
 * over the toast or focus is inside it, and resumes with the time that was left.
 */
export default function Toast({ onUndo, onClose, duration = 8000 }) {
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const timer = useRef(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Run the timer only while neither hovered nor focused.
  const sync = () => {
    const shouldRun = !hovered.current && !focused.current;
    if (shouldRun && timer.current == null) {
      startedAt.current = Date.now();
      timer.current = setTimeout(() => closeRef.current(), remaining.current);
    } else if (!shouldRun && timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
      remaining.current -= Date.now() - startedAt.current;
    }
  };
  const set = (flag, value) => () => {
    flag.current = value;
    sync();
  };

  useEffect(() => {
    sync();
    return () => {
      clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);

  return (
    <div
      className="toast"
      role="status"
      onMouseEnter={set(hovered, true)}
      onMouseLeave={set(hovered, false)}
      onFocus={set(focused, true)}
      onBlur={set(focused, false)}
    >
      <span>Answers cleared.</span>
      <button type="button" id="undo-button" className="text-btn" onClick={onUndo}>Undo</button>
    </div>
  );
}
