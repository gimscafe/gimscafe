"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, products } from "@/db/schema";
import {
  checkCredentials,
  endSession,
  requireAdmin,
  startSession,
} from "@/lib/auth";
import {
  categorySchema,
  loginSchema,
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
  const gallery = (formData.get("gallery") ?? "")
    .toString()
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    priceLkr: formData.get("priceLkr"),
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
