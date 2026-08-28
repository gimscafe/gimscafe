/**
 * Central place for storefront branding and commerce settings.
 * Anything here is safe to import from both server and client components.
 */

function intFromEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const site = {
  name: "Sugar & Bloom",
  tagline: "Cake Studio",
  fullName: "Sugar & Bloom Cake Studio",
  description:
    "Hand-crafted celebration cakes, dessert tables and everyday treats — baked to order in Colombo and delivered across the city.",
  phone: "+94 77 123 4567",
  whatsapp: "+94771234567",
  email: "hello@sugarandbloom.lk",
  address: "27 Horton Place, Colombo 07, Sri Lanka",
  instagram: "https://instagram.com",
  facebook: "https://facebook.com",
  /** Public origin; used for absolute URLs (PayHere callbacks, sitemap, OG). */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
} as const;

export const commerce = {
  currency: "LKR",
  currencySymbol: "Rs",
  /** Flat delivery fee in cents (LKR has no minor unit in practice, we store x100). */
  deliveryFeeCents: intFromEnv(process.env.DELIVERY_FEE_LKR, 600) * 100,
  /** Orders at/above this subtotal get free delivery. 0 disables the perk. */
  freeDeliveryOverCents:
    intFromEnv(process.env.FREE_DELIVERY_OVER_LKR, 15000) * 100,
  /** Minimum days between "today" and the requested fulfilment date. */
  defaultLeadTimeDays: intFromEnv(process.env.DEFAULT_LEAD_TIME_DAYS, 2),
  maxQuantityPerItem: 20,
  pickupLocation: "27 Horton Place, Colombo 07",
} as const;

export type FulfillmentType = "delivery" | "pickup";
