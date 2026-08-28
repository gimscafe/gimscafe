import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { getOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { isPayHereConfigured } from "@/lib/payhere";
import { formatDate } from "@/lib/utils";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ placed?: string; cancelled?: string }>;
}) {
  const { orderId } = await params;
  const { cancelled } = await searchParams;
  const order = await getOrder(orderId);
  if (!order) notFound();

  const awaitingPayment = order.status === "pending_payment";
  const canPayOnline = awaitingPayment && isPayHereConfigured();

  return (
    <div className="container-page max-w-3xl py-14">
      {/* Header */}
      <div className="text-center">
        {order.status === "cancelled" ? (
          <XCircle className="text-destructive mx-auto size-12" />
        ) : awaitingPayment ? (
          <Clock className="mx-auto size-12 text-amber-500" />
        ) : (
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        )}

        <h1 className="font-display mt-4 text-3xl font-semibold">
          {order.status === "cancelled"
            ? "Order cancelled"
            : awaitingPayment
              ? "Almost there"
              : "Thank you — your order is confirmed!"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Order reference{" "}
          <span className="text-foreground font-semibold">{order.orderNumber}</span>{" "}
          · <StatusBadge status={order.status} />
        </p>
      </div>

      {/* Payment states */}
      {cancelled && awaitingPayment && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Your payment was cancelled and the order has not been placed yet. You can try
          again below — your details are saved.
        </div>
      )}

      {awaitingPayment && (
        <div className="bg-card mt-6 rounded-lg border p-5 text-center">
          {canPayOnline ? (
            <>
              <p className="text-sm font-medium">This order needs payment to confirm.</p>
              <p className="text-muted-foreground mt-1 text-xs">
                If you just paid, it can take a few seconds to confirm — refresh this page.
              </p>
              <Button asChild className="mt-4">
                <Link href={`/checkout/pay/${order.id}`}>
                  Pay {formatMoney(order.totalCents)} with PayHere
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">We&apos;ll be in touch to confirm payment.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Please transfer {formatMoney(order.totalCents)} or pay on collection.
                Email <a href={`mailto:${site.email}`} className="underline">{site.email}</a> with
                your reference {order.orderNumber}.
              </p>
            </>
          )}
        </div>
      )}

      {/* Details */}
      <div className="bg-card mt-8 rounded-xl border p-6">
        <h2 className="font-display text-lg font-semibold">Order details</h2>

        <ul className="mt-4 divide-y">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {it.quantity} × {it.productName}
                </p>
                {it.cakeMessage && (
                  <p className="text-muted-foreground text-xs">
                    Message: “{it.cakeMessage}”
                  </p>
                )}
              </div>
              <p className="font-medium">{formatMoney(it.lineTotalCents)}</p>
            </li>
          ))}
        </ul>

        <Separator className="my-4" />
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatMoney(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {order.fulfillmentType === "pickup" ? "Collection" : "Delivery"}
            </dt>
            <dd>
              {order.deliveryFeeCents === 0
                ? "Free"
                : formatMoney(order.deliveryFeeCents)}
            </dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalCents)}</dd>
          </div>
        </dl>

        <Separator className="my-4" />
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
              <CalendarDays className="size-3.5" />
              {order.fulfillmentType === "pickup" ? "Collection" : "Delivery"}
            </p>
            <p className="mt-1">{formatDate(order.fulfillmentDate)}</p>
            {order.fulfillmentTime && (
              <p className="text-muted-foreground">{order.fulfillmentTime}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
              <MapPin className="size-3.5" />
              {order.fulfillmentType === "pickup" ? "Pick up from" : "Deliver to"}
            </p>
            {order.fulfillmentType === "pickup" ? (
              <p className="mt-1">{site.address}</p>
            ) : (
              <p className="mt-1">
                {order.deliveryAddress}
                {order.deliveryCity ? `, ${order.deliveryCity}` : ""}
              </p>
            )}
          </div>
        </div>

        {order.notes && (
          <>
            <Separator className="my-4" />
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Notes for the baker
            </p>
            <p className="mt-1 whitespace-pre-line text-sm">{order.notes}</p>
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-muted-foreground text-sm">
          A copy of these details is on its way to {order.customerEmail}. Questions?
          Call us on {site.phone}.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/cakes">Back to the menu</Link>
        </Button>
      </div>
    </div>
  );
}
