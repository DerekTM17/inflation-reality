import { ROUTES, hrefFor, isPlainClick } from "../routes.js";

/** Site header: brand plus the four section links. Links are real hrefs; plain clicks route in-page. */
export default function SectionNav({ route, base, onNavigate }) {
  const go = (id) => (e) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    onNavigate(id);
  };
  return (
    <header className="site">
      <a className="brand" href={base} onClick={go("your-costs")}>Inflation Reality</a>
      <nav aria-label="Sections">
        <ul className="sections">
          {ROUTES.map((r) => (
            <li key={r.id}>
              <a
                className="section-link"
                href={hrefFor(r.id, base)}
                aria-current={route === r.id ? "page" : undefined}
                onClick={go(r.id)}
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
