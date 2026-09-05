"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, kpiInputs, products } from "@/db/schema";
import {
  checkCredentials,
  endSession,
  requireAdmin,
  startSession,
} from "@/lib/auth";
import {
  categorySchema,
  kpiInputsSchema,
  loginSchema,
  productCostSchema,
  productSchema,
} from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/orders";
import type { OrderStatus } from "@/db/schema";

/* ------------------------------------------------------------------- auth */

export interface LoginState {
  error?: string;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };

  const email = await checkCredentials(parsed.data.email, parsed.data.password);
  if (!email) return { error: "Those credentials don't match." };

  await startSession(email);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await requireAdmin();
  await endSession();
  redirect("/admin/login");
}

/* --------------------------------------------------------------- products */

export interface ProductFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function bool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

export async function saveProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const id = (formData.get("id") ?? "").toString() || null;
  // The gallery arrives as one hidden input per image.
  const gallery = formData
    .getAll("gallery")
    .map((v) => v.toString().trim())
    .filter(Boolean);

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    priceLkr: formData.get("priceLkr"),
    costLkr: formData.get("costLkr") || 0,
    imageUrl: formData.get("imageUrl") ?? "",
    gallery,
    categoryId: formData.get("categoryId") ?? "",
    servesText: formData.get("servesText") ?? "",
    flavourNotes: formData.get("flavourNotes") ?? "",
    leadTimeDays: formData.get("leadTimeDays"),
    isAvailable: bool(formData.get("isAvailable")),
    isFeatured: bool(formData.get("isFeatured")),
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;
  const slug = slugify(d.slug || d.name);
  const db = getDb();

  const values = {
    name: d.name,
    slug,
    shortDescription: d.shortDescription || null,
    description: d.description || null,
    priceCents: Math.round(d.priceLkr * 100),
    costCents: Math.round(d.costLkr * 100),
    imageUrl: d.imageUrl || null,
    gallery: d.gallery ?? [],
    categoryId: d.categoryId || null,
    servesText: d.servesText || null,
    flavourNotes: d.flavourNotes || null,
    leadTimeDays: d.leadTimeDays,
    isAvailable: d.isAvailable,
    isFeatured: d.isFeatured,
    sortOrder: d.sortOrder,
    updatedAt: new Date(),
  };

  try {
    if (id) {
      await db.update(products).set(values).where(eq(products.id, id));
    } else {
      await db.insert(products).values(values);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("slug")) {
      return {
        error: "A cake with that name / slug already exists.",
        fieldErrors: { slug: ["Must be unique"] },
      };
    }
    throw err;
  }

  revalidatePath("/admin/products");
  revalidatePath("/cakes");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  if (id) {
    const db = getDb();
    await db.delete(products).where(eq(products.id, id));
    revalidatePath("/admin/products");
    revalidatePath("/cakes");
    revalidatePath("/");
  }
}

export async function toggleProductAvailability(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const next = bool(formData.get("next"));
  if (id) {
    const db = getDb();
    await db
      .update(products)
      .set({ isAvailable: next, updatedAt: new Date() })
      .where(eq(products.id, id));
    revalidatePath("/admin/products");
    revalidatePath("/cakes");
  }
}

/* --------------------------------------------------------------- orders */

const ORDER_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "in_kitchen",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
];

export async function changeOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const status = (formData.get("status") ?? "").toString() as OrderStatus;
  if (id && ORDER_STATUSES.includes(status)) {
    await updateOrderStatus(id, status);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
  }
}

/* ------------------------------------------------------------- categories */

export interface CategoryFormState {
  error?: string;
}

export async function saveCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString() || null;
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return { error: "Enter a valid category name." };

  const d = parsed.data;
  const slug = slugify(d.slug || d.name);
  const db = getDb();
  try {
    if (id) {
      await db
        .update(categories)
        .set({ name: d.name, slug, description: d.description || null, sortOrder: d.sortOrder })
        .where(eq(categories.id, id));
    } else {
      await db
        .insert(categories)
        .values({ name: d.name, slug, description: d.description || null, sortOrder: d.sortOrder });
    }
  } catch {
    return { error: "A category with that name already exists." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/cakes");
  revalidatePath("/");
  return {};
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  if (id) {
    const db = getDb();
    await db.delete(categories).where(eq(categories.id, id));
    revalidatePath("/admin/categories");
    revalidatePath("/cakes");
  }
}

/* ------------------------------------------------------------ cake costs */

export interface CostsFormState {
  error?: string;
  saved?: number;
}

/**
 * Bulk editor for the "cost to make" of every cake — the fastest way to
 * backfill cakes created before costing existed. Rows arrive as
 * `cost:<product id>` fields; blank rows are left untouched.
 */
export async function saveProductCosts(
  _prev: CostsFormState,
  formData: FormData,
): Promise<CostsFormState> {
  await requireAdmin();

  const updates: { id: string; costCents: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("cost:")) continue;
    const raw = value.toString().trim();
    if (raw === "") continue;

    const parsed = productCostSchema.safeParse({
      id: key.slice("cost:".length),
      costLkr: raw,
    });
    if (!parsed.success) {
      return { error: "One of the costs is not a valid amount." };
    }
    updates.push({
      id: parsed.data.id,
      costCents: Math.round(parsed.data.costLkr * 100),
    });
  }

  if (updates.length === 0) return { error: "Nothing to save." };

  const db = getDb();
  await db.transaction(async (tx) => {
    for (const u of updates) {
      await tx
        .update(products)
        .set({ costCents: u.costCents, updatedAt: new Date() })
        .where(eq(products.id, u.id));
    }
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/costs");
  revalidatePath("/admin/kpi");
  return { saved: updates.length };
}

/* ------------------------------------------------------------ kpi inputs */

export interface KpiInputsFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  savedPeriod?: string;
}

export async function saveKpiInputs(
  _prev: KpiInputsFormState,
  formData: FormData,
): Promise<KpiInputsFormState> {
  await requireAdmin();

  const parsed = kpiInputsSchema.safeParse({
    period: formData.get("period"),
    offlineRevenueLkr: formData.get("offlineRevenueLkr") || 0,
    marketingCostLkr: formData.get("marketingCostLkr") || 0,
    digitalInvestmentLkr: formData.get("digitalInvestmentLkr") || 0,
    gatewayFeePercent: formData.get("gatewayFeePercent") || 0,
    customerLifespanMonths: formData.get("customerLifespanMonths") || 36,
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const d = parsed.data;
  const values = {
    period: d.period,
    offlineRevenueCents: Math.round(d.offlineRevenueLkr * 100),
    marketingCostCents: Math.round(d.marketingCostLkr * 100),
    digitalInvestmentCents: Math.round(d.digitalInvestmentLkr * 100),
    gatewayFeeBps: Math.round(d.gatewayFeePercent * 100),
    customerLifespanMonths: d.customerLifespanMonths,
    notes: d.notes || null,
    updatedAt: new Date(),
  };

  const db = getDb();
  await db
    .insert(kpiInputs)
    .values(values)
    .onConflictDoUpdate({ target: kpiInputs.period, set: values });

  revalidatePath("/admin/kpi");
  revalidatePath("/admin/kpi/inputs");
  return { savedPeriod: d.period };
}
