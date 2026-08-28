"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SmartImage } from "@/components/smart-image";
import { formatMoney } from "@/lib/money";
import { commerce } from "@/lib/site";
import {
  removeCartItem,
  setCartItemQuantity,
  updateCartItemMessage,
} from "@/app/actions/cart";
import { notifyCartUpdated } from "@/components/cart-badge";
import type { Cart } from "@/lib/cart";

export function CartView({ cart }: { cart: Cart }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    startTransition(async () => {
      await fn();
      notifyCartUpdated();
      router.refresh();
      setBusyId(null);
    });
  }

  const deliveryEstimate =
    commerce.freeDeliveryOverCents > 0 &&
    cart.subtotalCents >= commerce.freeDeliveryOverCents
      ? 0
      : commerce.deliveryFeeCents;

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y">
        {cart.lines.map((line) => (
          <li key={line.productId} className="flex gap-4 py-5 first:pt-0">
            <Link
              href={`/cakes/${line.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-lg border"
            >
              <SmartImage src={line.imageUrl} alt={line.name} sizes="96px" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/cakes/${line.slug}`}
                    className="font-medium hover:underline"
                  >
                    {line.name}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {formatMoney(line.unitPriceCents)} each
                  </p>
                  {!line.isAvailable && (
                    <p className="text-destructive mt-1 text-xs font-medium">
                      No longer available — remove to check out
                    </p>
                  )}
                </div>
                <p className="font-semibold">{formatMoney(line.lineTotalCents)}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-md border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-r-none"
                    aria-label="Decrease"
                    disabled={busyId === line.productId}
                    onClick={() =>
                      run(line.productId, () =>
                        setCartItemQuantity(line.productId, line.quantity - 1),
                      )
                    }
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-9 text-center text-sm tabular-nums">
                    {busyId === line.productId ? (
                      <Loader2 className="mx-auto size-3.5 animate-spin" />
                    ) : (
                      line.quantity
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-l-none"
                    aria-label="Increase"
                    disabled={
                      busyId === line.productId ||
                      line.quantity >= commerce.maxQuantityPerItem
                    }
                    onClick={() =>
                      run(line.productId, () =>
                        setCartItemQuantity(line.productId, line.quantity + 1),
                      )
                    }
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={busyId === line.productId}
                  onClick={() =>
                    run(line.productId, async () => {
                      await removeCartItem(line.productId);
                      toast.success("Removed from cart");
                    })
                  }
                >
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>

              <Input
                defaultValue={line.message ?? ""}
                maxLength={80}
                placeholder="Message on the cake (optional)"
                className="mt-3 h-9 text-sm"
                onBlur={(e) => {
                  if ((e.target.value || "") === (line.message ?? "")) return;
                  run(line.productId, () =>
                    updateCartItemMessage(line.productId, e.target.value),
                  );
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <aside className="bg-card h-fit rounded-xl border p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{formatMoney(cart.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery (estimate)</dt>
            <dd className="font-medium">
              {deliveryEstimate === 0 ? "Free" : formatMoney(deliveryEstimate)}
            </dd>
          </div>
          <p className="text-muted-foreground text-xs">
            Choose delivery or free collection at checkout — the final total updates
            there.
          </p>
        </dl>
        <Separator className="my-4" />
        <div className="flex justify-between text-base font-semibold">
          <span>Estimated total</span>
          <span>{formatMoney(cart.subtotalCents + deliveryEstimate)}</span>
        </div>

        <Button
          asChild
          size="lg"
          className="mt-5 w-full"
          disabled={cart.subtotalCents === 0}
        >
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link href="/cakes">Continue shopping</Link>
        </Button>
      </aside>
    </div>
  );
}
