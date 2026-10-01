import { useMemo } from "react";
import { nationalModel } from "../tabs/national.js";
import TrendChart from "../components/TrendChart.jsx";
import BarList from "../components/BarList.jsx";

function Stat({ card }) {
  return (
    <div className="stat">
      <h2>{card.title}</h2>
      <p className="stat-value">{card.yearText}</p>
      <p>{card.yearSentence}</p>
      {card.monthSentence && <p className="stat-sub">{card.monthSentence}</p>}
      <p className="help">{card.help}</p>
    </div>
  );
}

/** The National numbers tab (spec "Other tabs"). Lays out nationalModel(); computes nothing. */
export default function NationalNumbers({ data }) {
  const m = useMemo(() => nationalModel(data), [data]);
  return (
    <article className="tab" aria-labelledby="page-title">
      <header className="tab-intro">
        <h1 id="page-title" tabIndex={-1}>National numbers</h1>
        <p className="lede">{m.lede}</p>
      </header>

      <section className="stats" aria-label="The latest rates">
        <Stat card={m.headline} />
        <Stat card={m.core} />
      </section>

      <section aria-labelledby="trend-title">
        <h2 id="trend-title">The last 12 months</h2>
        <p>The change in prices overall over 12 months, as of each month.</p>
        {m.trend.length > 0
          ? <TrendChart points={m.trend} />
          : <p>These figures are not available right now.</p>}
        {m.trendNote && <p className="help">{m.trendNote}</p>}
      </section>

      <section aria-labelledby="measures-title">
        <h2 id="measures-title">Other official measures</h2>
        <p>Government agencies and the Federal Reserve measure inflation in several ways. Each number is the change over 12 months.</p>
        {m.measures.length > 0
          ? <BarList rows={m.measures} label="Official measures, highest first" />
          : <p>These figures are not available right now.</p>}
      </section>

      {/* Reserved: the comparison with other countries (a separate spec) goes here. */}

      {m.notes.length > 0 && (
        <div className="fine">
          {m.notes.map((text) => <p key={text}>{text}</p>)}
        </div>
      )}
    </article>
  );
}
