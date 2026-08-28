import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, paymentEvents } from "@/db/schema";
import {
  verifyNotification,
  type PayHereNotification,
} from "@/lib/payhere";
import { applyPaymentResult } from "@/lib/orders";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PayHere posts server-to-server as application/x-www-form-urlencoded.
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const get = (k: string) => (form.get(k) ?? "").toString().trim();
  const n: PayHereNotification = {
    merchant_id: get("merchant_id"),
    order_id: get("order_id"),
    payment_id: get("payment_id"),
    payhere_amount: get("payhere_amount"),
    payhere_currency: get("payhere_currency"),
    status_code: get("status_code"),
    md5sig: get("md5sig"),
    custom_1: get("custom_1"),
    custom_2: get("custom_2"),
    method: get("method"),
    status_message: get("status_message"),
  };

  try {
    const verified = verifyNotification(n);
    const db = getDb();

    // Resolve our internal order id. custom_1 should carry the UUID; only trust
    // it if it actually looks like one, then fall back to the order number.
    let orderId: string | null =
      n.custom_1 && UUID_RE.test(n.custom_1) ? n.custom_1 : null;
    if (!orderId && n.order_id) {
      const [row] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.orderNumber, n.order_id))
        .limit(1);
      orderId = row?.id ?? null;
    }

    // Record every notification (idempotent on order/status/provider).
    await db
      .insert(paymentEvents)
      .values({
        orderId,
        provider: "payhere",
        payload: n as unknown as Record<string, unknown>,
        statusCode: n.status_code || null,
        verified,
      })
      .onConflictDoNothing();

    if (!verified) {
      console.warn("PayHere notify: signature mismatch", {
        order: n.order_id,
        status: n.status_code,
      });
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    if (orderId) {
      await applyPaymentResult(orderId, {
        statusCode: n.status_code,
        paymentRef: n.payment_id || undefined,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("PayHere notify handler error", err);
    // Non-200 so PayHere retries if this was a transient failure.
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

// A GET here is handy for a quick "is the endpoint reachable" check.
export function GET() {
  return NextResponse.json({ endpoint: "payhere-notify", method: "POST only" });
}
