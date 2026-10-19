// Tween math for count-ups (spec "Revision 4: Motion"). Pure. The page is complete at
// rest: a tween always ends exactly on its final value.

/** Ease-out cubic on 0..1 (inputs outside are clamped): fast start, gentle stop. */
export function easeOutCubic(k) {
  const t = Math.min(1, Math.max(0, k));
  return 1 - (1 - t) ** 3;
}

/** The value shown `elapsed` ms into a count from `from` to `to` over `duration` ms. */
export function tweenAt(from, to, elapsed, duration) {
  if (!(duration > 0) || elapsed >= duration) return to;
  return from + (to - from) * easeOutCubic(elapsed / duration);
}
