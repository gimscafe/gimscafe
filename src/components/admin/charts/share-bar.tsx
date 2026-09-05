"use client";

import * as React from "react";
import {
  ChartCard,
  EmptyNote,
  Legend,
  SERIES,
  Tooltip,
  type TableSpec,
} from "./chart-kit";

export interface ShareDatum {
  label: string;
  value: number;
  display: string;
}

/**
 * Part-to-whole as a single stacked bar — readable at a glance where a pie of
 * close values is not. Segments are separated by a 2px gap in the surface
 * colour, never by a stroke, and identity comes from the legend as well as
 * the hue.
 */
export function ShareBar({
  title,
  subtitle,
  data,
  empty,
  table,
}: {
  title: string;
  subtitle?: string;
  data: ShareDatum[];
  empty: string;
  table?: TableSpec;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  // Colour follows the entity's position in the fixed slot order, assigned
  // once — a filter that drops a segment never repaints the survivors.
  const colored = data.map((d, i) => ({
    ...d,
    color: SERIES[Math.min(i, SERIES.length - 1)],
  }));

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      legend={
        total > 0 ? (
          <Legend items={colored.map((d) => ({ label: d.label, color: d.color }))} />
        ) : undefined
      }
      table={table}
    >
      {total === 0 ? (
        <EmptyNote>{empty}</EmptyNote>
      ) : (
        <>
          <div className="relative flex h-7 w-full gap-[2px]">
            {colored.map((d, i) => (
              <div
                key={d.label}
                className="relative h-full first:rounded-l-[4px] last:rounded-r-[4px]"
                style={{
                  width: `${(d.value / total) * 100}%`,
                  backgroundColor: d.color,
                  opacity: active === i ? 1 : 0.92,
                }}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${d.display}, ${((d.value / total) * 100).toFixed(1)}%`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                {active === i && (
                  <Tooltip x={0} y={-4} align="left">
                    <p className="font-medium tabular-nums">{d.display}</p>
                    <p className="text-muted-foreground">{d.label}</p>
                    <p className="text-muted-foreground tabular-nums">
                      {((d.value / total) * 100).toFixed(1)}% of total
                    </p>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>

          {/* the largest slice is direct-labelled; the rest sit in the legend */}
          <p className="text-muted-foreground mt-2 text-xs">
            {colored[0].label} leads with{" "}
            <span className="text-foreground font-medium tabular-nums">
              {((colored[0].value / total) * 100).toFixed(0)}%
            </span>{" "}
            ({colored[0].display})
          </p>
        </>
      )}
    </ChartCard>
  );
}
