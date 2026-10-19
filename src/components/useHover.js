import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./useMedia.js";

export const CARD_ID = "hover-card";

/** Mouse and pen hover opens cards; touch never does (a finger on a row is moving its slider). */
export const isMouse = (e) => e.pointerType === "mouse" || e.pointerType === "pen";

/**
 * Shared hover-card state for one view (spec "Hover detail cards"). The state holds a
 * key ("row:gasoline", "fam:home", …), the element pointed at, whether a tap pinned it,
 * and the family to highlight. It never holds content: the view renders the content
 * from the key on every render, so an open card follows its slider live.
 *
 * Opens on mouse or pen hover; on keyboard focus only at 600px and wider (on phones a
 * fixed card would cover the on-screen keyboard); on tap only for targets that ask for
 * it (`tap`), which pins the card. Closes on pointer leave, focus leaving, Escape, a tap
 * elsewhere, or scrolling (except a pinned card, or one whose target holds focus: a
 * deliberate deviation from the spec, since focusing an off-screen row scrolls the page).
 * A tap that focuses a control on a touch tablet never opens a card: the last pointer is
 * recorded, and focus within 600ms of a touch is ignored (:focus-visible can't tell,
 * because text inputs always match it).
 */
export function useHover() {
  const [state, setState] = useState(null);
  const ref = useRef(null);
  ref.current = state;
  const wide = useMediaQuery("(min-width: 600px)");
  const lastPointer = useRef({ type: "", at: -Infinity });

  useEffect(() => {
    const record = (e) => { lastPointer.current = { type: e.pointerType, at: performance.now() }; };
    document.addEventListener("pointerdown", record, true);
    return () => document.removeEventListener("pointerdown", record, true);
  }, []);
  const touchedJustNow = () => lastPointer.current.type === "touch" && performance.now() - lastPointer.current.at < 600;

  const show = useCallback((key, el, { family = null, pinned = false } = {}) => {
    setState({ key, el, family, pinned });
  }, []);
  const hide = useCallback(() => setState(null), []);

  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setState(null); };
    const onScroll = () => {
      const s = ref.current;
      if (s && !s.pinned && !s.el.contains(document.activeElement)) setState(null);
    };
    const onDown = (e) => {
      const s = ref.current;
      if (s?.pinned && !s.el.contains(e.target)) setState(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [state]);

  /** Props for a hover target. A moved mouse brings back a card that scrolling closed. */
  const target = (key, family = null, { focus = true, tap = false, describe = true } = {}) => ({
    ...(describe ? { "aria-describedby": state?.key === key ? CARD_ID : undefined } : {}),
    onPointerEnter: (e) => { if (isMouse(e)) show(key, e.currentTarget, { family }); },
    onPointerMove: (e) => { if (isMouse(e) && ref.current?.key !== key) show(key, e.currentTarget, { family }); },
    onPointerLeave: (e) => {
      if (isMouse(e) && !ref.current?.pinned && !e.currentTarget.contains(document.activeElement)) hide();
    },
    ...(focus ? {
      onFocus: (e) => { if (wide && !touchedJustNow()) show(key, e.currentTarget, { family }); },
      onBlur: (e) => { if (!e.currentTarget.contains(e.relatedTarget) && ref.current?.key === key) hide(); },
    } : {}),
    ...(tap ? { onClick: (e) => show(key, e.currentTarget, { family, pinned: true }) } : {}),
  });

  return { state, show, hide, target, wide };
}
