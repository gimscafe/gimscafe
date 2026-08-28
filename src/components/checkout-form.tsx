"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { placeOrder, type CheckoutState } from "@/app/actions/checkout";
import { formatMoney } from "@/lib/money";
import { commerce } from "@/lib/site";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-destructive mt-1 text-xs">{errors[0]}</p>;
}

export function CheckoutForm({
  minDate,
  subtotalCents,
  deliveryFeeCents,
  freeDeliveryOverCents,
  payHereEnabled,
}: {
  minDate: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  freeDeliveryOverCents: number;
  payHereEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    placeOrder,
    {},
  );
  const [fulfillment, setFulfillment] = React.useState<"delivery" | "pickup">(
    "delivery",
  );

  const fee =
    fulfillment === "pickup"
      ? 0
      : freeDeliveryOverCents > 0 && subtotalCents >= freeDeliveryOverCents
        ? 0
        : deliveryFeeCents;
  const total = subtotalCents + fee;
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Contact */}
        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-semibold">
            Your details
          </legend>
          <div>
            <Label htmlFor="customerName">Full name</Label>
            <Input id="customerName" name="customerName" autoComplete="name" required className="mt-1.5" />
            <FieldError errors={err.customerName} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                autoComplete="email"
                required
                className="mt-1.5"
              />
              <FieldError errors={err.customerEmail} />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                autoComplete="tel"
                placeholder="+94 77 123 4567"
                required
                className="mt-1.5"
              />
              <FieldError errors={err.customerPhone} />
            </div>
          </div>
        </fieldset>

        <Separator />

        {/* Fulfilment */}
        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-semibold">
            Delivery or collection
          </legend>
          <input type="hidden" name="fulfillmentType" value={fulfillment} />
          <RadioGroup
            value={fulfillment}
            onValueChange={(v) => setFulfillment(v as "delivery" | "pickup")}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Label
              htmlFor="ff-delivery"
              className="hover:bg-accent has-[:checked]:border-primary flex cursor-pointer items-start gap-3 rounded-lg border p-4"
            >
              <RadioGroupItem value="delivery" id="ff-delivery" className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">Deliver to me</span>
                <span className="text-muted-foreground block text-xs">
                  Across Colombo ·{" "}
                  {deliveryFeeCents === 0 ? "Free" : formatMoney(deliveryFeeCents)}
                </span>
              </span>
            </Label>
            <Label
              htmlFor="ff-pickup"
              className="hover:bg-accent has-[:checked]:border-primary flex cursor-pointer items-start gap-3 rounded-lg border p-4"
            >
              <RadioGroupItem value="pickup" id="ff-pickup" className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">Collect in store</span>
                <span className="text-muted-foreground block text-xs">
                  {commerce.pickupLocation} · Free
                </span>
              </span>
            </Label>
          </RadioGroup>

          {fulfillment === "delivery" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="deliveryAddress">Delivery address</Label>
                <Textarea
                  id="deliveryAddress"
                  name="deliveryAddress"
                  rows={2}
                  autoComplete="street-address"
                  className="mt-1.5"
                />
                <FieldError errors={err.deliveryAddress} />
              </div>
              <div>
                <Label htmlFor="deliveryCity">City / area</Label>
                <Input id="deliveryCity" name="deliveryCity" className="mt-1.5" />
                <FieldError errors={err.deliveryCity} />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fulfillmentDate">
                {fulfillment === "delivery" ? "Delivery" : "Collection"} date
              </Label>
              <Input
                id="fulfillmentDate"
                name="fulfillmentDate"
                type="date"
                min={minDate}
                defaultValue={minDate}
                required
                className="mt-1.5"
              />
              <FieldError errors={err.fulfillmentDate} />
              <p className="text-muted-foreground mt-1 text-xs">
                Earliest available: {minDate}
              </p>
            </div>
            <div>
              <Label htmlFor="fulfillmentTime">Preferred time (optional)</Label>
              <Input
                id="fulfillmentTime"
                name="fulfillmentTime"
                placeholder="e.g. before 2pm"
                className="mt-1.5"
              />
            </div>
          </div>
        </fieldset>

        <Separator />

        <div>
          <Label htmlFor="notes">Notes for the baker (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Design ideas, colours, dietary needs, full dedication message…"
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Summary */}
      <aside className="bg-card h-fit rounded-xl border p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold">Order total</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{formatMoney(subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {fulfillment === "pickup" ? "Collection" : "Delivery"}
            </dt>
            <dd className="font-medium">{fee === 0 ? "Free" : formatMoney(fee)}</dd>
          </div>
        </dl>
        <Separator className="my-4" />
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>

        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {payHereEnabled ? "Continue to payment" : "Place order"}
        </Button>

        <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
          <ShieldCheck className="size-3.5" />
          {payHereEnabled
            ? "You'll be redirected to PayHere to pay securely."
            : "We'll email you payment details to confirm the order."}
        </p>
      </aside>
    </form>
  );
}
