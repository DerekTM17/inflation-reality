import { useState } from "react";

/**
 * Other official measures (spec "Charts and the other tabs"): rows tinted in their
 * publisher's color with 12px bars from zero, a dashed line at prices overall, and
 * publisher chips that toggle (aria-pressed) a highlight on one publisher's rows,
 * fading the others to 35%. Each row is a hover target. At 600px and wider the blurb
 * lives in its card plus visually hidden text; narrower, no card opens on these rows,
 * so the blurb shows as help text under the row (spec note, 2026-10-17).
 */
export default function MeasureList({ rows, publishers, refLine, hover }) {
  const [pub, setPub] = useState(null);
  return (
    <>
      <div className="chips" role="group" aria-label="Highlight one publisher's measures">
        {publishers.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            data-publisher={p.id}
            aria-pressed={pub === p.id ? "true" : "false"}
            onClick={() => setPub(pub === p.id ? null : p.id)}
          >
            <span className="dot" aria-hidden="true" />
            {p.label}
          </button>
        ))}
      </div>
      {refLine && (
        <p className="ref-key"><span className="ref-swatch" aria-hidden="true" />{refLine.text}</p>
      )}
      <ul className={pub ? "measures focusing" : "measures"} aria-label="Official measures, highest first">
        {rows.map((r, i) => (
          <li
            key={r.key}
            className={pub === r.publisher ? "mrow on" : "mrow"}
            data-publisher={r.publisher}
            tabIndex={0}
            {...hover.target(`m:${r.key}`)}
          >
            <span className="bar-name">
              <span className="dot" aria-hidden="true" />
              {r.name}
              <span className="sr">{hover.wide ? `, ${r.publisherLabel}. ${r.note}` : `, ${r.publisherLabel}.`}</span>
            </span>
            <span className="bar-val">{r.valueText}</span>
            <span className="bar-track" aria-hidden="true">
              <span
                className={r.value < 0 ? "bar grow neg" : "bar grow"}
                style={{ left: `${r.bar.left}%`, width: `${r.bar.width}%`, "--i": i }}
              />
              {refLine && <span className="ref-line" style={{ left: `${refLine.left}%` }} />}
            </span>
            {!hover.wide && <span className="help mrow-blurb">{r.note}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}
