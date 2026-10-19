import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useMedia.js";

// Tabs already shown this visit. Module state: survives tab switches, resets on reload.
const seen = new Set();

/**
 * True on a tab's first view this visit, so its bars grow and numbers count up once
 * (spec: "Motion only plays on first view of a tab and in response to the person's
 * actions"). The tab is marked seen after the first commit, so StrictMode's double
 * render still sees a first view.
 */
export function useFirstView(tab) {
  const [first] = useState(() => !seen.has(tab));
  useEffect(() => { seen.add(tab); }, [tab]);
  return first;
}

/**
 * A counter that goes up each time `value` changes after mount (never on mount) unless
 * motion is reduced. Use it as a React key so the flash animation replays.
 */
export function useFlashKey(value) {
  const reduced = useReducedMotion();
  const prev = useRef(value);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    if (!reduced) setKey((k) => k + 1);
  }, [value, reduced]);
  return key;
}
