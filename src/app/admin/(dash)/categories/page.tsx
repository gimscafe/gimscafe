import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, products } from "@/db/schema";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryAddForm } from "@/components/admin/category-add-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { deleteCategory } from "@/app/admin/actions";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const db = getDb();
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      sortOrder: categories.sortOrder,
      count: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.sortOrder, categories.name);

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        description="Group cakes by occasion. Deleting a category leaves its cakes uncategorised."
      />

      <CategoryAddForm />

      <div className="bg-card mt-5 overflow-hidden rounded-xl border">
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">
            No categories yet.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground text-xs">
                    /{c.slug} · {c.count} cake{c.count === 1 ? "" : "s"}
                  </p>
                </div>
                <ConfirmSubmit
                  id={c.id}
                  action={deleteCategory}
                  confirmText={`Delete category “${c.name}”?`}
                  toastText="Category deleted"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
