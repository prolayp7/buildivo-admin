import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CURRENCY } from "@/lib/currency";

export type DailyPoint = { period: string; revenue: number; orderCount: number };

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value);
}

// Catmull-Rom to cubic-Bezier smoothing - no charting library needed for a
// simple sparkline-style area, matching the hand-rolled SVG/div charts
// already used elsewhere on this dashboard and in Reports.
function smoothArea(values: number[], width: number, height: number, padY = 6): { line: string; area: string } {
  if (values.length < 2) return { line: "", area: "" };
  const max = Math.max(...values, 1);
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => ({ x: i * stepX, y: padY + (height - padY * 2) * (1 - v / max) }));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  const area = `${d} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  return { line: d, area };
}

const WIDTH = 600;
const HEIGHT = 110;

export function DailyOrdersHistory({ points, loading }: { points: DailyPoint[]; loading: boolean }) {
  const today = points[points.length - 1]?.revenue ?? 0;
  const yesterday = points[points.length - 2]?.revenue ?? 0;
  const pct = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : today > 0 ? 100 : 0;
  const positive = pct >= 0;
  const { line, area } = smoothArea(points.map((p) => p.orderCount), WIDTH, HEIGHT);

  return (
    <div className="relative overflow-hidden p-5">
      <p className="text-[14.5px] font-semibold text-ink">Daily orders history</p>
      {loading ? (
        <p className="mt-1 text-[13px] text-ink-muted">Loading…</p>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Today&apos;s revenue: <span className="font-semibold text-ink">{money(today)}</span>
          </p>
          <p className={`mt-0.5 flex items-center gap-1 text-[12.5px] font-medium ${positive ? "text-positive-tint-ink" : "text-danger-tint-ink"}`}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(pct)}% {positive ? "more" : "less"} than yesterday
          </p>
        </>
      )}

      <div className="mt-3 h-28 w-full">
        {!loading && line ? (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-full w-full text-accent">
            <path d={area} fill="currentColor" fillOpacity={0.12} stroke="none" />
            <path d={line} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </div>
    </div>
  );
}
