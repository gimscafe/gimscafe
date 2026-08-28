import type { OrderStatus } from "@/db/schema";

/**
 * Pure, client-safe order-status metadata. No server imports — safe to use in
 * both client components and server code.
 */

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: "amber" | "blue" | "violet" | "green" | "red" | "gray" }
> = {
  pending_payment: { label: "Pending payment", tone: "amber" },
  paid: { label: "Paid", tone: "blue" },
  in_kitchen: { label: "In the kitchen", tone: "violet" },
  ready: { label: "Ready", tone: "violet" },
  out_for_delivery: { label: "Out for delivery", tone: "violet" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending_payment",
  "paid",
  "in_kitchen",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
];
