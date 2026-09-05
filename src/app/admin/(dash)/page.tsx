import Link from "next/link";
import { ArrowRight, Clock, CookingPot, Receipt, Wallet } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/status-badge";
import { listOrders, orderStats } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([
    orderStats(),
    listOrders({ limit: 8 }),
  ]);

  const cards = [
    { label: "Total orders", value: String(stats.total), icon: Receipt },
    { label: "Awaiting payment", value: String(stats.pending), icon: Clock },
    { label: "In progress", value: String(stats.active), icon: CookingPot },
    {
      label: "Confirmed revenue",
      value: formatMoney(stats.revenueCents),
      icon: Wallet,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="A quick pulse on orders and revenue."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">{c.label}</p>
              <c.icon className="text-muted-foreground size-4" />
            </div>
            <p className="font-display mt-2 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          href="/admin/analytics"
          className="text-primary inline-flex items-center gap-1 text-sm font-medium"
        >
          Analytics <ArrowRight className="size-3.5" />
        </Link>
        <Link
          href="/admin/kpi"
          className="text-primary ml-4 inline-flex items-center gap-1 text-sm font-medium"
        >
          KPI dashboard <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Recent orders</h2>
        <Link
          href="/admin/orders"
          className="text-primary inline-flex items-center gap-1 text-sm font-medium"
        >
          All orders <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="bg-card mt-3 overflow-hidden rounded-xl border">
        {recent.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">
            No orders yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Ref</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">For</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3">
                    {o.fulfillmentType === "pickup" ? "Pickup" : "Delivery"} ·{" "}
                    {formatDate(o.fulfillmentDate, { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3">{formatMoney(o.totalCents)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
