"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import {
  readCartCookie,
  writeCartCookie,
  type CartCookieItem,
} from "@/lib/cart";
import { commerce } from "@/lib/site";

type ActionResult = { ok: boolean; count: number; message?: string };

function totalCount(items: CartCookieItem[]) {
  return items.reduce((s, i) => s + i.q, 0);
}

export async function addToCart(input: {
  productId: string;
  quantity?: number;
  message?: string;
}): Promise<ActionResult> {
  const qty = Math.min(
    Math.max(Math.floor(input.quantity ?? 1), 1),
    commerce.maxQuantityPerItem,
  );

  const db = getDb();
  const [product] = await db
    .select({ id: products.id, isAvailable: products.isAvailable })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);

  if (!product || !product.isAvailable) {
    const items = await readCartCookie();
    return { ok: false, count: totalCount(items), message: "That cake isn't available right now." };
  }

  const items = await readCartCookie();
  const existing = items.find((i) => i.id === input.productId);
  if (existing) {
    existing.q = Math.min(existing.q + qty, commerce.maxQuantityPerItem);
    if (input.message !== undefined) existing.m = input.message.slice(0, 200) || undefined;
  } else {
    items.push({
      id: input.productId,
      q: qty,
      m: input.message?.slice(0, 200) || undefined,
    });
  }

  await writeCartCookie(items);
  revalidatePath("/cart");
  return { ok: true, count: totalCount(items) };
}

export async function setCartItemQuantity(
  productId: string,
  quantity: number,
): Promise<ActionResult> {
  const items = await readCartCookie();
  const next = items
    .map((i) =>
      i.id === productId
        ? {
            ...i,
            q: Math.min(Math.max(Math.floor(quantity), 0), commerce.maxQuantityPerItem),
          }
        : i,
    )
    .filter((i) => i.q > 0);
  await writeCartCookie(next);
  revalidatePath("/cart");
  return { ok: true, count: totalCount(next) };
}

export async function updateCartItemMessage(
  productId: string,
  message: string,
): Promise<ActionResult> {
  const items = await readCartCookie();
  const next = items.map((i) =>
    i.id === productId ? { ...i, m: message.slice(0, 200) || undefined } : i,
  );
  await writeCartCookie(next);
  revalidatePath("/cart");
  return { ok: true, count: totalCount(next) };
}

export async function removeCartItem(productId: string): Promise<ActionResult> {
  const items = (await readCartCookie()).filter((i) => i.id !== productId);
  await writeCartCookie(items);
  revalidatePath("/cart");
  return { ok: true, count: totalCount(items) };
}

export async function clearCart(): Promise<ActionResult> {
  await writeCartCookie([]);
  revalidatePath("/cart");
  return { ok: true, count: 0 };
}
