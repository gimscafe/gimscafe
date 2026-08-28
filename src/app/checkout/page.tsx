import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CheckoutForm } from "@/components/checkout-form";
import { SmartImage } from "@/components/smart-image";
import { getCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { commerce } from "@/lib/site";
import { isPayHereConfigured } from "@/lib/payhere";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cart = await getCart();
  const payable = cart.lines.filter((l) => l.isAvailable);
  if (payable.length === 0) redirect("/cart");

  const requiredDays = Math.max(
    commerce.defaultLeadTimeDays,
    ...payable.map((l) => l.leadTimeDays),
  );
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + requiredDays);
  const minDateStr = minDate.toISOString().slice(0, 10);

  return (
    <div className="container-page py-12">
      <Link
        href="/cart"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" /> Back to cart
      </Link>
      <h1 className="font-display mt-4 text-3xl font-semibold sm:text-4xl">Checkout</h1>

      <div className="mt-6">
        <ul className="bg-card mb-8 space-y-2 rounded-lg border p-4">
          {payable.map((l) => (
            <li key={l.productId} className="flex items-center gap-3 text-sm">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-md border">
                <SmartImage src={l.imageUrl} alt={l.name} sizes="40px" />
              </div>
              <span className="flex-1">
                {l.quantity} × {l.name}
                {l.message ? (
                  <span className="text-muted-foreground"> — “{l.message}”</span>
                ) : null}
              </span>
              <span className="font-medium">{formatMoney(l.lineTotalCents)}</span>
            </li>
          ))}
        </ul>

        <CheckoutForm
          minDate={minDateStr}
          subtotalCents={cart.subtotalCents}
          deliveryFeeCents={commerce.deliveryFeeCents}
          freeDeliveryOverCents={commerce.freeDeliveryOverCents}
          payHereEnabled={isPayHereConfigured()}
        />
      </div>
    </div>
  );
}
