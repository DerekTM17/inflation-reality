import { useMemo } from "react";
import { nationalModel, statHover, measureHover, sparkPaths } from "../tabs/national.js";
import { formatRate } from "../calculator/format.js";
import TrendChart from "../components/TrendChart.jsx";
import MeasureList from "../components/MeasureList.jsx";
import CountUp from "../components/CountUp.jsx";
import HoverCard from "../components/HoverCard.jsx";
import { useHover } from "../components/useHover.js";
import { useFirstView } from "../components/useMotion.js";

/** A filled 12-month sparkline in the card's color (decorative: the chart below has the numbers). */
function Spark({ values }) {
  const p = sparkPaths(values, 300, 44);
  if (!p) return null;
  return (
    <svg className="spark" viewBox="0 0 300 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className="spark-area" d={p.area} />
      <path className="spark-line" d={p.line} />
    </svg>
  );
}

/** The past year next to this month's pace; the pace bar is a dashed outline. */
function Pace({ pace }) {
  return (
    <div className="pace">
      {[pace.year, pace.month].map((b, i) => (
        <div className="pace-row" key={b.label}>
          <span>{b.label}</span>
          <span className="bar-track pace-track" aria-hidden="true">
            <span
              className={`pace-bar grow${i === 1 ? " ghost" : ""}${b.neg ? " neg" : ""}`}
              style={{ left: `${b.bar.left}%`, width: `${b.bar.width}%`, "--i": i }}
            />
          </span>
          <span className="pace-val">{b.text}</span>
        </div>
      ))}
    </div>
  );
}

/** A big number on a 6% tinted card; it counts up over 900ms on the tab's first view. */
function Stat({ card, kind, hover, play }) {
  return (
    <div className={`stat ${kind}`} tabIndex={0} {...hover.target(`stat:${kind}`)}>
      <h2>{card.title}</h2>
      <p className="stat-value">
        {card.value == null
          ? card.yearText
          : <CountUp value={card.value} from={play ? 0 : null} duration={900} format={formatRate} />}
      </p>
      <p>{card.yearSentence}</p>
      {card.spark && <Spark values={card.spark} />}
      {card.pace && <Pace pace={card.pace} />}
      {card.monthSentence && <p className="stat-sub">{card.monthSentence}</p>}
      <p className="help">{card.help}</p>
    </div>
  );
}

/** The National numbers tab (spec "Other tabs", revision 4 "Charts"). Lays out nationalModel(); computes nothing. */
export default function NationalNumbers({ data }) {
  const m = useMemo(() => nationalModel(data), [data]);
  const hover = useHover();
  const play = useFirstView("national-numbers");
  const content = (key) => {
    if (!key) return null;
    const [kind, id] = key.split(":");
    if (kind === "stat") return statHover(id === "core" ? m.core : m.headline);
    if (kind === "m") {
      const row = m.measures.find((r) => r.key === id);
      return row ? measureHover(row) : null;
    }
    return null;
  };
  return (
    <article className={play ? "tab play" : "tab"} aria-labelledby="page-title">
      <header className="tab-intro">
        <h1 id="page-title" tabIndex={-1}>National numbers</h1>
        <p className="lede">{m.lede}</p>
      </header>

      <section className="stats" aria-label="The latest rates">
        <Stat card={m.headline} kind="overall" hover={hover} play={play} />
        <Stat card={m.core} kind="core" hover={hover} play={play} />
      </section>

      <section aria-labelledby="trend-title">
        <h2 id="trend-title">The last 12 months</h2>
        <p>The change in prices overall over 12 months, as of each month.</p>
        {m.trend.length > 0
          ? <TrendChart points={m.trend} ticks={m.trendTicks} animate={play} />
          : <p>These figures are not available right now.</p>}
        {m.trendNote && <p className="help">{m.trendNote}</p>}
      </section>

      <section aria-labelledby="measures-title">
        <h2 id="measures-title">Other official measures</h2>
        <p>Government agencies and the Federal Reserve measure inflation in several ways. Each number is the change over 12 months.</p>
        {m.measures.length > 0
          ? <MeasureList rows={m.measures} publishers={m.publishers} refLine={m.measureRef} hover={hover} />
          : <p>These figures are not available right now.</p>}
      </section>

      {/* Reserved: the comparison with other countries (a separate spec) goes here. */}

      {m.notes.length > 0 && (
        <div className="fine">
          {m.notes.map((text) => <p key={text}>{text}</p>)}
        </div>
      )}
      <HoverCard anchor={hover.state?.el ?? null} content={content(hover.state?.key)} />
    </article>
  );
}
