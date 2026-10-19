// What lasts for one visit (one page load) but is never saved (spec "Audit and test
// changes": Folding; "Revision 4 layout": which cards are open "lasts for the visit and
// is not saved"). YourCosts keeps one of these at module level, so it survives tab
// switches (App unmounts the view) and resets on reload.

/** A fresh visit: nothing folded, no card open. */
export function createVisit() {
  return { started: false, folded: false, returning: false, open: [] };
}

/**
 * Whether the questions start folded on this mount. The first mount of the visit folds
 * when saved personal answers loaded (Returning); later mounts keep whatever the visit
 * says (a quick start's fold, or Change answers' unfold).
 */
export function foldOnMount(visit, personalOnLoad) {
  if (!visit.started) {
    visit.started = true;
    visit.folded = personalOnLoad;
    visit.returning = personalOnLoad;
  }
  return visit.folded;
}

/** The open family ids after toggling one. Returns a new list. */
export function toggleOpen(open, id) {
  return open.includes(id) ? open.filter((x) => x !== id) : [...open, id];
}
