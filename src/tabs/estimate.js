// The estimate the Your costs panel shows, built in one place so the Your costs view
// and the Sources download write the same lines and cannot drift (spec "Front-end
// architecture"). Pure apart from reading the storage object it is given.

import { BASKET } from "../data/catalog.js";
import { emptyAnswers, isPersonal, personalRows, averageRows } from "../calculator/model.js";
import { panelModel } from "../calculator/panel.js";
import { loadAnswers } from "../calculator/storage.js";

/** Same inputs and outputs as the panel on Your costs: { mode, rows, model }. */
export function estimateFor(answers, data) {
  const personal = isPersonal(answers);
  const mode = personal ? "personal" : "average";
  const rows = personal ? personalRows(answers, data) : averageRows(data, BASKET.ceMonthlyMean);
  const model = panelModel({
    mode,
    rows,
    headlinePct: data.headline.yoy,
    exShelterPct: data.lines.exShelter?.yoy ?? null,
    referenceMonth: data.referenceMonth,
    answers,
  });
  return { mode, rows, model };
}

/**
 * The saved answers' estimate, or the average household when nothing usable is
 * saved (no storage, blocked storage, unparseable or old data). Never throws.
 */
export function savedEstimate(data, storage) {
  return estimateFor(loadAnswers(storage) ?? emptyAnswers(), data);
}
