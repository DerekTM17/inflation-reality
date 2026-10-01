import { useMemo, useState } from "react";
import * as catalog from "../data/catalog.js";
import { METHOD, CAVEATS, NO_SERIES_LINES, SOURCE_LINKS, seriesGroups } from "../tabs/sources.js";
import { savedEstimate } from "../tabs/estimate.js";
import { downloadWorkbook } from "../tabs/download.js";
import { getStorage } from "../calculator/storage.js";

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" };

/** The Sources tab (spec "Other tabs"): method, every series with a link, caveats, the download. */
export default function Sources({ data }) {
  const groups = useMemo(() => seriesGroups(catalog, data), [data]);
  const [status, setStatus] = useState("");

  // Read the saved answers at click time, so the file matches what Your costs shows now.
  const download = async () => {
    setStatus("Preparing the spreadsheet.");
    try {
      await downloadWorkbook({ catalog, data, estimate: savedEstimate(data, getStorage()) });
      setStatus("Spreadsheet downloaded.");
    } catch (err) {
      console.warn("Spreadsheet download failed:", err);
      setStatus("The download did not work. Please try again.");
    }
  };

  return (
    <article className="tab" aria-labelledby="page-title">
      <header className="tab-intro">
        <h1 id="page-title" tabIndex={-1}>Sources</h1>
        <p className="lede">
          Every number on this site comes from public government data. This page shows how the estimate is worked out and where each number comes from.
        </p>
      </header>

      <section aria-labelledby="method-title">
        <h2 id="method-title">How your estimate is worked out</h2>
        {METHOD.map((s) => (
          <div key={s.heading}>
            <h3>{s.heading}</h3>
            {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
          </div>
        ))}
      </section>

      <section aria-labelledby="series-title">
        <h2 id="series-title">Where each number comes from</h2>
        <p>Each series links to its page at FRED or the Bureau of Labor Statistics (BLS), where you can download the same numbers.</p>
        {groups.map((g) => (
          <div key={g.id}>
            <h3 id={`series-${g.id}`}>{g.title}</h3>
            <table className="data-table series-table" aria-labelledby={`series-${g.id}`}>
              <colgroup><col style={{ width: "46%" }} /><col style={{ width: "36%" }} /><col style={{ width: "18%" }} /></colgroup>
              <thead>
                <tr><th scope="col">Name</th><th scope="col">Series</th><th scope="col">From</th></tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={`${g.id}-${r.seriesId}-${r.name}`}>
                    <th scope="row">{r.name}</th>
                    <td><a href={r.url} {...EXTERNAL}>{r.seriesId}</a></td>
                    <td>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <h3 id="series-no-series">Lines without their own series</h3>
        <table className="data-table" aria-labelledby="series-no-series">
          <colgroup><col style={{ width: "40%" }} /><col style={{ width: "60%" }} /></colgroup>
          <thead><tr><th scope="col">Line</th><th scope="col">How its rate is set</th></tr></thead>
          <tbody>
            {NO_SERIES_LINES.map((l) => (
              <tr key={l.name}><th scope="row">{l.name}</th><td>{l.how}</td></tr>
            ))}
          </tbody>
        </table>
        <h3>Background</h3>
        <ul className="link-list">
          {SOURCE_LINKS.map((l) => (
            <li key={l.url}><a href={l.url} {...EXTERNAL}>{l.text}</a></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="caveats-title">
        <h2 id="caveats-title">Things to keep in mind</h2>
        <ul className="plain-list">
          {CAVEATS.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </section>

      <section aria-labelledby="download-title">
        <h2 id="download-title">Download the data</h2>
        <p>
          Get every number on this site in a spreadsheet, with a link to check each one. It includes your estimate as Your costs shows it. Your answers stay in this browser.
        </p>
        <button type="button" className="btn" onClick={download}>Download the spreadsheet (.xlsx)</button>
        <p className="status" role="status">{status}</p>
      </section>
    </article>
  );
}
