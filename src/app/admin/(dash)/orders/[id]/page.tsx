import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentEvents } from "@/db/schema";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/admin/status-select";
import { Separator } from "@/components/ui/separator";
import { getOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PAYHERE_STATUS } from "@/lib/payhere";

export const metadata = { title: "Order" };

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const db = getDb();
  const events = await db
    .select()
    .from(paymentEvents)
    .where(and(eq(paymentEvents.orderId, order.id), eq(paymentEvents.provider, "payhere")));

  return (
    <div>
      <Link
        href="/admin/orders"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" /> All orders
      </Link>

      <AdminPageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        action={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main */}
        <div className="space-y-6">
          <section className="bg-card rounded-xl border p-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
              Items
            </h2>
            <ul className="mt-3 divide-y">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-4 py-2.5 text-sm">
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
                  <p>{formatMoney(it.lineTotalCents)}</p>
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <dl className="space-y-1 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotalCents)} />
              <Row
                label={order.fulfillmentType === "pickup" ? "Collection" : "Delivery"}
                value={
                  order.deliveryFeeCents === 0
                    ? "Free"
                    : formatMoney(order.deliveryFeeCents)
                }
              />
              <Row label="Total" value={formatMoney(order.totalCents)} strong />
            </dl>
          </section>

          <section className="bg-card rounded-xl border p-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
              Customer &amp; fulfilment
            </h2>
            <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
              <Field label="Name" value={order.customerName} />
              <Field label="Phone" value={order.customerPhone} />
              <Field label="Email" value={order.customerEmail} />
              <Field
                label="Method"
                value={order.fulfillmentType === "pickup" ? "Collection" : "Delivery"}
              />
              <Field
                label="Date"
                value={`${formatDate(order.fulfillmentDate)}${
                  order.fulfillmentTime ? ` · ${order.fulfillmentTime}` : ""
                }`}
              />
              {order.fulfillmentType === "delivery" && (
                <Field
                  label="Address"
                  value={`${order.deliveryAddress ?? "—"}${
                    order.deliveryCity ? `, ${order.deliveryCity}` : ""
                  }`}
                />
              )}
            </div>
            {order.notes && (
              <>
                <Separator className="my-3" />
                <Field label="Notes for the baker" value={order.notes} />
              </>
            )}
          </section>

          {events.length > 0 && (
            <section className="bg-card rounded-xl border p-5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                Payment log (PayHere)
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3">
                    <span>
                      {PAYHERE_STATUS[e.statusCode ?? ""] ?? "update"}{" "}
                      <span className="text-muted-foreground text-xs">
                        ({e.statusCode})
                      </span>
                      {!e.verified && (
                        <span className="text-destructive ml-2 text-xs">
                          signature not verified
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(e.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm font-semibold">Update status</p>
            <div className="mt-2">
              <StatusSelect orderId={order.id} current={order.status} />
            </div>
          </div>

          <div className="bg-card rounded-xl border p-5 text-sm">
            <p className="font-semibold">Payment</p>
            <dl className="mt-2 space-y-1">
              <Row label="Method" value={order.paymentMethod.replace(/_/g, " ")} />
              <Row
                label="Gateway status"
                value={
                  order.paymentStatusCode
                    ? `${PAYHERE_STATUS[order.paymentStatusCode] ?? "—"} (${order.paymentStatusCode})`
                    : "—"
                }
              />
              <Row label="Reference" value={order.paymentRef ?? "—"} />
              <Row
                label="Paid at"
                value={order.paidAt ? formatDateTime(order.paidAt) : "—"}
              />
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold" : ""}>{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-line">{value}</p>
    </div>
  );
}
