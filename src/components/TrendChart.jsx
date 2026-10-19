import { useRef } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList,
} from "recharts";
import { HoverCardBody } from "./HoverCard.jsx";
import { trendHover } from "../tabs/national.js";
import { useReducedMotion } from "./useMedia.js";

const TICK = { fill: "var(--ink-2)", fontSize: 13 };
const MINUS = "−";

/** The crosshair's card: the shared hover-card body inside Recharts' tooltip. */
function TrendTip({ active, payload }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="hover-card chart-card"><HoverCardBody content={trendHover(point)} /></div>;
}

/** A label on the latest point only. */
function EndLabel({ x, y, index, value, last }) {
  if (index !== last || value == null || value === "Not published") return null;
  return <text x={x + 8} y={y} dy={4} fill="var(--ink)" fontSize={13} fontWeight={700}>{value}</text>;
}

/**
 * The 12-month change in prices overall (spec "Charts and the other tabs"): a line in
 * --accent with a 12% shaded area under it, evenly spaced ticks, an end label, and a
 * crosshair with a dot. The chart is one tab stop (Recharts' accessibilityLayer):
 * focus shows the latest month and ArrowLeft / ArrowRight step month by month. Gap
 * months are null, so the line breaks there. The line draws in over 900ms on a first
 * view, never under reduced motion (Recharts ignores the media query). The visually
 * hidden table carries the same numbers as text.
 * points: nationalModel().trend; ticks: nationalModel().trendTicks; animate: first view.
 */
export default function TrendChart({ points, ticks, animate }) {
  const chart = useRef(null);
  const reduced = useReducedMotion();
  const last = points.length - 1;
  const drawIn = animate && !reduced;
  // Recharts starts its keyboard index at the oldest point. Its onFocus moves the
  // crosshair to accessibilityManager's index, so set that to the latest month first
  // (capture runs before Recharts' own handler). Recharts 2.15 instance API.
  const toLatest = () => chart.current?.accessibilityManager?.setIndex(last);
  return (
    <>
      <div className="trend-chart" onFocusCapture={toLatest}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            ref={chart}
            data={points}
            accessibilityLayer
            title="Change over 12 months in prices overall, by month"
            margin={{ top: 8, right: 48, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="short" tick={TICK} tickLine={false} axisLine={{ stroke: "var(--rule)" }}
              interval="preserveStartEnd" minTickGap={24}
              padding={{ left: 8, right: 16 }} tickMargin={8}
            />
            <YAxis
              width={44} tick={TICK} tickLine={false} axisLine={false} tickMargin={8}
              domain={ticks.domain} ticks={ticks.ticks} interval={0}
              tickFormatter={(v) => (v < 0 ? `${MINUS}${Math.abs(v)}%` : `${v}%`)}
            />
            <ReferenceLine y={0} stroke="var(--control-edge)" />
            <Tooltip
              content={<TrendTip />}
              filterNull={false}
              cursor={{ stroke: "var(--ink-2)", strokeWidth: 1 }}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", zIndex: 5 }}
            />
            <Area
              type="linear" dataKey="value" stroke="none" fill="var(--accent)" fillOpacity={0.12}
              connectNulls={false} activeDot={false}
              isAnimationActive={drawIn} animationDuration={900}
            />
            <Line
              type="linear" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={false}
              activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls={false} isAnimationActive={drawIn} animationDuration={900}
            >
              <LabelList dataKey="valueText" content={<EndLabel last={last} />} />
            </Line>
          </ComposedChart>
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
