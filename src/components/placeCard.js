/**
 * Where the hover card goes (spec "Hover detail cards"): centered above its target,
 * below it when there is no room above, and kept `margin` px inside the viewport.
 * rect is the target's getBoundingClientRect(); w and h are the card's size.
 */
export function placeCard(rect, w, h, vw, vh, gap = 8, margin = 16) {
  const x = Math.min(Math.max(margin, rect.left + rect.width / 2 - w / 2), Math.max(margin, vw - w - margin));
  let y = rect.top - h - gap;
  if (y < margin) y = rect.bottom + gap;
  y = Math.min(y, Math.max(margin, vh - h - margin));
  return { x, y };
}
