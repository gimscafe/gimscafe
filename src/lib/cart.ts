import "server-only";
import { cookies } from "next/headers";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { commerce } from "./site";

export const CART_COOKIE = "sb_cart";
const MAX_LINES = 30;

export interface CartCookieItem {
  id: string; // product id
  q: number; // quantity
  m?: string; // cake message
}

export interface CartLine {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPriceCents: number;
  /** cost to make, snapshotted onto the order so margins stay historical */
  unitCostCents: number;
  quantity: number;
  lineTotalCents: number;
  message?: string;
  isAvailable: boolean;
  leadTimeDays: number;
}

export interface Cart {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  hasUnavailable: boolean;
}

function parse(raw: string | undefined): CartCookieItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (x): x is CartCookieItem =>
          x && typeof x.id === "string" && typeof x.q === "number",
      )
      .map((x) => ({
        id: x.id,
        q: Math.min(Math.max(Math.floor(x.q), 1), commerce.maxQuantityPerItem),
        m: typeof x.m === "string" ? x.m.slice(0, 200) : undefined,
      }))
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export async function readCartCookie(): Promise<CartCookieItem[]> {
  const store = await cookies();
  return parse(store.get(CART_COOKIE)?.value);
}

export async function writeCartCookie(items: CartCookieItem[]): Promise<void> {
  const store = await cookies();
  const clean = items.filter((i) => i.q > 0).slice(0, MAX_LINES);
  if (clean.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  // Not httpOnly: the header badge reads this on the client. It holds only
  // product ids + quantities and is never trusted server-side (prices come
  // from the database at checkout).
  store.set(CART_COOKIE, JSON.stringify(clean), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Fast path for the header badge — no database round-trip. */
export async function getCartCount(): Promise<number> {
  const items = await readCartCookie();
  return items.reduce((sum, i) => sum + i.q, 0);
}

/** Full cart, priced from the database (source of truth). */
export async function getCart(): Promise<Cart> {
  const items = await readCartCookie();
  if (items.length === 0) {
    return { lines: [], itemCount: 0, subtotalCents: 0, hasUnavailable: false };
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(products)
    .where(inArray(products.id, items.map((i) => i.id)));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines: CartLine[] = [];
  for (const item of items) {
    const p = byId.get(item.id);
    if (!p) continue; // product deleted — silently drop
    const quantity = Math.min(item.q, commerce.maxQuantityPerItem);
    lines.push({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl,
      unitPriceCents: p.priceCents,
      unitCostCents: p.costCents,
      quantity,
      lineTotalCents: p.priceCents * quantity,
      message: item.m,
      isAvailable: p.isAvailable,
      leadTimeDays: p.leadTimeDays,
    });
  }

  const subtotalCents = lines
    .filter((l) => l.isAvailable)
    .reduce((sum, l) => sum + l.lineTotalCents, 0);

  return {
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalCents,
    hasUnavailable: lines.some((l) => !l.isAvailable),
  };
}

export function deliveryFeeFor(subtotalCents: number, type: "delivery" | "pickup"): number {
  if (type === "pickup" || subtotalCents === 0) return 0;
  if (
    commerce.freeDeliveryOverCents > 0 &&
    subtotalCents >= commerce.freeDeliveryOverCents
  ) {
    return 0;
  }
  return commerce.deliveryFeeCents;
}
