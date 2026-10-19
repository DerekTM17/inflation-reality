import { useEffect, useRef, useState } from "react";
import { tweenAt } from "../calculator/motion.js";
import { useReducedMotion } from "./useMedia.js";

/**
 * Shows format(value). When value changes it counts there from what is on screen over
 * `duration` ms; with `from`, the first render counts up from it too (a tab's first
 * view). Under reduced motion the final value shows at once. The last frame is always
 * format(value), so the page is complete at rest.
 */
export default function CountUp({ value, format, duration, from = null }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(() => (reduced || from == null ? value : from));
  const shownRef = useRef(shown);
  useEffect(() => {
    const start = shownRef.current;
    const set = (v) => {
      shownRef.current = v;
      setShown(v);
    };
    if (reduced || start === value) {
      set(value);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t) => {
      const v = tweenAt(start, value, t - t0, duration);
      set(v);
      if (v !== value) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, duration]);
  return <>{format(shown)}</>;
}
