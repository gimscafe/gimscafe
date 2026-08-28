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
  const mode = (process.env.PAYHERE_MODE?.trim() as "sandbox" | "live") ?? "sandbox";
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
  const { merchantId } = payHereConfig();
  const base = site.url;
  return {
    merchant_id: merchantId,
    return_url: `${base}/order/${input.orderId}`,
    cancel_url: `${base}/order/${input.orderId}?cancelled=1`,
    notify_url: `${base}/api/payhere/notify`,
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
