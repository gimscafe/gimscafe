"use client";

import * as React from "react";
import { ChartCard, EmptyNote, RAMP, Tooltip } from "./chart-kit";

export interface HeatCellDatum {
  dow: number; // 0 = Monday
  hour: number;
  orders: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Three-hour blocks keep the grid readable on a phone. */
const BLOCKS = [
  { start: 0, label: "12–3a" },
  { start: 3, label: "3–6a" },
  { start: 6, label: "6–9a" },
  { start: 9, label: "9–12p" },
  { start: 12, label: "12–3p" },
  { start: 15, label: "3–6p" },
  { start: 18, label: "6–9p" },
  { start: 21, label: "9–12a" },
];

/**
 * When orders arrive, day of week × time of day. Magnitude, so it takes the
 * one-hue rose ramp light→dark with a scale legend — never a rainbow, and
 * never more colour classes than a reader can hold apart.
 */
export function OrderHeatmap({ cells }: { cells: HeatCellDatum[] }) {
  const [active, setActive] = React.useState<{ d: number; b: number } | null>(null);

  const grid = React.useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: BLOCKS.length }, () => 0),
    );
    for (const c of cells) {
      if (c.dow < 0 || c.dow > 6) continue;
      g[c.dow][Math.min(Math.floor(c.hour / 3), BLOCKS.length - 1)] += c.orders;
    }
    return g;
  }, [cells]);

  const max = Math.max(...grid.flat(), 0);
  const total = grid.flat().reduce((a, b) => a + b, 0);

  /** Bucket a count onto the five validated ramp steps. */
  function stepFor(v: number): number {
    if (v === 0) return -1;
    return Math.min(RAMP.length - 1, Math.floor(((v - 1) / max) * RAMP.length));
  }

  const busiest = React.useMemo(() => {
    let best = { d: 0, b: 0, v: 0 };
    grid.forEach((row, d) =>
      row.forEach((v, b) => {
        if (v > best.v) best = { d, b, v };
      }),
    );
    return best;
  }, [grid]);

  return (
    <ChartCard
      title="When orders come in"
      subtitle="Day × time of day"
      table={{
        columns: ["Day", ...BLOCKS.map((b) => b.label)],
        rows: grid.map((row, d) => [DAYS[d], ...row]),
      }}
      footer={
        total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground">
              Busiest:{" "}
              <span className="text-foreground font-medium">
                {DAYS[busiest.d]} {BLOCKS[busiest.b].label}
              </span>{" "}
              ({busiest.v} order{busiest.v === 1 ? "" : "s"})
            </p>
            {/* scale legend — required for a sequential ramp */}
            <div className="text-muted-foreground flex items-center gap-1.5">
              <span>0</span>
              <div className="flex gap-[2px]">
                <span
                  className="border-border size-3 rounded-[2px] border"
                  aria-hidden
                />
                {RAMP.map((c) => (
                  <span
                    key={c}
                    className="size-3 rounded-[2px]"
                    style={{ backgroundColor: c }}
                    aria-hidden
                  />
                ))}
              </div>
              <span>{max}</span>
            </div>
          </div>
        ) : undefined
      }
    >
      {total === 0 ? (
        <EmptyNote>No confirmed orders in this range yet.</EmptyNote>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            <div className="mb-1 flex gap-[2px] pl-9">
              {BLOCKS.map((b) => (
                <span
                  key={b.start}
                  className="text-muted-foreground min-w-0 flex-1 text-center text-[9px]"
                >
                  {b.label}
                </span>
              ))}
            </div>

            {grid.map((row, d) => (
              <div key={DAYS[d]} className="mb-[2px] flex items-center gap-[2px]">
                <span className="text-muted-foreground w-9 shrink-0 text-[10px]">
                  {DAYS[d]}
                </span>
                {row.map((v, b) => {
                  const step = stepFor(v);
                  const on = active?.d === d && active?.b === b;
                  return (
                    <div
                      key={b}
                      className="relative min-w-0 flex-1"
                      onPointerEnter={() => setActive({ d, b })}
                      onPointerLeave={() => setActive(null)}
                      onFocus={() => setActive({ d, b })}
                      onBlur={() => setActive(null)}
                      tabIndex={0}
                      role="img"
                      aria-label={`${DAYS[d]} ${BLOCKS[b].label}: ${v} order${v === 1 ? "" : "s"}`}
                    >
                      <div
                        className="h-6 rounded-[3px]"
                        style={{
                          backgroundColor: step < 0 ? "var(--muted)" : RAMP[step],
                          outline: on ? "2px solid var(--foreground)" : undefined,
                          outlineOffset: -1,
                        }}
                      />
                      {on && (
                        <Tooltip x={0} y={-4} align="left">
                          <p className="font-medium tabular-nums">
                            {v} order{v === 1 ? "" : "s"}
                          </p>
                          <p className="text-muted-foreground">
                            {DAYS[d]}, {BLOCKS[b].label}
                          </p>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
