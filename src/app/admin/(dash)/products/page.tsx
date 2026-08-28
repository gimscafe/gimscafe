import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { SmartImage } from "@/components/smart-image";
import { listProductsForAdmin } from "@/lib/catalog";
import { deleteProduct } from "@/app/admin/actions";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Cakes" };

export default async function AdminProductsPage() {
  const products = await listProductsForAdmin();

  return (
    <div>
      <AdminPageHeader
        title="Cakes"
        description={`${products.length} product${products.length === 1 ? "" : "s"} in the menu`}
        action={
          <Button asChild size="sm">
            <Link href="/admin/products/new">
              <Plus className="size-4" /> New cake
            </Link>
          </Button>
        }
      />

      <div className="bg-card overflow-x-auto rounded-xl border">
        {products.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">
            No cakes yet. <Link href="/admin/products/new" className="underline">Add your first</Link>.
          </p>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Cake</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Price</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md border">
                        <SmartImage src={p.imageUrl} alt={p.name} sizes="40px" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {p.name}
                          {p.isFeatured && (
                            <Star className="ml-1 inline size-3.5 fill-amber-400 text-amber-400" />
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {p.categoryName ?? "—"}
                  </td>
                  <td className="px-4 py-3">{formatMoney(p.priceCents)}</td>
                  <td className="px-4 py-3">
                    {p.isAvailable ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                        Available
                      </span>
                    ) : (
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/products/${p.id}`}>Edit</Link>
                      </Button>
                      <ConfirmSubmit
                        id={p.id}
                        action={deleteProduct}
                        confirmText={`Delete “${p.name}”? This removes it from the menu.`}
                        toastText="Cake deleted"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
