import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatRate } from "../calculator/format.js";

const TICK = { fill: "var(--ink-2)", fontSize: 13 };

/**
 * The 12-month change in prices overall, month by month: one series in --accent,
 * gridlines in --rule, text in --ink-2 (spec "Chart rules"). Gap months are null,
 * so the line breaks there instead of guessing. The same numbers are in a
 * visually hidden table for screen readers.
 * points: [{ short, long, value, valueText }] from nationalModel().trend.
 */
export default function TrendChart({ points }) {
  return (
    <>
      <div className="trend-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="short" tick={TICK} tickLine={false} axisLine={{ stroke: "var(--rule)" }}
              interval="preserveStartEnd" minTickGap={24}
              padding={{ left: 8, right: 32 }} tickMargin={8}
            />
            <YAxis
              width={44} tick={TICK} tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v}%`} tickMargin={8}
              domain={[(min) => Math.min(0, Math.floor(min)), (max) => Math.max(0, Math.ceil(max))]}
            />
            <ReferenceLine y={0} stroke="var(--control-edge)" />
            <Tooltip
              formatter={(v) => [formatRate(v), "Prices overall"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.long ?? ""}
              separator=": "
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 6, color: "var(--ink)" }}
              labelStyle={{ color: "var(--ink)", fontWeight: 700 }}
              itemStyle={{ color: "var(--ink)" }}
              cursor={{ stroke: "var(--rule)" }}
            />
            <Line
              type="linear" dataKey="value" stroke="var(--accent)" strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--accent)", stroke: "var(--accent)" }}
              connectNulls={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr">
        <caption>Change over 12 months in prices overall, by month</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Change</th></tr></thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.long}><th scope="row">{p.long}</th><td>{p.valueText}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
