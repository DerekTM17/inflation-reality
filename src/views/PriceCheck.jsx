import { useMemo } from "react";
import { avgPriceGroups, movers, fuelRows, priceNotes, moverHover } from "../tabs/prices.js";
import BarList from "../components/BarList.jsx";
import HoverCard from "../components/HoverCard.jsx";
import { useHover } from "../components/useHover.js";
import { useFirstView } from "../components/useMotion.js";

/** The Price check tab (spec "Other tabs", revision 4 "Charts"). Lays out prices.js output; computes nothing. */
export default function PriceCheck({ data }) {
  const groups = useMemo(() => avgPriceGroups(data), [data]);
  const fuel = useMemo(() => fuelRows(data), [data]);
  const moved = useMemo(() => movers(data), [data]);
  const notes = useMemo(() => priceNotes(data), [data]);
  const hover = useHover();
  const play = useFirstView("price-check");
  const month = data.referenceMonthLabel;
  const content = (key) => {
    const row = key ? moved.find((r) => `bar:${r.key}` === key) : null;
    return row ? moverHover(row) : null;
  };

  return (
    <article className={play ? "tab play" : "tab"} aria-labelledby="page-title">
      <header className="tab-intro">
        <h1 id="page-title" tabIndex={-1}>Price check</h1>
        <p className="lede">
          {month ? `Average prices for everyday items in ${month}, next to what they cost a year earlier.` : "Average prices for everyday items, next to what they cost a year earlier."}
          {" "}Government workers collect these prices in stores across the country.
        </p>
      </header>

      <section aria-labelledby="avg-title">
        <h2 id="avg-title">Average prices</h2>
        <table className="data-table">
          <caption className="sr">Average prices now and a year earlier</caption>
          <colgroup>
            <col style={{ width: "40%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="num">Now</th>
              <th scope="col" className="num">A year ago</th>
              <th scope="col" className="num">Change</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.category}>
              <tr><th scope="rowgroup" colSpan={4} className="group">{g.category}</th></tr>
              {g.items.map((i) => (
                <tr key={i.seriesId}>
                  <th scope="row">{i.item}<span className="line-note">{i.unitText}</span></th>
                  <td className="num">{i.nowText}</td>
                  <td className="num">{i.yearAgoText}</td>
                  <td className="num">{i.changeText}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <p className="help">
          Average prices show what things cost. To measure how fast prices rise, the government uses its price index instead. Your costs uses the price index.
        </p>
      </section>

      <section aria-labelledby="fuel-title">
        <h2 id="fuel-title">Gas and diesel this week</h2>
        <p>The Energy Information Administration checks fuel prices every week, so these are newer than the monthly averages above.</p>
        {fuel.map((f) => (
          <div className="fuel" key={f.key}>
            <h3>{f.label}</h3>
            <p className="fuel-price">{f.nowText}</p>
            {f.weekText && <p>{f.weekText}</p>}
            {f.yearAgoText && <p>{f.yearAgoText}</p>}
            {f.monthlyText && <p className="help">{f.monthlyText}</p>}
            <p className="help">{f.blurb}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="movers-title">
        <h2 id="movers-title">Biggest price changes</h2>
        <p>The items above whose prices changed the most over the year, up or down.</p>
        {moved.length > 0
          ? <BarList rows={moved} label="Biggest price changes, largest first" hover={hover} />
          : <p>These figures are not available right now.</p>}
      </section>

      {notes.length > 0 && (
        <div className="fine">
          {notes.map((text) => <p key={text}>{text}</p>)}
        </div>
      )}
      <HoverCard anchor={hover.state?.el ?? null} content={content(hover.state?.key)} />
    </article>
  );
}
