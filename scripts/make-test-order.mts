/**
 * Insert one pending_payment PayHere order and print its id + pay URL.
 *   npx tsx scripts/make-test-order.mts
 */
import { getDb } from "../src/db/index.ts";
import { orders, orderItems, products } from "../src/db/schema.ts";
import { eq } from "drizzle-orm";

const db = getDb();

const [product] = await db
  .select()
  .from(products)
  .where(eq(products.isAvailable, true))
  .limit(1);

if (!product) throw new Error("No available product — run `npm run db:seed` first.");

const qty = 1;
const unit = product.priceCents;
const lineTotal = unit * qty;
const deliveryFee = 60000; // LKR 600
const total = lineTotal + deliveryFee;

const date = new Date();
date.setDate(date.getDate() + 5);
const fulfillmentDate = date.toISOString().slice(0, 10);

const orderNumber = "SB-" + Math.random().toString(36).slice(2, 8).toUpperCase();

const [order] = await db
  .insert(orders)
  .values({
    orderNumber,
    status: "pending_payment",
    customerName: "Test Buyer",
    customerEmail: "test@example.com",
    customerPhone: "0770000000",
    fulfillmentType: "delivery",
    fulfillmentDate,
    deliveryAddress: "27 Horton Place, Colombo 07",
    deliveryCity: "Colombo",
    subtotalCents: lineTotal,
    deliveryFeeCents: deliveryFee,
    totalCents: total,
    currency: "LKR",
    paymentMethod: "payhere",
  })
  .returning({ id: orders.id });

await db.insert(orderItems).values({
  orderId: order.id,
  productId: product.id,
  productName: product.name,
  productSlug: product.slug,
  unitPriceCents: unit,
  quantity: qty,
  lineTotalCents: lineTotal,
});

console.log(JSON.stringify({ orderId: order.id, orderNumber, total, payUrl: `http://localhost:3100/checkout/pay/${order.id}` }));
process.exit(0);
