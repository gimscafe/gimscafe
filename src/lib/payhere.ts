import "server-only";
import { createHash } from "node:crypto";
import { site } from "./site";
import { toGatewayAmount } from "./money";

/**
 * PayHere (https://www.payhere.lk) — Checkout API + server-to-server "notify".
 * Docs: https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout
 *
 * Nothing here throws at import time; call `isPayHereConfigured()` first.
 */

export function payHereConfig() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID?.trim() ?? "";
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim() ?? "";
  // Anything that isn't an explicit, exact "live" stays on the sandbox — a
  // stray "Live", "production" or typo must never point real money at the
  // wrong endpoint.
  const mode: "sandbox" | "live" =
    process.env.PAYHERE_MODE?.trim().toLowerCase() === "live" ? "live" : "sandbox";
  return {
    merchantId,
    merchantSecret,
    mode,
    checkoutUrl:
      mode === "live"
        ? "https://www.payhere.lk/pay/checkout"
        : "https://sandbox.payhere.lk/pay/checkout",
  };
}

export function isPayHereConfigured(): boolean {
  const { merchantId, merchantSecret } = payHereConfig();
  return merchantId.length > 0 && merchantSecret.length > 0;
}

function md5Upper(input: string): string {
  return createHash("md5").update(input).digest("hex").toUpperCase();
}

/** Hash that authenticates the checkout request to PayHere. */
export function checkoutHash(params: {
  orderId: string;
  amountCents: number;
  currency: string;
}): string {
  const { merchantId, merchantSecret } = payHereConfig();
  const amount = toGatewayAmount(params.amountCents);
  const secretHash = md5Upper(merchantSecret);
  return md5Upper(merchantId + params.orderId + amount + params.currency + secretHash);
}

export interface CheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country?: string;
}

/** All hidden fields for the auto-submitting checkout form. */
export function buildCheckoutFields(input: {
  orderNumber: string;
  orderId: string;
  amountCents: number;
  currency: string;
  itemsLabel: string;
  customer: CheckoutCustomer;
}): Record<string, string> {
  const { merchantId, mode } = payHereConfig();
  const base = site.url;

  // PayHere rejects the request ("Unauthorized payment request") when the domain
  // of these URLs is not an approved domain on the merchant account. `localhost`
  // is auto-approved in sandbox, but shipping it to a live account is a footgun —
  // fail loudly instead of bouncing the customer to a confusing PayHere page.
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(
    base,
  );
  if (isLocalhost && mode === "live") {
    throw new Error(
      `PayHere checkout blocked: PAYHERE_MODE=live but NEXT_PUBLIC_SITE_URL is "${base}". ` +
        `Set it to the public origin registered as an approved domain in the PayHere dashboard.`,
    );
  }

  // PayHere confirms payments only via a server-to-server POST to notify_url, so
  // it must be publicly reachable. In local dev, point this at a tunnel
  // (cloudflared / ngrok) while the browser-facing URLs stay on localhost.
  const notifyUrl =
    process.env.PAYHERE_NOTIFY_URL?.trim() || `${base}/api/payhere/notify`;

  const fields: Record<string, string> = {
    merchant_id: merchantId,
    return_url: `${base}/order/${input.orderId}`,
    cancel_url: `${base}/order/${input.orderId}?cancelled=1`,
    notify_url: notifyUrl,
    order_id: input.orderNumber,
    items: input.itemsLabel,
    currency: input.currency,
    amount: toGatewayAmount(input.amountCents),
    first_name: input.customer.firstName,
    last_name: input.customer.lastName,
    email: input.customer.email,
    phone: input.customer.phone,
    address: input.customer.address,
    city: input.customer.city,
    country: input.customer.country ?? "Sri Lanka",
    custom_1: input.orderId,
    hash: checkoutHash({
      orderId: input.orderNumber,
      amountCents: input.amountCents,
      currency: input.currency,
    }),
  };

  if (process.env.PAYHERE_DEBUG === "1") {
    const { hash, merchant_id, ...rest } = fields;
    console.info("[payhere] checkout fields", {
      mode,
      checkoutUrl: payHereConfig().checkoutUrl,
      merchant_id: merchant_id ? `${merchant_id.slice(0, 3)}…(${merchant_id.length})` : "(empty)",
      hash_prefix: hash.slice(0, 8),
      ...rest,
    });
  }

  return fields;
}

export interface PayHereNotification {
  merchant_id: string;
  order_id: string;
  payment_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  custom_1?: string;
  custom_2?: string;
  method?: string;
  status_message?: string;
}

/** Recompute the signature PayHere sends with every notification. */
export function verifyNotification(n: PayHereNotification): boolean {
  const { merchantId, merchantSecret } = payHereConfig();
  if (!merchantSecret) return false;
  const local = md5Upper(
    n.merchant_id +
      n.order_id +
      n.payhere_amount +
      n.payhere_currency +
      n.status_code +
      md5Upper(merchantSecret),
  );
  return local === n.md5sig?.toUpperCase() && n.merchant_id === merchantId;
}

export const PAYHERE_STATUS: Record<string, string> = {
  "2": "success",
  "0": "pending",
  "-1": "cancelled",
  "-2": "failed",
  "-3": "chargedback",
};
