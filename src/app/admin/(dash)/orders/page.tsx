import Link from "next/link";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/status-badge";
import { listOrders, ORDER_STATUS_META, ORDER_STATUS_FLOW } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/db/schema";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = ORDER_STATUS_FLOW.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;
  const orders = await listOrders({ status: activeStatus, limit: 200 });

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description="Every order placed through the storefront."
      />

      <nav className="mb-5 flex flex-wrap gap-2">
        <Chip href="/admin/orders" active={!activeStatus}>
          All
        </Chip>
        {ORDER_STATUS_FLOW.map((s) => (
          <Chip
            key={s}
            href={`/admin/orders?status=${s}`}
            active={activeStatus === s}
          >
            {ORDER_STATUS_META[s].label}
          </Chip>
        ))}
      </nav>

      <div className="bg-card overflow-x-auto rounded-xl border">
        {orders.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">
            No orders{activeStatus ? " with this status" : ""} yet.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Ref</th>
                <th className="px-4 py-2.5 font-medium">Placed</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Fulfilment</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {formatDateTime(o.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {o.customerName}
                    <span className="text-muted-foreground block text-xs">
                      {o.customerPhone}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.fulfillmentType === "pickup" ? "Pickup" : "Delivery"}
                    <span className="text-muted-foreground block text-xs">
                      {formatDate(o.fulfillmentDate)}
                    </span>
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

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-accent text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}
