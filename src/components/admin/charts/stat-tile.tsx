"use client";

import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { ACCENT, useWidth } from "./chart-kit";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: string;
  /** percentage change vs the previous window of the same length */
  change: number | null;
  previous: string;
  higherIsBetter?: boolean;
  /** one number per day, oldest first */
  spark: number[];
}

/**
 * A single headline number with its trend. This is deliberately a stat tile
 * and not a one-bar chart — the number *is* the chart, and the sparkline is
 * context, so it carries no axis, no labels and no tooltip.
 */
export function StatTile({
  label,
  value,
  change,
  previous,
  higherIsBetter = true,
  spark,
}: StatTileProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const H = 32;

  const path = React.useMemo(() => {
    if (!width || spark.length < 2) return "";
    const max = Math.max(...spark, 1);
    return spark
      .map((v, i) => {
        const x = (i / (spark.length - 1)) * width;
        const y = H - (v / max) * (H - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join("");
  }, [spark, width]);

  const good = change !== null && change > 0 === higherIsBetter;
  const Icon = change !== null && change > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-sm">{label}</p>
        {change !== null && Math.abs(change) >= 0.05 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
              good
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
            )}
            title={`Previous period: ${previous}`}
          >
            <Icon className="size-3" aria-hidden />
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
      </div>

      <p className="font-display mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
        {previous} previously
      </p>

      <div ref={ref} className="mt-2" style={{ height: H }} aria-hidden>
        {width > 0 && path && (
          <svg width={width} height={H} className="overflow-visible">
            <path
              d={path}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.9}
            />
          </svg>
        )}
      </div>
    </div>
  );
}
