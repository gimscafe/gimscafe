"use client";

import * as React from "react";
import {
  ACCENT,
  ChartCard,
  Tooltip,
  TooltipKey,
  axisTop,
  useWidth,
} from "./chart-kit";
import { formatMoney } from "@/lib/money";

export interface TrendDatum {
  day: string;
  label: string;
  revenueCents: number;
  orders: number;
  visitors: number;
}

const H = 200;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

/**
 * Daily revenue. One series, so the caption names it and no legend box is
 * needed; a crosshair snaps to the nearest day and the readout carries orders
 * and visitors too — the values the chart deliberately does not plot, because
 * a second y-scale on one plot invents correlations that are not in the data.
 */
export function TrendAreaChart({ data }: { data: TrendDatum[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);

  const top = axisTop(Math.max(...data.map((d) => d.revenueCents), 0), 100_000);
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const xAt = React.useCallback(
    (i: number) =>
      data.length <= 1 ? width / 2 : (i / (data.length - 1)) * width,
    [data.length, width],
  );
  const yAt = React.useCallback(
    (v: number) => PAD_TOP + plotH - (v / top) * plotH,
    [plotH, top],
  );

  const { line, area } = React.useMemo(() => {
    if (!width || data.length === 0) return { line: "", area: "" };
    const pts = data.map((d, i) => `${xAt(i)},${yAt(d.revenueCents)}`);
    const line = `M${pts.join("L")}`;
    const area = `${line}L${xAt(data.length - 1)},${PAD_TOP + plotH}L${xAt(0)},${
      PAD_TOP + plotH
    }Z`;
    return { line, area };
  }, [data, width, xAt, yAt, plotH]);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!width || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    // The reader aims at a date, not at a 2px line — snap to the nearest.
    setActive(
      Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))),
    );
  }

  const hasData = data.some((d) => d.revenueCents > 0);
  const d = active === null ? null : data[active];
  const ticks = [top, top / 2, 0];

  // Label roughly six dates, whatever the range length.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <ChartCard
      title="Revenue per day"
      subtitle="Confirmed orders only"
      table={{
        columns: ["Day", "Revenue", "Orders", "Visitors"],
        rows: data.map((p) => [
          p.label,
          formatMoney(p.revenueCents),
          p.orders,
          p.visitors,
        ]),
      }}
    >
      <div className="flex gap-3">
        <div
          className="text-muted-foreground relative w-14 shrink-0 text-right text-[10px] tabular-nums"
          style={{ height: H }}
          aria-hidden
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 translate-y-1/2 leading-none"
              style={{ bottom: PAD_BOTTOM + (t / top) * plotH }}
            >
              {formatMoney(t, { withSymbol: false })}
            </span>
          ))}
        </div>

        <div
          ref={ref}
          className="relative min-w-0 flex-1 touch-none"
          style={{ height: H }}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <div
              key={t}
              className="bg-border absolute inset-x-0 h-px"
              style={{ bottom: PAD_BOTTOM + (t / top) * plotH }}
              aria-hidden
            />
          ))}

          {width > 0 && (
            <svg
              width={width}
              height={H}
              className="absolute inset-0 overflow-visible"
              role="img"
              aria-label={`Daily revenue from ${data[0]?.label} to ${
                data[data.length - 1]?.label
              }`}
            >
              {/* a wash, never a saturated block */}
              <path d={area} fill={ACCENT} opacity={0.1} />
              <path
                d={line}
                fill="none"
                stroke={ACCENT}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {active !== null && (
                <>
                  <line
                    x1={xAt(active)}
                    x2={xAt(active)}
                    y1={PAD_TOP}
                    y2={PAD_TOP + plotH}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  {/* 2px surface ring keeps the marker legible over the line */}
                  <circle
                    cx={xAt(active)}
                    cy={yAt(data[active].revenueCents)}
                    r={5}
                    fill={ACCENT}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                </>
              )}
            </svg>
          )}

          {d && active !== null && (
            <Tooltip
              x={Math.min(Math.max(xAt(active), 70), Math.max(width - 70, 70))}
              y={Math.max(yAt(d.revenueCents) - 10, 8)}
            >
              <p className="font-medium tabular-nums">
                {formatMoney(d.revenueCents)}
              </p>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <TooltipKey color={ACCENT} />
                {d.label}
              </p>
              <p className="text-muted-foreground mt-0.5 tabular-nums">
                {d.orders} order{d.orders === 1 ? "" : "s"} · {d.visitors} visitor
                {d.visitors === 1 ? "" : "s"}
              </p>
            </Tooltip>
          )}

          <div
            className="text-muted-foreground absolute inset-x-0 bottom-0 flex justify-between text-[10px]"
            aria-hidden
          >
            {data.map((p, i) =>
              i % labelEvery === 0 || i === data.length - 1 ? (
                <span
                  key={p.day}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{
                    left: Math.min(Math.max(xAt(i), 16), Math.max(width - 16, 16)),
                  }}
                >
                  {p.label}
                </span>
              ) : null,
            )}
          </div>

          {!hasData && (
            <p className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs">
              No confirmed revenue in this range yet.
            </p>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
