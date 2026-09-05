"use client";

import * as React from "react";
import { ACCENT, ChartCard, EmptyNote, Tooltip, axisTopInt } from "./chart-kit";
import { formatMoney } from "@/lib/money";

export interface ScheduleDatum {
  day: string;
  label: string;
  orders: number;
  revenueCents: number;
}

const H = 150;

/**
 * The kitchen's next fortnight: how many orders are due each day. Operational
 * rather than analytical, so it looks forward from today and counts every
 * order that has not been cancelled, paid or not.
 */
export function ScheduleColumns({ data }: { data: ScheduleDatum[] }) {
  const [active, setActive] = React.useState<number | null>(null);

  const top = axisTopInt(Math.max(...data.map((d) => d.orders), 0), 4);
  const total = data.reduce((s, d) => s + d.orders, 0);
  const busiest = data.reduce(
    (best, d, i) => (d.orders > (data[best]?.orders ?? -1) ? i : best),
    0,
  );

  return (
    <ChartCard
      title="Coming up in the kitchen"
      subtitle="Orders due over the next 14 days"
      table={{
        columns: ["Day", "Orders", "Value"],
        rows: data.map((d) => [d.label, d.orders, formatMoney(d.revenueCents)]),
      }}
      footer={
        total > 0 ? (
          <p className="text-muted-foreground">
            {total} order{total === 1 ? "" : "s"} due · busiest day{" "}
            <span className="text-foreground font-medium">{data[busiest].label}</span>
          </p>
        ) : undefined
      }
    >
      {total === 0 ? (
        <EmptyNote>Nothing is due in the next fortnight.</EmptyNote>
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

              <div className="absolute inset-0 flex items-end gap-[2px]">
                {data.map((d, i) => (
                  <div
                    key={d.day}
                    className="relative flex h-full flex-1 items-end justify-center"
                    tabIndex={0}
                    role="img"
                    aria-label={`${d.label}: ${d.orders} order${d.orders === 1 ? "" : "s"} worth ${formatMoney(d.revenueCents)}`}
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  >
                    <div
                      className="w-full max-w-[24px] rounded-t-[4px]"
                      style={{
                        height: `${Math.max((d.orders / top) * 100, d.orders > 0 ? 2 : 0)}%`,
                        backgroundColor: ACCENT,
                        opacity: active === i ? 1 : 0.9,
                      }}
                    />
                    {active === i && (
                      <Tooltip x={0} y={-6} align="center">
                        <p className="font-medium tabular-nums">
                          {d.orders} order{d.orders === 1 ? "" : "s"}
                        </p>
                        <p className="text-muted-foreground">{d.label}</p>
                        <p className="text-muted-foreground tabular-nums">
                          {formatMoney(d.revenueCents)}
                        </p>
                      </Tooltip>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1.5 flex gap-[2px]">
              {data.map((d, i) => (
                <span
                  key={d.day}
                  className="text-muted-foreground min-w-0 flex-1 truncate text-center text-[9px]"
                >
                  {i % 2 === 0 ? d.label.split(" ")[0] : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
