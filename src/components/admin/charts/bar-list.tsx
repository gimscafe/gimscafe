"use client";

import * as React from "react";
import { ACCENT, ChartCard, EmptyNote, Tooltip, type TableSpec } from "./chart-kit";

export interface BarDatum {
  label: string;
  value: number;
  /** rendered at the bar tip and in the tooltip */
  display: string;
  /** extra context for the tooltip only */
  detail?: string;
}

/**
 * Horizontal bars for nominal categories — products, cities, referrers, pages.
 *
 * Every bar takes the same hue: the categories have no natural order, and
 * colouring them darker-where-bigger would spend the identity channel
 * re-encoding what bar length already shows.
 */
export function BarList({
  title,
  subtitle,
  data,
  empty,
  table,
  footer,
}: {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  empty: string;
  table?: TableSpec;
  footer?: React.ReactNode;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);

  return (
    <ChartCard title={title} subtitle={subtitle} table={table} footer={footer}>
      {data.length === 0 || max === 0 ? (
        <EmptyNote>{empty}</EmptyNote>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d, i) => (
            <li key={d.label} className="relative">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-xs" title={d.label}>
                  {d.label}
                </span>
                {/* the value rides the row, so no number sits on every bar tip */}
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {d.display}
                </span>
              </div>
              <div
                className="bg-muted/60 relative h-2.5 w-full rounded-[4px]"
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${d.display}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <div
                  className="h-full rounded-[4px] transition-opacity"
                  style={{
                    width: `${Math.max((d.value / max) * 100, 1.5)}%`,
                    backgroundColor: ACCENT,
                    opacity: active === i ? 1 : 0.9,
                  }}
                />
                {active === i && (
                  <Tooltip x={0} y={-4} align="left">
                    <p className="font-medium tabular-nums">{d.display}</p>
                    <p className="text-muted-foreground break-words">{d.label}</p>
                    {d.detail && (
                      <p className="text-muted-foreground tabular-nums">{d.detail}</p>
                    )}
                  </Tooltip>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
