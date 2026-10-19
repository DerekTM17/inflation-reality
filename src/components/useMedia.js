import { useEffect, useState } from "react";

const matches = (query) => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);

/** Whether a media query matches, right from the first render, and kept current. */
export function useMediaQuery(query) {
  const [on, setOn] = useState(() => matches(query));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return on;
}

/** prefers-reduced-motion: reduce. JavaScript motion (count-ups, Recharts) checks this; CSS uses the media query. */
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
