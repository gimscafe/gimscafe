"use client";

import * as React from "react";
import { ChartCard, EmptyNote, RAMP, Tooltip } from "./chart-kit";
import { cn } from "@/lib/utils";

export interface FunnelDatum {
  label: string;
  value: number;
  hint: string;
}

/**
 * Storefront funnel. The stages are ordered — swapping two would change the
 * meaning — so this is an *ordinal* scale: one hue, stepping darker as the
 * funnel narrows, never eight categorical hues.
 */
export function FunnelChart({ steps }: { steps: FunnelDatum[] }) {
  const [active, setActive] = React.useState<number | null>(null);
  const topValue = steps[0]?.value ?? 0;

  /**
   * The last step counts orders while the ones above it count tracked
   * visitors, so it can legitimately come out larger — an order placed by
   * someone whose browser never reported a page view still counts. Say that
   * plainly rather than letting a wider final bar read as a broken funnel.
   */
  const overflows = steps.some(
    (s, i) => i > 0 && s.value > steps[i - 1].value,
  );

  if (topValue === 0) {
    return (
      <ChartCard title="Storefront funnel" subtitle="Unique visitors → orders">
        <EmptyNote>
          No tracked visits in this range yet, so the funnel has no top step.
        </EmptyNote>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Storefront funnel"
      subtitle="Unique visitors → orders"
      table={{
        columns: ["Stage", "People", "% of visitors", "Step conversion"],
        rows: steps.map((s, i) => {
          const prev = i === 0 ? null : steps[i - 1].value;
          return [
            s.label,
            s.value,
            `${((s.value / topValue) * 100).toFixed(1)}%`,
            prev === null ? "—" : prev === 0 ? "—" : `${((s.value / prev) * 100).toFixed(1)}%`,
          ];
        }),
      }}
      footer={
        <p className="text-muted-foreground">
          Steps come from tracked page views; the last is confirmed orders.
          {overflows && (
            <>
              {" "}
              More orders than tracked visits at the step above — some orders came
              from visitors whose browser never reported a page view.
            </>
          )}
        </p>
      }
    >
      <ol className="relative space-y-2">
        {steps.map((s, i) => {
          const pct = (s.value / topValue) * 100;
          const prev = i === 0 ? null : steps[i - 1].value;
          const stepPct =
            prev === null || prev === 0 ? null : (s.value / prev) * 100;

          return (
            <li key={s.label} className="relative">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium">{s.label}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {s.value.toLocaleString("en-LK")}
                  {stepPct !== null && (
                    <span
                      className={cn(
                        "ml-2",
                        stepPct < 50 ? "text-amber-700 dark:text-amber-300" : "",
                      )}
                    >
                      {stepPct.toFixed(0)}% of previous
                    </span>
                  )}
                </span>
              </div>

              <div
                className="bg-muted relative h-6 w-full overflow-visible rounded-[4px]"
                tabIndex={0}
                role="img"
                aria-label={`${s.label}: ${s.value} (${pct.toFixed(1)}% of visitors)`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <div
                  className="h-full rounded-[4px] transition-opacity"
                  style={{
                    width: `${Math.max(pct, s.value > 0 ? 1.5 : 0)}%`,
                    backgroundColor: RAMP[Math.min(i, RAMP.length - 1)],
                    opacity: active === i ? 1 : 0.92,
                  }}
                />
                {active === i && (
                  <Tooltip x={0} y={-6} align="left">
                    <p className="font-medium tabular-nums">
                      {s.value.toLocaleString("en-LK")}
                    </p>
                    <p className="text-muted-foreground">{s.hint}</p>
                    <p className="text-muted-foreground tabular-nums">
                      {pct.toFixed(1)}% of all visitors
                    </p>
                  </Tooltip>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </ChartCard>
  );
}
