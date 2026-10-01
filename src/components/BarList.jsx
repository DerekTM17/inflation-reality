/**
 * Rows of name, value and a bar from zero (one neutral hue, direct value labels;
 * spec "Chart rules"). Rows come from measureRows() or movers():
 * { key, name, note, valueText, bar: { left, width } }.
 */
export default function BarList({ rows, label }) {
  return (
    <ul className="bar-list" aria-label={label}>
      {rows.map((r) => (
        <li className="bar-row" key={r.key}>
          <span className="bar-name">
            {r.name}
            {r.note && <span className="line-note">{r.note}</span>}
          </span>
          <span className="bar-val">{r.valueText}</span>
          <span className="bar-track" aria-hidden="true">
            <span className="bar" style={{ left: `${r.bar.left}%`, width: `${r.bar.width}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
