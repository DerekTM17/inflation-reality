import { LINES } from "../calculator/config.js";
import { formatDollars, parseAmountInput, parseRenewalInput, clampAmount } from "../calculator/format.js";
import NumberField from "./NumberField.jsx";
import { isMouse, CARD_ID } from "./useHover.js";

/** The fold chevron: an SVG icon, never a text glyph (the banned-string scan reads text). */
function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One editable amount on one tight row: label and rate, what it adds this year (its
 * allocated dollars), the dollar box (renewal lines add their percent box beside it),
 * and a slider in the family color under it. The slider updates live on input; the box
 * keeps its commit-per-keystroke behavior and clamps at 100,000.
 */
function AmountRow({ row, hover, onAmount, onRenewal }) {
  const hint = Object.hasOwn(LINES, row.id) ? LINES[row.id].hint : null;
  const hintId = hint ? `hint-${row.id}` : undefined;
  // Focus lands on the box or the slider, so they (not the row) point at the open card.
  const cardOpen = hover.state?.key === `row:${row.id}`;
  const boxDescribedBy = [hintId, cardOpen ? CARD_ID : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="amt" data-family={row.family} {...hover.target(`row:${row.id}`, row.family, { describe: false })}>
      <label className="amt-label" htmlFor={`amount-${row.id}`}>
        {row.label}
        {row.rateText && <span className="amt-rate">{row.rateText}</span>}
        {row.note && <span className="amt-note">{row.note}</span>}
        {hint && <span className="amt-note" id={hintId}>{hint}</span>}
      </label>
      <span className={row.renewalMissing ? "amt-adds prompt" : "amt-adds"}>{row.addsYearText}</span>
      <span className="amt-boxes">
        <span className="money">
          $
          <NumberField
            id={`amount-${row.id}`}
            value={row.monthly}
            parse={parseAmountInput}
            onCommit={(v) => onAmount(row.id, v)}
            inputMode="numeric"
            describedBy={boxDescribedBy}
          />
        </span>
        {row.renewal && (
          <span className="money">
            <label className="sr" htmlFor={`renewal-${row.id}`}>Increase on your renewal notice</label>
            <NumberField
              id={`renewal-${row.id}`}
              className="pct"
              value={row.rate}
              parse={parseRenewalInput}
              onCommit={(v) => onRenewal(row.id, v)}
              inputMode="decimal"
            />
            %
          </span>
        )}
      </span>
      <input
        type="range"
        id={`slider-${row.id}`}
        className="slider"
        min="0"
        max={row.max}
        step="10"
        value={row.sliderValue}
        aria-label={`${row.label}, dollars a month`}
        aria-valuetext={`${formatDollars(row.monthly)} a month`}
        aria-describedby={cardOpen ? CARD_ID : undefined}
        style={{ "--p": `${(row.sliderValue / row.max) * 100}%` }}
        onChange={(e) => onAmount(row.id, clampAmount(Number(e.target.value)))}
      />
    </div>
  );
}

/** The average household's row: label, rate, what it adds and the monthly amount, as text. */
function AverageRow({ row, hover, wide }) {
  return (
    <div className="amt avg" data-family={row.family} tabIndex={wide ? 0 : undefined} {...hover.target(`row:${row.id}`, row.family)}>
      <span className="amt-label">
        {row.label}
        {row.rateText && <span className="amt-rate">{row.rateText}</span>}
        {row.note && <span className="amt-note">{row.note}</span>}
      </span>
      <span className="amt-adds">{row.addsYearText}</span>
      <span className="amt-value">{formatDollars(row.monthly)} a month</span>
    </div>
  );
}

/**
 * One family card, tinted 6% in its color and borderless (not a raised surface).
 * Under 600px the heading is a fold button (cards start folded; which are open lasts
 * for the visit). At 600px and wider it is a focusable label that opens the family's
 * hover card. Folding only happens through this card's own button, so a focused input
 * inside a card always keeps it open. Pointing at the card highlights its slice and
 * legend item.
 */
function FamilyCard({ card, personal, narrow, open, onToggle, highlighted, onHighlight, hover, onAmount, onRenewal }) {
  const bodyId = `fam-${card.id}`;
  const headId = `${bodyId}-head`;
  const folded = narrow && !open;
  const head = (
    <>
      <span className="dot" aria-hidden="true" />
      <span className="fam-name">{card.label}</span>
      <span className="fam-total">{card.dollarText}</span>
      {narrow && <Chevron />}
      {folded && card.renewalMissing && <span className="fam-prompt">Add your renewal increase</span>}
    </>
  );
  return (
    <section
      className={highlighted ? "fam hl" : "fam"}
      data-family={card.id}
      aria-labelledby={headId}
      onPointerEnter={(e) => { if (isMouse(e)) onHighlight(card.id); }}
      onPointerLeave={(e) => { if (isMouse(e)) onHighlight(null); }}
    >
      <h3 className="fam-h">
        {narrow ? (
          <button
            type="button"
            id={headId}
            className="fam-head"
            aria-expanded={open ? "true" : "false"}
            aria-controls={bodyId}
            onClick={() => onToggle(card.id)}
            {...hover.target(`fam:${card.id}`, card.id, { focus: false })}
          >
            {head}
          </button>
        ) : (
          <span id={headId} className="fam-head" tabIndex={0} {...hover.target(`fam:${card.id}`, card.id)}>{head}</span>
        )}
      </h3>
      <div id={bodyId} className="fam-body" hidden={folded}>
        {card.rows.map((r) => (personal
          ? <AmountRow key={r.id} row={r} hover={hover} onAmount={onAmount} onRenewal={onRenewal} />
          : <AverageRow key={r.id} row={r} hover={hover} wide={!narrow} />))}
      </div>
    </section>
  );
}

/**
 * "Your monthly amounts" (spec "Revision 4 layout"): one card per family in FAMILIES
 * order, two CSS columns on wide screens. Average shows the basket rows as text and
 * points to the questions and quick starts; editing starts in Personal.
 */
export default function FamilyCards({ cards, personal, narrow, open, onToggle, highlight, onHighlight, hover, onAmount, onRenewal }) {
  return (
    <section className="amounts" aria-labelledby="amounts-title">
      <h2 id="amounts-title">Your monthly amounts</h2>
      {cards.length === 0 ? (
        <p>Average household figures are not available right now.</p>
      ) : (
        <div className="fam-cols">
          {cards.map((c) => (
            <FamilyCard
              key={c.id}
              card={c}
              personal={personal}
              narrow={narrow}
              open={open.includes(c.id)}
              onToggle={onToggle}
              highlighted={highlight === c.id}
              onHighlight={onHighlight}
              hover={hover}
              onAmount={onAmount}
              onRenewal={onRenewal}
            />
          ))}
        </div>
      )}
      {!personal && cards.length > 0 && (
        <p className="amounts-note">Answer the questions or pick a household to change these.</p>
      )}
    </section>
  );
}
