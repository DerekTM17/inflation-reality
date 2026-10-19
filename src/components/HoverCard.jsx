import { useLayoutEffect, useRef } from "react";
import { CARD_ID } from "./useHover.js";
import { placeCard } from "./placeCard.js";

/**
 * Hover-card text: a heading with the family (or publisher) dot, label and value rows,
 * full-width lines, and one plain note. Shared by the fixed HoverCard and the trend
 * chart's tooltip. content: { title, family?, publisher?, items: [dt, dd][], lines: string[], note }.
 * Divs, not paragraphs, so the tabs' paragraph margins never reach inside the card.
 */
export function HoverCardBody({ content }) {
  const mark = content.family || content.publisher;
  return (
    <>
      <div className="hc-title">
        {mark && (
          <span className="dot" data-family={content.family || undefined} data-publisher={content.publisher || undefined} aria-hidden="true" />
        )}
        {content.title}
      </div>
      {content.items.length > 0 && (
        <dl>
          {content.items.map(([dt, dd]) => (
            <div className="hc-item" key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>
          ))}
        </dl>
      )}
      {(content.lines ?? []).map((line) => <div className="hc-line" key={line}>{line}</div>)}
      {content.note && <div className="hc-note">{content.note}</div>}
    </>
  );
}

/**
 * The one hover card per view: fixed, above its target (below when there is no room),
 * kept 16px inside the viewport, role="tooltip". With the toast, the only element with a
 * shadow. The view passes the anchor and fresh content on every render; placement runs
 * before paint, and again on scroll (a pinned card) and resize.
 */
export default function HoverCard({ anchor, content }) {
  const ref = useRef(null);
  const open = Boolean(anchor && anchor.isConnected && content);
  useLayoutEffect(() => {
    const card = ref.current;
    if (!open || !card) return undefined;
    const place = () => {
      const { x, y } = placeCard(anchor.getBoundingClientRect(), card.offsetWidth, card.offsetHeight, window.innerWidth, window.innerHeight);
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
    };
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  });
  if (!open) return null;
  return (
    <div ref={ref} id={CARD_ID} className="hover-card" role="tooltip">
      <HoverCardBody content={content} />
    </div>
  );
}
