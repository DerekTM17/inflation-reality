import { useId } from "react";

/**
 * Rows of name, value and a bar from a zero line, with direct value labels. Rows come
 * from movers(): { key, name, note, value, valueText, bar: { left, width }, family? }.
 * With a family, the row's dot and bar take its color (spec "Charts and the other
 * tabs"); with `hover`, each row is a tab stop and a hover target. Falls extend left of
 * the zero line and grow from it.
 */
export default function BarList({ rows, label, hover = null }) {
  const uid = useId();
  const first = rows[0];
  const zero = first ? (first.value < 0 ? first.bar.left + first.bar.width : first.bar.left) : 0;
  return (
    <ul className="bar-list" aria-label={label}>
      {rows.map((r, i) => (
        <li
          className="bar-row"
          key={r.key}
          data-family={r.family}
          tabIndex={hover ? 0 : undefined}
          aria-labelledby={hover ? `${uid}${r.key}-name ${uid}${r.key}-val` : undefined}
          {...(hover ? hover.target(`bar:${r.key}`, r.family ?? null) : {})}
        >
          <span className="bar-name" id={`${uid}${r.key}-name`}>
            {r.family && <span className="dot" aria-hidden="true" />}
            {r.name}
            {r.note && <span className="line-note">{r.note}</span>}
          </span>
          <span className="bar-val" id={`${uid}${r.key}-val`}>{r.valueText}</span>
          <span className="bar-track" aria-hidden="true">
            <span className="zero-line" style={{ left: `${zero}%` }} />
            <span
              className={r.value < 0 ? "bar grow neg" : "bar grow"}
              style={{ left: `${r.bar.left}%`, width: `${r.bar.width}%`, "--i": i }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
