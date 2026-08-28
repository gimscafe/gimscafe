"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCart, writeCartCookie } from "@/lib/cart";
import { createOrder } from "@/lib/orders";
import { checkoutSchema } from "@/lib/validation";
import { commerce } from "@/lib/site";

export interface CheckoutState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function dateAfterDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    fulfillmentType: formData.get("fulfillmentType"),
    fulfillmentDate: formData.get("fulfillmentDate"),
    fulfillmentTime: formData.get("fulfillmentTime") ?? "",
    deliveryAddress: formData.get("deliveryAddress") ?? "",
    deliveryCity: formData.get("deliveryCity") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const cart = await getCart();
  const payable = cart.lines.filter((l) => l.isAvailable);
  if (payable.length === 0) {
    return { error: "Your cart is empty." };
  }

  // Guard the lead time server-side too (respect the slowest cake in the cart).
  const requiredDays = Math.max(
    commerce.defaultLeadTimeDays,
    ...payable.map((l) => l.leadTimeDays),
  );
  if (parsed.data.fulfillmentDate < dateAfterDays(requiredDays)) {
    return {
      error: "Please choose a later date.",
      fieldErrors: {
        fulfillmentDate: [
          `The cakes in your order need at least ${requiredDays} days' notice.`,
        ],
      },
    };
  }

  let redirectTo: string;
  try {
    const { orderId, paymentMethod } = await createOrder(parsed.data, cart);
    await writeCartCookie([]);
    redirectTo =
      paymentMethod === "payhere"
        ? `/checkout/pay/${orderId}`
        : `/order/${orderId}?placed=1`;
  } catch (err) {
    console.error("placeOrder failed", err);
    return { error: "Something went wrong placing your order. Please try again." };
  }

  redirect(redirectTo);
}
