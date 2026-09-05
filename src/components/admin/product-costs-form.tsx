"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SmartImage } from "@/components/smart-image";
import { saveProductCosts, type CostsFormState } from "@/app/admin/actions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CostRow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceCents: number;
  costCents: number;
}

/**
 * Bulk "cost to make" editor — the fast way to backfill cakes that predate
 * costing. Margin updates live as you type so a fat-fingered cost is obvious
 * before saving.
 */
export function ProductCostsForm({ rows }: { rows: CostRow[] }) {
  const [state, action, pending] = useActionState<CostsFormState, FormData>(
    saveProductCosts,
    {},
  );
  const [costs, setCosts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map((r) => [r.id, r.costCents > 0 ? String(r.costCents / 100) : ""]),
    ),
  );

  React.useEffect(() => {
    if (state.saved) toast.success(`Saved ${state.saved} cost${state.saved === 1 ? "" : "s"}`);
  }, [state.saved]);

  const uncosted = rows.filter((r) => !Number(costs[r.id])).length;

  return (
    <form action={action}>
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">Cake</th>
              <th className="px-4 py-2.5 text-right font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Cost to make (LKR)</th>
              <th className="px-4 py-2.5 text-right font-medium">Profit</th>
              <th className="px-4 py-2.5 text-right font-medium">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const costLkr = Number(costs[r.id]);
              const hasCost = Number.isFinite(costLkr) && costLkr > 0;
              const profitCents = hasCost
                ? r.priceCents - Math.round(costLkr * 100)
                : null;
              const marginPct =
                profitCents !== null && r.priceCents > 0
                  ? (profitCents / r.priceCents) * 100
                  : null;

              return (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-md border">
                        <SmartImage src={r.imageUrl} alt={r.name} sizes="36px" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          /{r.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatMoney(r.priceCents)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Input
                      name={`cost:${r.id}`}
                      type="number"
                      min={0}
                      step="1"
                      inputMode="numeric"
                      aria-label={`Cost to make ${r.name}`}
                      value={costs[r.id] ?? ""}
                      onChange={(e) =>
                        setCosts((c) => ({ ...c, [r.id]: e.target.value }))
                      }
                      placeholder="—"
                      className="h-9 w-32"
                    />
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right tabular-nums",
                      profitCents !== null && profitCents < 0 && "text-destructive",
                    )}
                  >
                    {profitCents === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      formatMoney(profitCents)
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {marginPct === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      `${marginPct.toFixed(1)}%`
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save costs
        </Button>
        <p className="text-muted-foreground text-sm">
          {uncosted === 0
            ? "Every cake has a cost."
            : `${uncosted} cake${uncosted === 1 ? "" : "s"} still uncosted. Blank rows are left unchanged.`}
        </p>
      </div>
    </form>
  );
}
