"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared furniture for the analytics charts.
 *
 * Two rules are enforced here rather than repeated in every chart:
 * every chart ships a table view (which is also what lets the lighter
 * categorical slots clear the contrast relief), and every chart names itself
 * in a caption so a single-series plot needs no legend box.
 */

/** Measures a container so charts can compute real pixel geometry. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

export interface TableSpec {
  columns: string[];
  rows: (string | number)[][];
}

export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  footer,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
  table?: TableSpec;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={cn("bg-card m-0 flex flex-col rounded-xl border p-4", className)}>
      <figcaption className="mb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          {subtitle && (
            <span className="text-muted-foreground text-xs">{subtitle}</span>
          )}
        </div>
        {legend && <div className="mt-2">{legend}</div>}
      </figcaption>

      <div className="min-w-0 flex-1">{children}</div>

      {footer && <div className="mt-3 text-xs">{footer}</div>}

      {table && (
        <details className="mt-3 border-t pt-2.5">
          <summary className="text-muted-foreground cursor-pointer text-xs">
            View as table
          </summary>
          <div className="mt-2 max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground text-left">
                <tr>
                  {table.columns.map((c, i) => (
                    <th
                      key={c}
                      className={cn("py-1 font-medium", i > 0 && "text-right")}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn("py-1", ci > 0 && "text-right tabular-nums")}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

/**
 * Legend — mandatory for two or more series. The swatch mirrors the mark
 * (a rect for bars and areas), and the text stays in a text token so identity
 * comes from the swatch beside it, never from coloured type.
 */
export function Legend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/** Floating readout. Values lead, series names follow. */
export function Tooltip({
  x,
  y,
  children,
  align = "center",
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  align?: "center" | "left" | "right";
}) {
  return (
    <div
      className="bg-card pointer-events-none absolute z-20 w-max max-w-[220px] rounded-lg border px-2.5 py-1.5 text-xs shadow-md"
      style={{
        left: x,
        top: y,
        transform:
          align === "center"
            ? "translate(-50%, -100%)"
            : align === "left"
              ? "translate(0, -100%)"
              : "translate(-100%, -100%)",
      }}
      role="status"
    >
      {children}
    </div>
  );
}

/** A short stroke of the series colour, used to key a row in a tooltip. */
export function TooltipKey({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-0.5 w-3 shrink-0 rounded-full align-middle"
      style={{ backgroundColor: color }}
    />
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground flex h-full min-h-24 items-center justify-center text-center text-xs">
      {children}
    </p>
  );
}

/** Round a maximum up to a clean axis top (1 / 2 / 2.5 / 5 × 10^n). */
export function axisTop(max: number, fallback = 10): number {
  if (max <= 0) return fallback;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= max) return step * magnitude;
  }
  return 10 * magnitude;
}

/**
 * Axis top for a count. Uses an even ladder so the midpoint tick is a whole
 * number — "2.5 orders" is not a quantity that exists.
 */
export function axisTopInt(max: number, fallback = 4): number {
  if (max <= 0) return fallback;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 4, 6, 8, 10]) {
    const candidate = step * magnitude;
    if (candidate >= max) return candidate % 2 === 0 ? candidate : candidate + 1;
  }
  return 10 * magnitude;
}

/** The five validated steps of the rose ramp, light → dark. */
export const RAMP = [
  "var(--ramp-1)",
  "var(--ramp-2)",
  "var(--ramp-3)",
  "var(--ramp-4)",
  "var(--ramp-5)",
] as const;

/**
 * Categorical slots, assigned in fixed order and never cycled. Six is the
 * ceiling here: past it a chart folds its tail into "Other" rather than
 * inventing a seventh hue that no reader could tell from an existing one.
 */
export const SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
] as const;

/** Single-series accent — the brand hue, validated against both surfaces. */
export const ACCENT = "var(--chart-1)";
