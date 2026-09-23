"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { CURRENCY } from "@/lib/currency";

export type SalesPoint = { period: string; revenue: number; orderCount: number };
export const CHART_RANGES = ["7 d", "30 d", "90 d", "12 mo"] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value);
}
function periodLabel(period: string, range: ChartRange) {
  const date = new Date(period);
  if (range === "12 mo") return date.toLocaleDateString("en-GB", { month: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function OrdersChart({ range, onRangeChange, points, loading }: { range: ChartRange; onRangeChange: (range: ChartRange) => void; points: SalesPoint[]; loading: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.revenue));

  return (
    <div>
      <div className="mb-5 flex items-center gap-1 rounded-lg bg-canvas p-1">
        {CHART_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange(r)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors sm:flex-none",
              range === r ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-[13px] text-ink-muted">Loading…</div>
      ) : points.length ? (
        <>
          <div className="flex h-48 items-end gap-1">
            {points.map((point, index) => (
              <div
                key={point.period}
                className="group relative flex flex-1 flex-col items-center justify-end"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover((current) => (current === index ? null : current))}
              >
                {hover === index ? (
                  <div className="absolute -top-11 z-10 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10.5px] font-semibold text-white shadow-panel">
                    {periodLabel(point.period, range)}: {money(point.revenue)} · {point.orderCount} orders
                  </div>
                ) : null}
                <div
                  className="w-full rounded-t bg-ink transition-colors group-hover:bg-accent-strong"
                  style={{ height: `${Math.max(2, (point.revenue / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
            <span>{periodLabel(points[0].period, range)}</span>
            <span>{periodLabel(points[points.length - 1].period, range)}</span>
          </div>
        </>
      ) : (
        <div className="flex h-48 items-center justify-center text-[13px] text-ink-muted">No paid orders in this range.</div>
      )}
    </div>
  );
}
