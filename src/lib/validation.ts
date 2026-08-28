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

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(280).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  priceLkr: z.coerce.number().positive("Price must be greater than 0").max(10_000_000),
  imageUrl: z.url("Must be a URL").optional().or(z.literal("")),
  gallery: z.array(z.url()).max(8).optional(),
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
