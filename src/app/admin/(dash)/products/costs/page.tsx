import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductCostsForm } from "@/components/admin/product-costs-form";
import { Button } from "@/components/ui/button";
import { listProductCosts } from "@/lib/catalog";

export const metadata = { title: "Cake costs" };

export default async function ProductCostsPage() {
  const rows = await listProductCosts();

  return (
    <div>
      <AdminPageHeader
        title="Cake costs"
        description="What each cake costs to make — ingredients, labour and packaging. Drives profit, margin and ROI."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/products">
              <ArrowLeft className="size-4" /> Back to cakes
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center text-sm">
          No cakes yet.{" "}
          <Link href="/admin/products/new" className="underline">
            Add your first
          </Link>
          .
        </p>
      ) : (
        <ProductCostsForm rows={rows} />
      )}
    </div>
  );
}
