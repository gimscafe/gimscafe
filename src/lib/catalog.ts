import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, products, type Product } from "@/db/schema";

export const listCategories = cache(async () => {
  const db = getDb();
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const db = getDb();
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row ?? null;
});

export const listProducts = cache(
  async (opts?: {
    categorySlug?: string;
    featuredOnly?: boolean;
    includeUnavailable?: boolean;
    limit?: number;
  }) => {
    const db = getDb();
    const conditions = [];
    if (!opts?.includeUnavailable) {
      conditions.push(eq(products.isAvailable, true));
    }
    if (opts?.featuredOnly) {
      conditions.push(eq(products.isFeatured, true));
    }
    if (opts?.categorySlug) {
      const cat = await getCategoryBySlug(opts.categorySlug);
      if (!cat) return [] as Product[];
      conditions.push(eq(products.categoryId, cat.id));
    }

    return db
      .select()
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(products.sortOrder), desc(products.createdAt))
      .limit(opts?.limit ?? 200);
  },
);

export const getProductBySlug = cache(async (slug: string) => {
  const db = getDb();
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return row ?? null;
});

export const getRelatedProducts = cache(
  async (product: Product, limit = 3) => {
    const db = getDb();
    const conditions = [eq(products.isAvailable, true), ne(products.id, product.id)];
    if (product.categoryId) {
      conditions.push(eq(products.categoryId, product.categoryId));
    }
    return db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.sortOrder), desc(products.createdAt))
      .limit(limit);
  },
);

export const listProductsForAdmin = cache(async () => {
  const db = getDb();
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      priceCents: products.priceCents,
      imageUrl: products.imageUrl,
      isAvailable: products.isAvailable,
      isFeatured: products.isFeatured,
      sortOrder: products.sortOrder,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.sortOrder), desc(products.createdAt));
});
