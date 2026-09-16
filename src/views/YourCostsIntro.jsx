import { ledeText } from "../calculator/panel.js";
import { hrefFor, isPlainClick } from "../routes.js";

/** Headline, lede and the skip link to National numbers. */
export default function YourCostsIntro({ data, base, onNavigate, returning }) {
  return (
    <div className="intro">
      <h1>How much more are you paying than a year ago?</h1>
      <p className="lede">
        {ledeText({ headlinePct: data.headline.yoy, referenceMonth: data.referenceMonth, returning })}
      </p>
      <a
        className="text-link"
        href={hrefFor("national-numbers", base)}
        onClick={(e) => {
          if (!isPlainClick(e)) return;
          e.preventDefault();
          onNavigate("national-numbers");
        }}
      >
        Just want the national numbers?
      </a>
    </div>
  );
}
