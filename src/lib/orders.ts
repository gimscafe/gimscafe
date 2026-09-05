import "server-only";
import { cache } from "react";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  orderItems,
  orders,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/db/schema";
import { generateOrderNumber } from "./utils";
import { deliveryFeeFor, type Cart } from "./cart";
import { isPayHereConfigured } from "./payhere";
import type { CheckoutInput } from "./validation";

export { ORDER_STATUS_META, ORDER_STATUS_FLOW } from "./order-status";

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export async function createOrder(
  input: CheckoutInput,
  cart: Cart,
): Promise<{ orderId: string; orderNumber: string; paymentMethod: string }> {
  const db = getDb();

  const payable = cart.lines.filter((l) => l.isAvailable);
  if (payable.length === 0) throw new Error("Your cart is empty.");

  const subtotalCents = payable.reduce((s, l) => s + l.lineTotalCents, 0);
  const deliveryFeeCents = deliveryFeeFor(subtotalCents, input.fulfillmentType);
  const totalCents = subtotalCents + deliveryFeeCents;

  const usePayHere = isPayHereConfigured() && totalCents > 0;
  const paymentMethod = usePayHere ? "payhere" : "cash_on_collection";

  // Retry a couple of times on the (extremely unlikely) order-number collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    const orderNumber = generateOrderNumber();
    try {
      const orderId = await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            orderNumber,
            status: "pending_payment",
            customerName: input.customerName,
            customerEmail: input.customerEmail.toLowerCase(),
            customerPhone: input.customerPhone,
            fulfillmentType: input.fulfillmentType,
            fulfillmentDate: input.fulfillmentDate,
            fulfillmentTime: input.fulfillmentTime || null,
            deliveryAddress:
              input.fulfillmentType === "delivery" ? input.deliveryAddress || null : null,
            deliveryCity:
              input.fulfillmentType === "delivery" ? input.deliveryCity || null : null,
            notes: input.notes || null,
            subtotalCents,
            deliveryFeeCents,
            totalCents,
            currency: "LKR",
            paymentMethod,
          })
          .returning({ id: orders.id });

        await tx.insert(orderItems).values(
          payable.map((l) => ({
            orderId: order.id,
            productId: l.productId,
            productName: l.name,
            productSlug: l.slug,
            unitPriceCents: l.unitPriceCents,
            unitCostCents: l.unitCostCents,
            quantity: l.quantity,
            lineTotalCents: l.lineTotalCents,
            cakeMessage: l.message || null,
          })),
        );

        return order.id;
      });

      return { orderId, orderNumber, paymentMethod };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("order_number") && attempt < 3) continue;
      throw err;
    }
  }
  throw new Error("Could not place the order, please try again.");
}

export const getOrder = cache(async (id: string): Promise<OrderWithItems | null> => {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  return { ...order, items };
});

export const getOrderByNumber = cache(
  async (orderNumber: string): Promise<OrderWithItems | null> => {
    const db = getDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);
    if (!order) return null;
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    return { ...order, items };
  },
);

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const db = getDb();
  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id));
}

export async function applyPaymentResult(
  orderId: string,
  result: { statusCode: string; paymentRef?: string; amountCents?: number },
): Promise<void> {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return;

  const patch: Partial<typeof orders.$inferInsert> = {
    paymentStatusCode: result.statusCode,
    paymentRef: result.paymentRef ?? order.paymentRef,
    updatedAt: new Date(),
  };

  if (result.statusCode === "2" && order.status === "pending_payment") {
    patch.status = "paid";
    patch.paidAt = new Date();
  } else if (
    (result.statusCode === "-1" || result.statusCode === "-2") &&
    order.status === "pending_payment"
  ) {
    patch.status = "cancelled";
  }

  await db.update(orders).set(patch).where(eq(orders.id, orderId));
}

export async function listOrders(opts?: {
  status?: OrderStatus;
  limit?: number;
}): Promise<Order[]> {
  const db = getDb();
  return db
    .select()
    .from(orders)
    .where(opts?.status ? eq(orders.status, opts.status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(opts?.limit ?? 100);
}

export async function orderStats(): Promise<{
  total: number;
  pending: number;
  active: number;
  revenueCents: number;
}> {
  const db = getDb();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${orders.status} = 'pending_payment')::int`,
      active: sql<number>`count(*) filter (where ${orders.status} in ('paid','in_kitchen','ready','out_for_delivery'))::int`,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} not in ('pending_payment','cancelled')), 0)::int`,
    })
    .from(orders);
  return row ?? { total: 0, pending: 0, active: 0, revenueCents: 0 };
}
