/**
 * Simulate PayHere's server-to-server payment notification for a local order.
 * PayHere can't call http://localhost, so after completing a sandbox payment in
 * the browser, run this to deliver the callback the app is waiting for.
 *
 *   npx dotenv -e .env.local -- tsx scripts/fire-notify.mts SB-XXXXXX [status]
 *
 * status: 2 = success (default), 0 = pending, -1 = cancelled, -2 = failed
 */
import { createHash } from "node:crypto";
import { getDb } from "../src/db/index.ts";
import { orders } from "../src/db/schema.ts";
import { eq } from "drizzle-orm";

const orderNumber = process.argv[2];
const statusCode = process.argv[3] ?? "2";
if (!orderNumber) {
  console.error("Usage: tsx scripts/fire-notify.mts SB-XXXXXX [statusCode]");
  process.exit(1);
}

const merchantId = (process.env.PAYHERE_MERCHANT_ID ?? "").trim();
const merchantSecret = (process.env.PAYHERE_MERCHANT_SECRET ?? "").trim();
const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");
if (!merchantId || !merchantSecret) {
  console.error("PAYHERE_MERCHANT_ID / PAYHERE_MERCHANT_SECRET missing from env.");
  process.exit(1);
}

const db = getDb();
const [order] = await db
  .select()
  .from(orders)
  .where(eq(orders.orderNumber, orderNumber))
  .limit(1);
if (!order) {
  console.error(`No order with number ${orderNumber}.`);
  process.exit(1);
}

const up = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();
const amount = (order.totalCents / 100).toFixed(2);
const currency = order.currency;
const md5sig = up(
  merchantId + orderNumber + amount + currency + statusCode + up(merchantSecret),
);

const form = new URLSearchParams({
  merchant_id: merchantId,
  order_id: orderNumber,
  payment_id: String(Date.now()).slice(-12),
  payhere_amount: amount,
  payhere_currency: currency,
  status_code: statusCode,
  md5sig,
  custom_1: order.id,
  method: "VISA",
  status_message: statusCode === "2" ? "Successfully completed" : "Test callback",
});

const res = await fetch(`${base}/api/payhere/notify`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: form.toString(),
});
console.log(`notify ${base}/api/payhere/notify -> ${res.status} ${await res.text()}`);
console.log(`order ${orderNumber}: sent status_code=${statusCode} (amount ${amount} ${currency})`);
process.exit(res.ok ? 0 : 2);
