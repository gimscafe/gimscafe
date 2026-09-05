"use client";

import * as React from "react";
import {
  ChartCard,
  EmptyNote,
  Legend,
  SERIES,
  Tooltip,
  TooltipKey,
  axisTopInt,
} from "./chart-kit";

export interface CohortDatum {
  period: string;
  label: string;
  newOrders: number;
  returningOrders: number;
}

const H = 170;

/**
 * Orders per month split into first-time and repeat purchases. Two series, so
 * a legend is always present; the stack segments are separated by a 2px
 * surface gap and the tooltip lists both series at once, so the pointer never
 * has to land on a specific segment to read a value.
 */
export function StackedColumns({ data }: { data: CohortDatum[] }) {
  const [active, setActive] = React.useState<number | null>(null);

  const totals = data.map((d) => d.newOrders + d.returningOrders);
  const top = axisTopInt(Math.max(...totals, 0), 4);
  const hasData = totals.some((t) => t > 0);

  const series = [
    { key: "newOrders" as const, label: "First-time", color: SERIES[0] },
    { key: "returningOrders" as const, label: "Returning", color: SERIES[1] },
  ];

  return (
    <ChartCard
      title="New vs returning orders"
      subtitle="By month"
      legend={<Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />}
      table={{
        columns: ["Month", "First-time", "Returning", "Total"],
        rows: data.map((d) => [
          d.label,
          d.newOrders,
          d.returningOrders,
          d.newOrders + d.returningOrders,
        ]),
      }}
    >
      {!hasData ? (
        <EmptyNote>No confirmed orders in the last few months.</EmptyNote>
      ) : (
        <div className="flex gap-3">
          <div
            className="text-muted-foreground relative w-6 shrink-0 text-right text-[10px] tabular-nums"
            style={{ height: H }}
            aria-hidden
          >
            {[top, top / 2, 0].map((t) => (
              <span
                key={t}
                className="absolute right-0 translate-y-1/2 leading-none"
                style={{ bottom: `${(t / top) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: H }}>
              {[top, top / 2, 0].map((t) => (
                <div
                  key={t}
                  className="bg-border absolute inset-x-0 h-px"
                  style={{ bottom: `${(t / top) * 100}%` }}
                  aria-hidden
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-2">
                {data.map((d, i) => {
                  const total = d.newOrders + d.returningOrders;
                  return (
                    <div
                      key={d.period}
                      className="relative flex h-full flex-1 items-end justify-center"
                      tabIndex={0}
                      role="img"
                      aria-label={`${d.label}: ${d.newOrders} first-time, ${d.returningOrders} returning`}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                    >
                      <div
                        className="flex w-full max-w-[24px] flex-col justify-end gap-[2px]"
                        style={{ height: `${(total / top) * 100}%` }}
                      >
                        {/* returning sits on top of first-time */}
                        {d.returningOrders > 0 && (
                          <div
                            className="w-full rounded-t-[4px]"
                            style={{
                              height: `${(d.returningOrders / Math.max(total, 1)) * 100}%`,
                              backgroundColor: SERIES[1],
                              opacity: active === i ? 1 : 0.92,
                            }}
                          />
                        )}
                        {d.newOrders > 0 && (
                          <div
                            className="w-full"
                            style={{
                              height: `${(d.newOrders / Math.max(total, 1)) * 100}%`,
                              backgroundColor: SERIES[0],
                              opacity: active === i ? 1 : 0.92,
                              borderTopLeftRadius: d.returningOrders === 0 ? 4 : 0,
                              borderTopRightRadius: d.returningOrders === 0 ? 4 : 0,
                            }}
                          />
                        )}
                      </div>

                      {active === i && (
                        <Tooltip x={0} y={-6} align="center">
                          <p className="font-medium">{d.label}</p>
                          {series.map((s) => (
                            <p
                              key={s.key}
                              className="text-muted-foreground flex items-center gap-1.5 tabular-nums"
                            >
                              <TooltipKey color={s.color} />
                              <span className="text-foreground font-medium">
                                {d[s.key]}
                              </span>
                              {s.label}
                            </p>
                          ))}
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-1.5 flex gap-2">
              {data.map((d) => (
                <span
                  key={d.period}
                  className="text-muted-foreground min-w-0 flex-1 truncate text-center text-[10px]"
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
