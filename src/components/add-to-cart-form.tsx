"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { addToCart } from "@/app/actions/cart";
import { notifyCartUpdated } from "@/components/cart-badge";
import { commerce } from "@/lib/site";

export function AddToCartForm({
  productId,
  disabled = false,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [qty, setQty] = React.useState(1);
  const [message, setMessage] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const res = await addToCart({ productId, quantity: qty, message });
      if (res.ok) {
        notifyCartUpdated();
        toast.success("Added to your cart", {
          description: `${qty} × this cake`,
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
        router.refresh();
      } else {
        toast.error(res.message ?? "Could not add to cart");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="cake-message">Message on the cake (optional)</Label>
        <Input
          id="cake-message"
          value={message}
          maxLength={80}
          placeholder="e.g. Happy Birthday Amaya!"
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1.5"
          disabled={disabled}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Longer dedications and design notes go in the checkout notes box.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-r-none"
            aria-label="Decrease quantity"
            disabled={disabled || qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center text-sm font-medium tabular-nums">{qty}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-l-none"
            aria-label="Increase quantity"
            disabled={disabled || qty >= commerce.maxQuantityPerItem}
            onClick={() => setQty((q) => Math.min(commerce.maxQuantityPerItem, q + 1))}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <Button
          type="button"
          size="lg"
          className="flex-1"
          disabled={disabled || pending}
          onClick={submit}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShoppingBag className="size-4" />
          )}
          {disabled ? "Unavailable" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
