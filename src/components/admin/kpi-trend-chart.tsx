"use client";

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface TrendPoint {
  period: string;
  label: string;
  revenueCents: number;
  orders: number;
}

/** Round a maximum up to a clean axis top (1 / 2 / 5 × 10^n). */
function axisTop(maxCents: number): number {
  if (maxCents <= 0) return 100_000; // Rs 1,000 — a sane empty axis
  const magnitude = 10 ** Math.floor(Math.log10(maxCents));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= maxCents) return candidate;
  }
  return 10 * magnitude;
}

/**
 * Monthly confirmed revenue — one series, so the heading names it and no
 * legend box is needed. Only the best month is direct-labelled; the axis and
 * the hover tooltip carry the rest.
 */
export function KpiTrendChart({ data }: { data: TrendPoint[] }) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  const top = axisTop(Math.max(...data.map((d) => d.revenueCents), 0));
  const peak = data.reduce(
    (best, d, i) => (d.revenueCents > (data[best]?.revenueCents ?? -1) ? i : best),
    0,
  );
  const hasData = data.some((d) => d.revenueCents > 0);
  const ticks = [top, top / 2, 0];

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Confirmed revenue by month</h2>
        <span className="text-muted-foreground text-xs">
          Last {data.length} months · excludes unpaid and cancelled orders
        </span>
      </figcaption>

      <div className="bg-card rounded-xl border p-4">
        <div className="flex gap-3">
          {/* y axis */}
          <div
            className="text-muted-foreground relative w-14 shrink-0 text-right text-[10px] tabular-nums"
            style={{ height: 180 }}
            aria-hidden
          >
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-0 translate-y-1/2 leading-none"
                style={{ bottom: `${(t / top) * 100}%` }}
              >
                {formatMoney(t, { withSymbol: false })}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: 180 }}>
              {/* recessive hairline gridlines */}
              {ticks.map((t) => (
                <div
                  key={t}
                  className="bg-border absolute inset-x-0 h-px"
                  style={{ bottom: `${(t / top) * 100}%` }}
                  aria-hidden
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-[2px]">
                {data.map((d, i) => {
                  const pct = top === 0 ? 0 : (d.revenueCents / top) * 100;
                  const active = hovered === i;
                  return (
                    <div
                      key={d.period}
                      className="relative flex h-full flex-1 items-end justify-center"
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(i)}
                      onBlur={() => setHovered(null)}
                      tabIndex={0}
                      role="img"
                      aria-label={`${d.label}: ${formatMoney(d.revenueCents)} from ${d.orders} orders`}
                    >
                      <div
                        className={cn(
                          "w-full max-w-[24px] rounded-t-[4px] transition-opacity",
                          active ? "opacity-100" : "opacity-90",
                        )}
                        style={{
                          height: `${Math.max(pct, d.revenueCents > 0 ? 1.5 : 0)}%`,
                          backgroundColor: "var(--chart-1)",
                        }}
                      />

                      {/* the extreme is the only direct label */}
                      {hasData && i === peak && hovered === null && (
                        <span
                          className="text-muted-foreground pointer-events-none absolute mb-0.5 text-[10px] font-medium tabular-nums"
                          style={{ bottom: `${Math.min(pct, 92)}%` }}
                        >
                          {formatMoney(d.revenueCents)}
                        </span>
                      )}

                      {active && (
                        <div className="bg-card pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max -translate-x-1/2 rounded-lg border px-2.5 py-1.5 text-xs shadow-md">
                          <p className="font-medium">{d.label}</p>
                          <p className="text-muted-foreground tabular-nums">
                            {formatMoney(d.revenueCents)}
                          </p>
                          <p className="text-muted-foreground tabular-nums">
                            {d.orders} order{d.orders === 1 ? "" : "s"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* x axis */}
            <div className="mt-1.5 flex gap-[2px]">
              {data.map((d, i) => (
                <span
                  key={d.period}
                  className={cn(
                    "text-muted-foreground min-w-0 flex-1 truncate text-center text-[10px]",
                    // every other label on narrow screens, all of them on wide
                    i % 2 === 1 && "hidden sm:block",
                  )}
                >
                  {d.label.slice(0, 3)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {!hasData && (
          <p className="text-muted-foreground mt-3 text-center text-xs">
            No confirmed revenue in this window yet.
          </p>
        )}

        {/* identity is never colour-alone: the same numbers as a table */}
        <details className="mt-3 border-t pt-3">
          <summary className="text-muted-foreground cursor-pointer text-xs">
            View as table
          </summary>
          <table className="mt-2 w-full text-xs">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-1 font-medium">Month</th>
                <th className="py-1 text-right font-medium">Revenue</th>
                <th className="py-1 text-right font-medium">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((d) => (
                <tr key={d.period}>
                  <td className="py-1">{d.label}</td>
                  <td className="py-1 text-right tabular-nums">
                    {formatMoney(d.revenueCents)}
                  </td>
                  <td className="py-1 text-right tabular-nums">{d.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </figure>
  );
}
