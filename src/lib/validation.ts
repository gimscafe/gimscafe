import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const phoneRegex = /^[+\d][\d\s-]{6,20}$/;

export const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2, "Please enter your name").max(160),
    customerEmail: z.email("Enter a valid email"),
    customerPhone: z
      .string()
      .trim()
      .regex(phoneRegex, "Enter a valid phone number"),
    fulfillmentType: z.enum(["delivery", "pickup"]),
    fulfillmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    fulfillmentTime: z.string().trim().max(40).optional().or(z.literal("")),
    deliveryAddress: z.string().trim().max(400).optional().or(z.literal("")),
    deliveryCity: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.fulfillmentType === "delivery") {
      if (!val.deliveryAddress || val.deliveryAddress.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryAddress"],
          message: "Delivery address is required",
        });
      }
      if (!val.deliveryCity || val.deliveryCity.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryCity"],
          message: "City is required",
        });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * A product image is either an absolute URL the admin pasted, or a relative
 * path served by our own /api/uploads route. `z.url()` alone rejects the
 * latter, which silently broke saving an uploaded image.
 */
export const imageRef = z
  .string()
  .trim()
  .max(600)
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^\/api\/uploads\/[A-Za-z0-9._-]+$/.test(v),
    "Must be a full URL or an uploaded image",
  );

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(280).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  priceLkr: z.coerce.number().positive("Price must be greater than 0").max(10_000_000),
  costLkr: z.coerce
    .number()
    .min(0, "Cost cannot be negative")
    .max(10_000_000)
    .default(0),
  imageUrl: imageRef.optional().or(z.literal("")),
  gallery: z.array(imageRef).max(8).optional(),
  categoryId: z.uuid().optional().or(z.literal("")),
  servesText: z.string().trim().max(120).optional().or(z.literal("")),
  flavourNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  leadTimeDays: z.coerce.number().int().min(0).max(60),
  isAvailable: z.coerce.boolean(),
  isFeatured: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().min(-1000).max(1000),
});

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(140).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(-1000).max(1000),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/** One row of the bulk "cost of every cake" editor. */
export const productCostSchema = z.object({
  id: z.uuid(),
  costLkr: z.coerce.number().min(0).max(10_000_000),
});

export const kpiInputsSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Pick a month"),
  offlineRevenueLkr: z.coerce.number().min(0).max(1_000_000_000).default(0),
  marketingCostLkr: z.coerce.number().min(0).max(1_000_000_000).default(0),
  digitalInvestmentLkr: z.coerce.number().min(0).max(1_000_000_000).default(0),
  gatewayFeePercent: z.coerce
    .number()
    .min(0, "Cannot be negative")
    .max(100, "Must be a percentage")
    .default(3.3),
  customerLifespanMonths: z.coerce
    .number()
    .int()
    .min(1, "At least 1 month")
    .max(600)
    .default(36),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type KpiInputsInput = z.infer<typeof kpiInputsSchema>;

/** Payload the client visit beacon posts to /api/track. */
export const trackSchema = z.object({
  visitorId: z.uuid(),
  sessionId: z.uuid(),
  path: z.string().trim().min(1).max(300),
  referrer: z.string().trim().max(600).optional().or(z.literal("")),
});
