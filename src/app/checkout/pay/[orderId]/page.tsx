import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PayHereRedirect } from "./payhere-redirect";
import { getOrder } from "@/lib/orders";
import {
  buildCheckoutFields,
  isPayHereConfigured,
  payHereConfig,
} from "@/lib/payhere";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Redirecting to payment",
  robots: { index: false, follow: false },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) notFound();

  if (order.status !== "pending_payment" || !isPayHereConfigured()) {
    redirect(`/order/${order.id}`);
  }

  const [firstName, ...rest] = order.customerName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const itemsLabel =
    order.items.length === 1
      ? order.items[0].productName
      : `${order.items[0].productName} + ${order.items.length - 1} more`;

  const fields = buildCheckoutFields({
    orderNumber: order.orderNumber,
    orderId: order.id,
    amountCents: order.totalCents,
    currency: order.currency,
    itemsLabel,
    customer: {
      firstName,
      lastName,
      email: order.customerEmail,
      phone: order.customerPhone,
      address: order.deliveryAddress ?? "In-store collection",
      city: order.deliveryCity ?? "Colombo",
    },
  });

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16">
      <div className="bg-card w-full max-w-md rounded-2xl border p-8">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          Order {order.orderNumber}
        </p>
        <p className="font-display mt-1 text-2xl font-semibold">
          {formatMoney(order.totalCents)}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {payHereConfig().mode === "sandbox" && "PayHere sandbox · "}
          Do not close this window.
        </p>
        <div className="mt-6">
          <PayHereRedirect action={payHereConfig().checkoutUrl} fields={fields} />
        </div>
      </div>
    </div>
  );
}
