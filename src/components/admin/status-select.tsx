"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUS_FLOW, ORDER_STATUS_META } from "@/lib/order-status";
import type { OrderStatus } from "@/db/schema";

export function StatusSelect({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      aria-label="Update order status"
      className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      onChange={(e) => {
        const status = e.target.value;
        const fd = new FormData();
        fd.set("id", orderId);
        fd.set("status", status);
        startTransition(async () => {
          await changeOrderStatus(fd);
          router.refresh();
          toast.success(
            `Status set to “${ORDER_STATUS_META[status as OrderStatus].label}”`,
          );
        });
      }}
    >
      {ORDER_STATUS_FLOW.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
