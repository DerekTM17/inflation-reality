import YourCostsIntro from "./YourCostsIntro.jsx";

/** The Your costs tab. Task 8 of the Phase 2a plan replaces this with the calculator. */
export default function YourCosts({ data, base, onNavigate }) {
  return (
    <section className="calc" aria-label="Your costs">
      <YourCostsIntro data={data} base={base} onNavigate={onNavigate} returning={false} />
    </section>
  );
}
