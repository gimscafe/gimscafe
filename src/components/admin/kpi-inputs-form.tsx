"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveKpiInputs, type KpiInputsFormState } from "@/app/admin/actions";
import { toast } from "sonner";
import type { KpiInputs } from "@/db/schema";

function Err({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-destructive mt-1 text-xs">{errors[0]}</p>;
}

function Field({
  name,
  label,
  hint,
  errors,
  ...props
}: {
  name: string;
  label: string;
  hint: string;
  errors?: string[];
} & React.ComponentProps<typeof Input>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="mt-1.5" {...props} />
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      <Err errors={errors} />
    </div>
  );
}

export function KpiInputsForm({
  period,
  periodLabel,
  inputs,
}: {
  period: string;
  periodLabel: string;
  inputs: KpiInputs | null;
}) {
  const [state, action, pending] = useActionState<KpiInputsFormState, FormData>(
    saveKpiInputs,
    {},
  );
  const err = state.fieldErrors ?? {};

  React.useEffect(() => {
    if (state.savedPeriod) toast.success("Monthly inputs saved");
  }, [state.savedPeriod]);

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <input type="hidden" name="period" value={period} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-card space-y-5 rounded-xl border p-5">
        <p className="text-sm font-medium">Revenue &amp; spend for {periodLabel}</p>

        <Field
          name="offlineRevenueLkr"
          label="Offline revenue (LKR)"
          hint="Walk-in, phone and wholesale sales for the month. Feeds Digital Sales %."
          type="number"
          min={0}
          step="1"
          defaultValue={inputs ? inputs.offlineRevenueCents / 100 : ""}
          placeholder="0"
          errors={err.offlineRevenueLkr}
        />

        <Field
          name="marketingCostLkr"
          label="Marketing cost (LKR)"
          hint="Ads, boosted posts and promotions aimed at winning customers. Feeds Customer Acquisition Cost."
          type="number"
          min={0}
          step="1"
          defaultValue={inputs ? inputs.marketingCostCents / 100 : ""}
          placeholder="0"
          errors={err.marketingCostLkr}
        />

        <Field
          name="digitalInvestmentLkr"
          label="Digital investment (LKR)"
          hint="Everything the online channel cost this month — hosting, domain, tooling and the marketing above. Feeds ROI."
          type="number"
          min={0}
          step="1"
          defaultValue={inputs ? inputs.digitalInvestmentCents / 100 : ""}
          placeholder="0"
          errors={err.digitalInvestmentLkr}
        />
      </div>

      <div className="bg-card space-y-5 rounded-xl border p-5">
        <p className="text-sm font-medium">Assumptions</p>

        <Field
          name="gatewayFeePercent"
          label="Payment gateway fee (%)"
          hint="What PayHere charges per transaction. Feeds Transaction Cost %."
          type="number"
          min={0}
          max={100}
          step="0.01"
          defaultValue={inputs ? inputs.gatewayFeeBps / 100 : 3.3}
          errors={err.gatewayFeePercent}
        />

        <Field
          name="customerLifespanMonths"
          label="Customer lifespan (months)"
          hint="How long an average customer keeps buying from you. Feeds Customer Lifetime Value."
          type="number"
          min={1}
          max={600}
          step="1"
          defaultValue={inputs?.customerLifespanMonths ?? 36}
          errors={err.customerLifespanMonths}
        />

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={inputs?.notes ?? ""}
            placeholder="Anything worth remembering about this month — a campaign, a closure, a big event order."
            className="mt-1.5"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Save inputs for {periodLabel}
      </Button>
    </form>
  );
}
